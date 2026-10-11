import { Router, Request, Response } from 'express';
import { Chess } from 'chess.js';
import { ErreurHttp } from '../erreurHttp';
import { cloturerPartie } from '../partie/cloture';
import { vuePartie } from '../partie/vue';
import { gameRepository } from '../repo/game';

export const moveRouter = Router();

interface FinDePartie {
  status: 'WHITE_WON' | 'BLACK_WON' | 'DRAW';
  endReason: 'CHECKMATE' | 'STALEMATE' | 'DRAW_RULE';
}

// Détermine si la partie est terminée après le coup qui vient d'être joué.
// Les nulles par répétition, matériel insuffisant ou règle des 50 coups sont
// volontairement regroupées sous DRAW_RULE (voir énoncé : elles peuvent être négligées).
function determinerFinDePartie(chess: Chess): FinDePartie | null {
  if (chess.isCheckmate()) {
    // Le joueur dont c'est le tour (chess.turn()) vient d'être maté.
    return { status: chess.turn() === 'w' ? 'BLACK_WON' : 'WHITE_WON', endReason: 'CHECKMATE' };
  }
  if (chess.isStalemate()) {
    return { status: 'DRAW', endReason: 'STALEMATE' };
  }
  if (chess.isDraw()) {
    return { status: 'DRAW', endReason: 'DRAW_RULE' };
  }
  return null;
}

// Récit 4 : un joueur joue un coup quand c'est son tour.
moveRouter.post('/api/games/:id/moves', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const game = gameRepository.findById(req.params.id);
  if (!game) return res.status(404).json({ error: 'Partie introuvable' });

  if (game.status !== 'IN_PROGRESS') {
    return res.status(409).json({ error: 'Cette partie est terminée' });
  }

  const estBlanc = userId === game.white_player_id;
  const estNoir = userId === game.black_player_id;
  if (!estBlanc && !estNoir) {
    return res.status(403).json({ error: "Vous ne participez pas à cette partie" });
  }

  const chess = new Chess(game.fen);
  const couleurAuTrait = chess.turn() === 'w' ? 'white' : 'black';
  const couleurDuJoueur = estBlanc ? 'white' : 'black';
  if (couleurAuTrait !== couleurDuJoueur) {
    return res.status(409).json({ error: "Ce n'est pas votre tour" });
  }

  const { from, to, promotion } = req.body ?? {};
  if (!from || !to) {
    return res.status(400).json({ error: 'Coup invalide : from/to requis' });
  }

  let coupJoue;
  try {
    coupJoue = chess.move({ from, to, promotion });
  } catch {
    coupJoue = null; // chess.js lève une exception sur un coup illégal
  }
  if (!coupJoue) {
    return res.status(400).json({ error: 'Coup illégal' });
  }

  const fin = determinerFinDePartie(chess);
  const moves: string[] = JSON.parse(game.moves);
  moves.push(coupJoue.san);

  // Récit 6 : mat ou nulle → la partie se termine et les deux Elo sont recalculés.
  if (fin) {
    try {
      const terminee = cloturerPartie(game.id, {
        status: fin.status,
        endReason: fin.endReason,
        fen: chess.fen(),
        moves,
      });
      return res.status(200).json({ ...vuePartie(terminee), turn: null });
    } catch (error) {
      if (error instanceof ErreurHttp) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      throw error;
    }
  }

  const enregistree = gameRepository.savePosition(game.id, chess.fen(), JSON.stringify(moves));
  if (!enregistree) {
    return res.status(409).json({ error: 'Cette partie est terminée' });
  }

  const miseAJour = gameRepository.findById(game.id)!;
  res.status(200).json({
    ...vuePartie(miseAJour),
    turn: chess.turn() === 'w' ? 'white' : 'black',
  });
});
