import express from 'express';
import session from 'express-session';
import { authRouter } from './api/home';
import { roomRouter } from './api/partie';
import { joinRouter } from './api/join';
import { moveRouter } from './api/joue';
import { profilRouter } from './api/profil';
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

  app.use(profilRouter);
  app.use(authRouter);
  app.use(roomRouter);
  app.use(joinRouter);
  app.use(moveRouter);
  app.use(abandonRouter);
  app.use(historiqueRouter);

  // La connexion factice est uniquement disponible en développement et dans
  // les tests. Elle ne doit pas permettre d'usurper un compte en production.
  if (process.env.NODE_ENV !== 'production') {
    app.use(devAuthRouter);
  }

  return app;
}
