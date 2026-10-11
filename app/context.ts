import { createContext } from 'react-router';

export interface UtilisateurConnecte {
  id: string;
  username: string;
  elo: number;
}

// Rempli par server/app.ts à partir de la session Express (req.session.userId),
// voir getLoadContext(). Permet à chaque loader de connaître l'utilisateur
// connecté sans faire d'appel HTTP supplémentaire vers /api/me.
export const utilisateurContext = createContext<UtilisateurConnecte | null>(null);
