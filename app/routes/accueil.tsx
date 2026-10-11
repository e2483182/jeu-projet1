import { useState } from 'react';
import { useNavigate } from 'react-router';

import { utilisateurContext } from '../context';
import type { Route } from './+types/accueil';

export function loader({ context }: Route.LoaderArgs) {
  return {
    utilisateur: context.get(utilisateurContext),
    connexionDisponible: process.env.NODE_ENV !== 'production',
  };
}

export default function Accueil({ loaderData }: Route.ComponentProps) {
  const [utilisateur, setUtilisateur] = useState(loaderData.utilisateur);
  const navigate = useNavigate();

  const [pseudo, setPseudo] = useState('');
  const [erreurConnexion, setErreurConnexion] = useState<string | null>(null);

  const [erreurCreation, setErreurCreation] = useState<string | null>(null);

  const [codeSaisi, setCodeSaisi] = useState('');
  const [erreurJonction, setErreurJonction] = useState<string | null>(null);

  async function seConnecter(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreurConnexion(null);
    try {
      const reponse = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pseudo }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreurConnexion(donnees.error ?? 'Connexion impossible');
        return;
      }
      setUtilisateur({ id: donnees.id, username: donnees.username, elo: donnees.elo });
    } catch {
      setErreurConnexion('Le serveur est injoignable. Réessayez dans un instant.');
    }
  }

  async function creerPartie() {
    setErreurCreation(null);
    try {
      const reponse = await fetch('/api/rooms/create', { method: 'POST' });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreurCreation(donnees.error ?? 'Création impossible');
        return;
      }
      navigate(`/partie/${donnees.gameId}`);
    } catch {
      setErreurCreation('Le serveur est injoignable. Réessayez dans un instant.');
    }
  }

  async function rejoindrePartie(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreurJonction(null);
    try {
      const reponse = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeSaisi.trim() }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreurJonction(donnees.error ?? 'Impossible de rejoindre la partie');
        return;
      }
      navigate(`/partie/${donnees.gameId}`);
    } catch {
      setErreurJonction('Le serveur est injoignable. Réessayez dans un instant.');
    }
  }

  if (!utilisateur) {
    return (
      <main className="conteneur">
        <h1>Échecs en ligne</h1>
        <div className="carte">
          <h2>Connexion</h2>
          {loaderData.connexionDisponible ? (
            <>
              <p>Mode développement : entrez un nom pour vous identifier.</p>
              <form className="ligne" onSubmit={seConnecter}>
                <input
                  type="text"
                  placeholder="Votre nom"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  required
                />
                <button type="submit">Se connecter</button>
              </form>
            </>
          ) : (
            <p>
              La connexion GitHub n'est pas encore configurée. Elle est
              nécessaire pour jouer en production.
            </p>
          )}
          {erreurConnexion && <p className="erreur">{erreurConnexion}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="conteneur">
      <h1>Échecs en ligne</h1>
      <p>
        Connecté en tant que <strong>{utilisateur.username}</strong> — Elo : {utilisateur.elo}
      </p>

      <div className="carte">
        <h2>Créer une partie privée</h2>
        <p>Créez une partie et donnez le code reçu à l'adversaire de votre choix.</p>
        <button onClick={creerPartie}>Créer une partie</button>
        {erreurCreation && <p className="erreur">{erreurCreation}</p>}
      </div>

      <div className="carte">
        <h2>Rejoindre une partie</h2>
        <form className="ligne" onSubmit={rejoindrePartie}>
          <input
            type="text"
            placeholder="Code reçu"
            value={codeSaisi}
            onChange={(e) => setCodeSaisi(e.target.value)}
            required
          />
          <button type="submit">Rejoindre</button>
        </form>
        {erreurJonction && <p className="erreur">{erreurJonction}</p>}
      </div>
    </main>
  );
}
