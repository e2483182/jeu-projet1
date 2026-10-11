import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// On utilise process.cwd() plutôt que __dirname : ce fichier est aussi empaqueté
// en ESM par Vite pour le rendu côté serveur, où __dirname n'existe pas.
// Les scripts npm et le conteneur Docker démarrent toujours depuis la racine du projet.
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/chess.db');

// Le dossier (ex: le point de montage du volume Docker) doit exister avant d'ouvrir le fichier.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(host_id) REFERENCES users(id),
    FOREIGN KEY(white_player_id) REFERENCES users(id),
    FOREIGN KEY(black_player_id) REFERENCES users(id)
  );
`);