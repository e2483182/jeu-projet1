import { Router, Request, Response } from 'express';
import { userRepository } from '../repo/user';

export const authRouter = Router();

// Redirection vers GitHub
authRouter.get('/auth/github', (req: Request, res: Response) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}`;
  res.redirect(redirectUri);
});

// Callback GitHub OAuth
authRouter.get('/auth/github/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  
  // Échange du code contre le profil GitHub (pseudocode de l'appel API GitHub)
  const githubUser = await fetchGithubProfile(code as string); 

  let user = userRepository.findByGithubId(githubUser.id);
  if (!user) {
    // Inscription avec Elo = 1000 par défaut
    user = userRepository.create({
      id: crypto.randomUUID(),
      githubId: githubUser.id,
      username: githubUser.login,
      elo: 1000
    });
  }

  req.session!.userId = user.id;
  res.redirect('/dashboard');
});

// Récupérer les infos du joueur connecté (Nom + Elo)
authRouter.get('/api/me', (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Non connecté' });
  const user = userRepository.findById(req.session.userId);
  res.json(user);
});