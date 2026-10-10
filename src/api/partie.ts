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