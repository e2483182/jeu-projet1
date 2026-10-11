import express from 'express';
import session from 'express-session';
import { roomRouter } from './api/partie';
import { joinRouter } from './api/join';
import { moveRouter } from './api/joue';
import { profilRouter } from './api/profil';
import { devAuthRouter } from './api/devAuth';

// Construit l'application Express sans la démarrer, pour pouvoir la réutiliser
// telle quelle dans les tests d'intégration (voir tests/integration).
export function createApp() {
  const app = express();
  const sessionSecret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !sessionSecret) {
    throw new Error('SESSION_SECRET doit être défini en production');
  }

  app.use(express.json());
  app.use(
    session({
      secret: sessionSecret || 'secret-de-developpement-a-ne-pas-utiliser-en-production',
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(roomRouter);
  app.use(joinRouter);
  app.use(moveRouter);
  app.use(profilRouter);

  // La connexion factice est uniquement disponible en développement et dans
  // les tests. Elle ne doit pas permettre d'usurper un compte en production.
  if (process.env.NODE_ENV !== 'production') {
    app.use(devAuthRouter);
    }

    return app;
}
