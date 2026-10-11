import { Router, Request, Response } from 'express';
import { gameRepository } from '../repo/game';

export const joinRouter = Router();

// Récit 3 : un joueur entre un code et rejoint la partie correspondante.
// Les couleurs sont tirées au sort au moment où l'adversaire rejoint.
joinRouter.post('/api/rooms/join', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const { code } = req.body ?? {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code manquant' });
  }

  const game = gameRepository.findByCode(code);
  if (!game) {
    return res.status(404).json({ error: 'Code inconnu' });
  }
  if (game.code_used) {
    return res.status(409).json({ error: 'Ce code a déjà été utilisé' });
  }
  if (game.host_id === userId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas rejoindre votre propre partie' });
  }

  // Tirage au sort des couleurs entre l'hôte et le joueur qui rejoint.
  const hoteEstBlanc = Math.random() < 0.5;
  const whitePlayerId = hoteEstBlanc ? game.host_id : userId;
  const blackPlayerId = hoteEstBlanc ? userId : game.host_id;

  gameRepository.joinGame(game.id, whitePlayerId, blackPlayerId);

  const couleurDuJoueur = userId === whitePlayerId ? 'white' : 'black';

  res.status(200).json({
    gameId: game.id,
    color: couleurDuJoueur,
    fen: game.fen
  });
});
