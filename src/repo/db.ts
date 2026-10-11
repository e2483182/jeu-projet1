import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/chess.db');
export const db = new DatabaseSync(dbPath);

// Initialisation du schéma
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    elo INTEGER NOT NULL DEFAULT 1000
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    host_id TEXT NOT NULL, -- créateur de la partie ; sa couleur n'est connue qu'à la jointure
    white_player_id TEXT,
    black_player_id TEXT,
    fen TEXT NOT NULL,
    moves TEXT NOT NULL DEFAULT '[]', -- Tableau JSON de coups Notation Algébrique
    status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'IN_PROGRESS', 'WHITE_WON', 'BLACK_WON', 'DRAW'
    end_reason TEXT, -- 'CHECKMATE', 'STALEMATE', 'RESIGNATION', 'DRAW_RULE'
    code_used INTEGER NOT NULL DEFAULT 0,
    white_elo_before INTEGER,
    black_elo_before INTEGER,
    white_elo_after INTEGER,
    black_elo_after INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(host_id) REFERENCES users(id),
    FOREIGN KEY(white_player_id) REFERENCES users(id),
    FOREIGN KEY(black_player_id) REFERENCES users(id)
  );
`);

// Bases déjà créées avant le récit 6 : les colonnes de classement sont ajoutées
// sans recréer la table (CREATE TABLE IF NOT EXISTS ne les ajouterait pas).
for (const colonne of ['white_elo_before', 'black_elo_before', 'white_elo_after', 'black_elo_after']) {
  const existantes = db.prepare('PRAGMA table_info(games)').all() as { name: string }[];
  if (!existantes.some((c) => c.name === colonne)) {
    db.exec(`ALTER TABLE games ADD COLUMN ${colonne} INTEGER`);
  }
}

export function withTransaction<T>(action: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultat = action();
    db.exec('COMMIT');
    return resultat;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}