import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Chaque fichier de test reçoit son propre module src/repo/db (donc sa
    // propre base SQLite en mémoire) grâce à l'isolation par défaut de vitest.
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
    },
    server: {
      // node:sqlite est un module Node natif encore expérimental ; Vite ne le
      // reconnaît pas toujours automatiquement comme externe, on le force ici.
      deps: {
        external: [/^node:/],
      },
    },
  },
});
