import type { Config } from '@react-router/dev/config';

export default {
  // Rendu côté serveur activé : les pages (accueil, partie) sont pré-rendues
  // en HTML côté serveur avant d'être hydratées dans le navigateur. C'est
  // bénéfique ici car l'utilisateur connecté et l'état de la partie sont
  // connus dès la requête (session Express / base SQLite).
  ssr: true,
} satisfies Config;
