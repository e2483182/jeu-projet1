import express from 'express';
import session from 'express-session';
import { authRouter } from './api/home';
import { roomRouter } from './api/partie';
import { joinRouter } from './api/join';
import { moveRouter } from './api/joue';
import { devAuthRouter } from './api/devAuth';

// Construit l'application Express sans la démarrer, pour pouvoir la réutiliser
// telle quelle dans les tests d'intégration (voir tests/integration).
export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'secret-de-developpement-a-ne-pas-utiliser-en-production',
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(authRouter);
  app.use(roomRouter);
  app.use(joinRouter);
  app.use(moveRouter);

  // Route de connexion factice réservée aux tests, jamais montée ailleurs.
  if (process.env.NODE_ENV === 'test') {
    app.use(devAuthRouter);
  }

  return app;
}

// Démarre réellement le serveur seulement si ce fichier est exécuté directement
// (et non lorsqu'il est importé par les tests).
if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
  });
}
