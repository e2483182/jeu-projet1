import { Router, Request, Response } from 'express';
import { ErreurHttp } from '../erreurHttp';
import { cloturerPartie } from '../partie/cloture';
import { vuePartie } from '../partie/vue';
import { gameRepository } from '../repository/game';

export const abandonRouter = Router();

// Récit 5 : abandonner la partie en cours. Celui qui abandonne perd,
// son adversaire gagne, et les deux classements sont mis à jour (récit 6).
abandonRouter.post('/api/games/:id/resign', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const game = gameRepository.findById(req.params.id);
  if (!game) return res.status(404).json({ error: 'Partie introuvable' });

  if (game.status === 'WAITING') {
    if (game.host_id !== userId) {
      return res.status(403).json({ error: "Vous ne participez pas à cette partie" });
    }
    return res.status(409).json({ error: "Cette partie n'est pas en cours" });
  }
  if (game.status !== 'IN_PROGRESS') {
    return res.status(409).json({ error: 'Cette partie est terminée' });
  }

  const estBlanc = userId === game.white_player_id;
  const estNoir = userId === game.black_player_id;
  if (!estBlanc && !estNoir) {
    return res.status(403).json({ error: "Vous ne participez pas à cette partie" });
  }

  try {
    const terminee = cloturerPartie(game.id, {
      status: estBlanc ? 'BLACK_WON' : 'WHITE_WON',
      endReason: 'RESIGNATION',
      fen: game.fen,
      moves: JSON.parse(game.moves) as string[],
    });
    return res.status(200).json(vuePartie(terminee));
  } catch (error) {
    if (error instanceof ErreurHttp) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    throw error;
  }
});
