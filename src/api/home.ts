import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { userRepository } from '../repository/user';

export const authRouter = Router();

interface GithubUser {
  id: string;
  login: string;
}

async function fetchGithubProfile(code: string): Promise<GithubUser> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

  if (!clientId || !clientSecret) throw new Error('Configuration GitHub incomplète');

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
  });
  if (!tokenResponse.ok) throw new Error('Échec de l’échange du code GitHub');

  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error('Token GitHub absent');

  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'jeu-projet1'
    }
  });
  if (!profileResponse.ok) throw new Error('Échec de récupération du profil GitHub');

  const profile = await profileResponse.json() as { id?: number; login?: string };
  if (profile.id === undefined || !profile.login) throw new Error('Profil GitHub invalide');

  return { id: String(profile.id), login: profile.login };
}

// Redirection vers GitHub
authRouter.get('/auth/github', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;
  if (!clientId || !callbackUrl) {
    return res.status(500).json({ error: 'Configuration GitHub incomplète' });
  }

  const state = crypto.randomBytes(32).toString('hex');
  req.session!.oauthState = state;

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', callbackUrl);
  githubUrl.searchParams.set('state', state);
  return res.redirect(githubUrl.href);
});

// Callback GitHub OAuth
authRouter.get('/auth/github/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (typeof code !== 'string' || !code || typeof state !== 'string' || state !== req.session?.oauthState) {
    delete req.session?.oauthState;
    return res.status(400).json({ error: 'Retour OAuth invalide' });
  }
  delete req.session?.oauthState;

  try {
    const githubUser = await fetchGithubProfile(code);
    let user = userRepository.findByGithubId(githubUser.id);
    if (!user) {
      user = userRepository.create({
        id: crypto.randomUUID(),
        githubId: githubUser.id,
        username: githubUser.login,
        elo: 1000
      });
    }

    req.session!.userId = user.id;
    return res.redirect('/');
  } catch {
    return res.status(502).json({ error: 'Connexion GitHub impossible' });
  }
});
