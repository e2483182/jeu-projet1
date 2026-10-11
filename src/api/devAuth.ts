import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { userRepository } from '../repo/user';

// Cette route simule une connexion réussie sans passer par GitHub.
// Elle n'est montée que lorsque NODE_ENV === 'test' (voir src/serveur.ts) et
// sert uniquement aux tests d'intégration de l'API.
export const devAuthRouter = Router();

devAuthRouter.post('/api/dev/login', (req: Request, res: Response) => {
  const { username } = req.body as { username?: string };
  if (!username) return res.status(400).json({ error: 'username requis' });

  let user = userRepository.findByGithubId(username);
  if (!user) {
    user = userRepository.create({ id: crypto.randomUUID(), githubId: username, username, elo: 1000 });
  }

  req.session!.userId = user.id;
  res.status(200).json(user);
});
