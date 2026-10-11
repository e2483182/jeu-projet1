import { db } from './db';

export interface GameRow {
  id: string;
  code: string;
  host_id: string;
  white_player_id: string | null;
  black_player_id: string | null;
  fen: string;
  moves: string; // JSON string Array
  status: string;
  end_reason: string | null;
  code_used: number;
  white_elo_before: number | null;
  black_elo_before: number | null;
  white_elo_after: number | null;
  black_elo_after: number | null;
  created_at: string;
}

export const gameRepository = {
  create(game: { id: string; code: string; hostId: string; initialFen: string }): GameRow {
    // Les couleurs ne sont pas encore connues : elles sont tirées au sort
    // quand l'adversaire rejoint (voir joinGame ci-dessous).
    const stmt = db.prepare(`
      INSERT INTO games (id, code, host_id, fen, moves, status, code_used)
      VALUES (?, ?, ?, ?, '[]', 'WAITING', 0)
    `);
    stmt.run(game.id, game.code, game.hostId, game.initialFen);
    return this.findById(game.id)!;
  },

  findByCode(code: string): GameRow | undefined {
    const stmt = db.prepare('SELECT * FROM games WHERE code = ?');
    return stmt.get(code) as GameRow | undefined;
  },

  findById(id: string): GameRow | undefined {
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
    return stmt.get(id) as GameRow | undefined;
  },

  joinGame(
    gameId: string,
    whitePlayerId: string,
    blackPlayerId: string,
    whiteElo: number,
    blackElo: number
  ): boolean {
    const stmt = db.prepare(`
      UPDATE games
      SET white_player_id = ?, black_player_id = ?,
          white_elo_before = ?, black_elo_before = ?,
          status = 'IN_PROGRESS', code_used = 1
      WHERE id = ? AND code_used = 0
    `);
    const resultat = stmt.run(whitePlayerId, blackPlayerId, whiteElo, blackElo, gameId);
    return Number(resultat.changes) > 0;
  },

  savePosition(gameId: string, fen: string, movesJson: string): boolean {
    const stmt = db.prepare(`
      UPDATE games
      SET fen = ?, moves = ?
      WHERE id = ? AND status = 'IN_PROGRESS'
    `);
    const resultat = stmt.run(fen, movesJson, gameId);
    return Number(resultat.changes) > 0;
  },

  finish(fin: {
    gameId: string;
    fen: string;
    movesJson: string;
    status: string;
    endReason: string;
    whiteEloBefore: number;
    blackEloBefore: number;
    whiteEloAfter: number;
    blackEloAfter: number;
  }): GameRow | undefined {
    const stmt = db.prepare(`
      UPDATE games
      SET fen = ?, moves = ?, status = ?, end_reason = ?,
          white_elo_before = ?, black_elo_before = ?,
          white_elo_after = ?, black_elo_after = ?
      WHERE id = ? AND status = 'IN_PROGRESS'
    `);
    const resultat = stmt.run(
      fin.fen,
      fin.movesJson,
      fin.status,
      fin.endReason,
      fin.whiteEloBefore,
      fin.blackEloBefore,
      fin.whiteEloAfter,
      fin.blackEloAfter,
      fin.gameId
    );
    if (Number(resultat.changes) === 0) return undefined;
    return this.findById(fin.gameId);
  },

  findFinishedByUserId(userId: string): GameRow[] {
    const stmt = db.prepare(`
      SELECT * FROM games
      WHERE (white_player_id = ? OR black_player_id = ?)
        AND status IN ('WHITE_WON', 'BLACK_WON', 'DRAW')
      ORDER BY created_at DESC, rowid DESC
    `);
    return stmt.all(userId, userId) as unknown as GameRow[];
  }
};