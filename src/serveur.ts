import express from 'express';
import session from 'express-session';
import { authRouter } from './api/home';
import { roomRouter } from './api/partie';
import { joinRouter } from './api/join';
import { moveRouter } from './api/joue';
import { abandonRouter } from './api/abandon';
import { historiqueRouter } from './api/historique';
import { devAuthRouter } from './api/devAuth';

// Construit l'application Express sans la démarrer, pour pouvoir la réutiliser
// telle quelle dans les tests d'intégration (voir tests/integration).
export function createApp() {
  const app = express();
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET doit être défini dans l’environnement');
  }

  app.use(express.json());
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'jeu_session',
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(authRouter);
  app.use(roomRouter);
  app.use(joinRouter);
  app.use(moveRouter);
  app.use(abandonRouter);
  app.use(historiqueRouter);

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
