import { Router, Request, Response } from 'express';
import { gameRepository } from '../repo/game';
import { resultatPour, vuePartie } from '../partie/vue';

export const historiqueRouter = Router();

// Récit 6 : les parties terminées (mat, nulle, abandon) du joueur connecté.
historiqueRouter.get('/api/me/history', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non connecté' });

  const parties = gameRepository.findFinishedByUserId(userId).map((game) => ({
    ...vuePartie(game),
    resultat: resultatPour(userId, game),
    createdAt: game.created_at,
  }));

  res.json(parties);
});
