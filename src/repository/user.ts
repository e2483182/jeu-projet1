import { db } from './db';

export interface UserRow {
  id: string;
  github_id: string;
  username: string;
  elo: number;
}

export const userRepository = {
  findByGithubId(githubId: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
    return stmt.get(githubId) as UserRow | undefined;
  },

  findById(id: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as UserRow | undefined;
  },

  create(user: { id: string; githubId: string; username: string; elo?: number }): UserRow {
    const elo = user.elo ?? 1000;
    const stmt = db.prepare('INSERT INTO users (id, github_id, username, elo) VALUES (?, ?, ?, ?)');
    stmt.run(user.id, user.githubId, user.username, elo);
    return { id: user.id, github_id: user.githubId, username: user.username, elo };
  },

  updateElo(id: string, newElo: number): void {
    const stmt = db.prepare('UPDATE users SET elo = ? WHERE id = ?');
    stmt.run(newElo, id);
  }
};