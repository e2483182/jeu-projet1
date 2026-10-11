// Point d'entrée du serveur, en ESM (extension .mjs) : permet d'utiliser
// import() dynamique pour charger le build React Router sans transformer
// tout le backend (src/, CommonJS) en module ESM. Voir package.json.
import express from 'express';

const port = process.env.PORT || 3000;
const app = express();

if (process.env.NODE_ENV === 'production') {
  // En production, le dossier build/client est servi statiquement, et
  // build/server/index.js (généré par `react-router build`) exporte `app`,
  // l'application Express combinée (API + pages SSR), voir server/app.ts.
  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
  );
  app.use(express.static('build/client', { maxAge: '1h' }));
  app.use(await import('./build/server/index.js').then((mod) => mod.app));
} else {
  // En développement, Vite sert les modules à la volée et recharge à chaud.
  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({ server: { middlewareMode: true } }),
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule('./server/app.ts');
      return source.app(req, res, next);
    } catch (erreur) {
      if (erreur instanceof Error) viteDevServer.ssrFixStacktrace(erreur);
      next(erreur);
    }
  });
}

app.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));
