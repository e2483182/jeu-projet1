import { db } from './db';

export interface GameRow {
  id: string;
  code: string;
  white_player_id: string | null;
  black_player_id: string | null;
  fen: string;
  moves: string; // JSON string Array
  status: string;
  end_reason: string | null;
  code_used: number;
  created_at: string;
}

export const gameRepository = {
  create(game: { id: string; code: string; hostId: string; initialFen: string }): GameRow {
    const stmt = db.prepare(`
      INSERT INTO games (id, code, white_player_id, fen, moves, status, code_used)
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

  joinGame(gameId: string, guestId: string, whitePlayerId: string, blackPlayerId: string): void {
    const stmt = db.prepare(`
      UPDATE games 
      SET white_player_id = ?, black_player_id = ?, status = 'IN_PROGRESS', code_used = 1 
      WHERE id = ?
    `);
    stmt.run(whitePlayerId, blackPlayerId, gameId);
  },

  updateGameState(gameId: string, fen: string, movesJson: string, status: string, endReason: string | null): void {
    const stmt = db.prepare(`
      UPDATE games 
      SET fen = ?, moves = ?, status = ?, end_reason = ? 
      WHERE id = ?
    `);
    stmt.run(fen, movesJson, status, endReason, gameId);
  },

  findHistoryByUserId(userId: string): GameRow[] {
    const stmt = db.prepare(`
      SELECT * FROM games 
      WHERE (white_player_id = ? OR black_player_id = ?) AND status != 'WAITING'
      ORDER BY created_at DESC
    `);
    return stmt.all(userId, userId) as GameRow[];
  }
};