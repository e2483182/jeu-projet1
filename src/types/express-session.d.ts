import 'express-session';

// Ajoute le champ userId à la session Express, rempli lors de la connexion
// (voir src/api/home.ts pour la connexion GitHub réelle).
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    oauthState?: string;
  }
}
