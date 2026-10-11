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

  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'secret-de-developpement-a-ne-pas-utiliser-en-production',
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(roomRouter);
  app.use(joinRouter);
  app.use(moveRouter);
  app.use(profilRouter);

  // Route de connexion factice : la vraie authentification GitHub OAuth
  // (récit 1) n'est pas implémentée dans ce projet. Elle reste donc montée
  // même en production pour que l'application déployée reste utilisable ;
  // c'est une limitation connue, clairement indiquée dans le README.
  app.use(devAuthRouter);

  return app;
}

// Démarre réellement le serveur seulement si ce fichier est exécuté directement
// (et non lorsqu'il est importé par les tests, ou par le serveur combiné
// Express + React Router dans server/app.ts, qui appelle juste createApp()).
if (typeof require !== 'undefined' && require.main === module) {
  const app = createApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
  });
}
