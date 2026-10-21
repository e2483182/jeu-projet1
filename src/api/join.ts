import { Router, Request, Response } from 'express';
import { gameRepository } from '../repository/game';
import { userRepository } from '../repository/user';

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

  const hote = userRepository.findById(game.host_id);
  const invite = userRepository.findById(userId);
  if (!hote || !invite) return res.status(500).json({ error: 'Joueurs introuvables' });

  // Tirage au sort des couleurs entre l'hôte et le joueur qui rejoint.
  // Les Elo sont figés ici : le calcul de fin de partie s'appuie sur ces valeurs.
  const hoteEstBlanc = Math.random() < 0.5;
  const whitePlayerId = hoteEstBlanc ? game.host_id : userId;
  const blackPlayerId = hoteEstBlanc ? userId : game.host_id;
  const whiteElo = hoteEstBlanc ? hote.elo : invite.elo;
  const blackElo = hoteEstBlanc ? invite.elo : hote.elo;

  const rejoint = gameRepository.joinGame(game.id, whitePlayerId, blackPlayerId, whiteElo, blackElo);
  if (!rejoint) {
    return res.status(409).json({ error: 'Ce code a déjà été utilisé' });
  }

  const couleurDuJoueur = userId === whitePlayerId ? 'white' : 'black';

  res.status(200).json({
    gameId: game.id,
    color: couleurDuJoueur,
    fen: game.fen
  });
});
