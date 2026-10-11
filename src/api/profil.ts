import { Router, Request, Response } from 'express';
import { userRepository } from '../repo/user';

export const profilRouter = Router();

// Utilisée par le frontend pour savoir qui est connecté (nom, Elo) sans
// dupliquer cette logique dans chaque page.
profilRouter.get('/api/me', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const user = userRepository.findById(userId);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  res.json({ id: user.id, username: user.username, elo: user.elo });
});
