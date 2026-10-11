import { GameRow } from '../repo/game';
import { userRepository } from '../repo/user';

export type ResultatJoueur = 'victoire' | 'defaite' | 'nulle';

export function resultatPour(userId: string, game: GameRow): ResultatJoueur {
  if (game.status === 'DRAW') return 'nulle';
  const gagnantId = game.status === 'WHITE_WON' ? game.white_player_id : game.black_player_id;
  return gagnantId === userId ? 'victoire' : 'defaite';
}

function cote(userId: string | null, avant: number | null, apres: number | null) {
  const user = userId ? userRepository.findById(userId) : undefined;
  return {
    id: userId,
    username: user?.username ?? null,
    before: avant,
    after: apres,
  };
}

// Vue renvoyée au client (coup, abandon, interrogation périodique, historique).
// `after` reste null tant que la partie n'est pas terminée.
export function vuePartie(game: GameRow) {
  return {
    gameId: game.id,
    status: game.status,
    endReason: game.end_reason,
    fen: game.fen,
    moves: JSON.parse(game.moves) as string[],
    whitePlayerId: game.white_player_id,
    blackPlayerId: game.black_player_id,
    ratings: {
      white: cote(game.white_player_id, game.white_elo_before, game.white_elo_after),
      black: cote(game.black_player_id, game.black_elo_before, game.black_elo_after),
    },
  };
}
