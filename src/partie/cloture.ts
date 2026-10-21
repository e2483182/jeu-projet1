import { ErreurHttp } from '../erreurHttp';
import { mettreAJourClassements, Vainqueur } from '../elo';
import { gameRepository } from '../repository/game';
import { userRepository } from '../repository/user';
import { withTransaction } from '../repository/db';

export type StatutFinal = 'WHITE_WON' | 'BLACK_WON' | 'DRAW';
export type RaisonFin = 'CHECKMATE' | 'STALEMATE' | 'RESIGNATION' | 'DRAW_RULE';

function vainqueurDepuisStatut(status: StatutFinal): Vainqueur {
  if (status === 'WHITE_WON') return 'white';
  if (status === 'BLACK_WON') return 'black';
  return 'draw';
}

// Récits 5 et 6 : termine la partie (mat, nulle ou abandon) et met à jour
// les deux classements Elo à partir des valeurs figées au début de la partie.
export function cloturerPartie(
  gameId: string,
  fin: { status: StatutFinal; endReason: RaisonFin; fen: string; moves: string[] }
) {
  return withTransaction(() => {
    const game = gameRepository.findById(gameId);
    if (!game || game.status !== 'IN_PROGRESS' || !game.white_player_id || !game.black_player_id) {
      throw new ErreurHttp(409, 'Cette partie est terminée');
    }

    const white = userRepository.findById(game.white_player_id);
    const black = userRepository.findById(game.black_player_id);
    if (!white || !black) {
      throw new ErreurHttp(500, 'Joueurs introuvables');
    }

    const whiteBefore = game.white_elo_before ?? white.elo;
    const blackBefore = game.black_elo_before ?? black.elo;
    const ratings = mettreAJourClassements(whiteBefore, blackBefore, vainqueurDepuisStatut(fin.status));

    const terminee = gameRepository.finish({
      gameId,
      fen: fin.fen,
      movesJson: JSON.stringify(fin.moves),
      status: fin.status,
      endReason: fin.endReason,
      whiteEloBefore: whiteBefore,
      blackEloBefore: blackBefore,
      whiteEloAfter: ratings.white,
      blackEloAfter: ratings.black,
    });
    if (!terminee) {
      throw new ErreurHttp(409, 'Cette partie est terminée');
    }

    userRepository.updateElo(white.id, ratings.white);
    userRepository.updateElo(black.id, ratings.black);
    return terminee;
  });
}
