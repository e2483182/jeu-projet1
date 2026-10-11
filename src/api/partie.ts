import { Router, Request, Response } from 'express';
import { gameRepository } from '../repo/game';
import { Chess } from 'chess.js';
import crypto from 'node:crypto';

export const roomRouter = Router();

roomRouter.post('/api/rooms/create', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  // Génération d'un code unique à 6 caractères
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  const initialFen = new Chess().fen();

  const game = gameRepository.create({
    id: crypto.randomUUID(),
    code,
    hostId: userId,
    initialFen
  });

  res.status(201).json({ gameId: game.id, code: game.code });
});

// Consultée périodiquement par le client (interrogation périodique, pas de WebSocket)
// pour afficher les coups de l'adversaire et détecter la fin de partie.
roomRouter.get('/api/games/:id', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const game = gameRepository.findById(req.params.id);
  if (!game) return res.status(404).json({ error: 'Partie introuvable' });

  const estParticipant =
    userId === game.white_player_id ||
    userId === game.black_player_id ||
    (game.status === 'WAITING' && userId === game.host_id);
  if (!estParticipant) return res.status(403).json({ error: "Vous ne participez pas à cette partie" });

  res.json({
    gameId: game.id,
    status: game.status,
    endReason: game.end_reason,
    code: game.status === 'WAITING' && userId === game.host_id ? game.code : null,
    fen: game.fen,
    moves: JSON.parse(game.moves),
    whitePlayerId: game.white_player_id,
    blackPlayerId: game.black_player_id
  });
});