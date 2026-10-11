import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { userRepository } from '../repo/user';

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
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}`;
  res.redirect(redirectUri);
});

// Callback GitHub OAuth
authRouter.get('/auth/github/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (typeof code !== 'string' || !code) {
    return res.status(400).json({ error: 'Code GitHub manquant' });
  }

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
    return res.redirect('/dashboard');
  } catch {
    return res.status(502).json({ error: 'Connexion GitHub impossible' });
  }
});

// Récupérer les infos du joueur connecté (Nom + Elo)
authRouter.get('/api/me', (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Non connecté' });
  const user = userRepository.findById(req.session.userId);
  res.json(user);
});