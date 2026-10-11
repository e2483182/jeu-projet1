import { createRequestHandler, type GetLoadContextFunction } from '@react-router/express';
import { RouterContextProvider } from 'react-router';

import { createApp } from '../src/serveur';
import { userRepository } from '../src/repo/user';
import { utilisateurContext } from '../app/context';

declare module 'react-router' {
  interface AppLoadContext {
    // Rempli ci-dessous à partir de la session Express ; voir app/context.ts.
    [utilisateurContext.id]: unknown;
  }
}

// Construit le contexte transmis aux loaders/actions de React Router à
// partir de la session Express déjà en place (même session que l'API REST).
const getLoadContext: GetLoadContextFunction = (req) => {
  const context = new RouterContextProvider();
  const userId = req.session?.userId;
  const utilisateur = userId ? userRepository.findById(userId) : undefined;
  context.set(
    utilisateurContext,
    utilisateur ? { id: utilisateur.id, username: utilisateur.username, elo: utilisateur.elo } : null,
  );
  return context;
};

// L'app Express (API + session) est la même qu'en tests d'intégration ;
// on y ajoute seulement le gestionnaire React Router pour le rendu des pages.
export const app = createApp();

app.use(
  createRequestHandler({
    // Fourni par le plugin Vite de React Router au moment du build/dev.
    build: () => import('virtual:react-router/server-build'),
    getLoadContext,
  }),
);
