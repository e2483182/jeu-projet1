import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

import { utilisateurContext } from '../context';
import { Echiquier } from '../components/Echiquier';
import type { Route } from './+types/partie';

const INTERVALLE_INTERROGATION_MS = 2000;

const LIBELLES_FIN: Record<string, string> = {
  WHITE_WON: 'Les Blancs ont gagné',
  BLACK_WON: 'Les Noirs ont gagné',
  DRAW: 'Partie nulle',
};

const LIBELLES_RAISON: Record<string, string> = {
  CHECKMATE: 'échec et mat',
  STALEMATE: 'pat',
  DRAW_RULE: 'nulle',
  RESIGNATION: 'abandon',
};

interface EtatPartie {
  gameId: string;
  status: string;
  endReason: string | null;
  code: string | null;
  fen: string;
  moves: string[];
  whitePlayerId: string | null;
  blackPlayerId: string | null;
}

export function loader({ context }: Route.LoaderArgs) {
  return { utilisateur: context.get(utilisateurContext) };
}

export default function Partie({ loaderData, params }: Route.ComponentProps) {
  const { utilisateur } = loaderData;
  const gameId = params.id;

  const [partie, setPartie] = useState<EtatPartie | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurCoup, setErreurCoup] = useState<string | null>(null);
  const intervalleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function rafraichirPartie() {
    try {
      const reponse = await fetch(`/api/games/${gameId}`);
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreur(donnees.error ?? 'Partie introuvable');
        return;
      }
      setErreur(null);
      setPartie(donnees);
    } catch {
      setErreur('Le serveur est injoignable. Réessayez dans un instant.');
    }
  }

  // Récupère l'état initial puis interroge périodiquement l'API pour voir les
  // coups joués par l'adversaire (exigence technique : pas de WebSocket).
  useEffect(() => {
    rafraichirPartie();
    intervalleRef.current = setInterval(rafraichirPartie, INTERVALLE_INTERROGATION_MS);
    return () => {
      if (intervalleRef.current) clearInterval(intervalleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function jouerCoup(from: string, to: string, promotion?: string) {
    setErreurCoup(null);
    try {
      const reponse = await fetch(`/api/games/${gameId}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, promotion }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreurCoup(donnees.error ?? 'Coup refusé');
        return;
      }
      setPartie((precedent) =>
        precedent
          ? {
              ...precedent,
              fen: donnees.fen,
              moves: donnees.moves,
              status: donnees.status,
              endReason: donnees.endReason,
            }
          : precedent,
      );
    } catch {
      setErreurCoup('Le serveur est injoignable. Réessayez dans un instant.');
    }
  }

  if (!utilisateur) {
    return (
      <main className="conteneur">
        <p className="erreur">Vous devez être connecté pour voir cette partie.</p>
      </main>
    );
  }

  if (erreur) {
    return (
      <main className="conteneur">
        <p className="erreur">{erreur}</p>
      </main>
    );
  }

  if (!partie) {
    return (
      <main className="conteneur">
        <p>Chargement de la partie…</p>
      </main>
    );
  }

  const couleurJoueur: 'w' | 'b' | null =
    utilisateur.id === partie.whitePlayerId ? 'w' : utilisateur.id === partie.blackPlayerId ? 'b' : null;

  const enAttenteAdversaire = !partie.whitePlayerId || !partie.blackPlayerId;
  const partieTerminee = partie.status !== 'IN_PROGRESS' && partie.status !== 'WAITING';
  const trait = new Chess(partie.fen).turn();
  const autoriseJouer = !enAttenteAdversaire && !partieTerminee && couleurJoueur === trait;

  return (
    <main className="conteneur">
      <h1>Partie</h1>

      {enAttenteAdversaire && (
        <div className="carte">
          <p>En attente d'un adversaire…</p>
          {partie.code && (
            <p>
              Partagez ce code : <span className="code-partie">{partie.code}</span>
            </p>
          )}
        </div>
      )}

      {partieTerminee && (
        <div className="carte">
          <h2>{LIBELLES_FIN[partie.status] ?? partie.status}</h2>
          {partie.endReason && <p>Raison : {LIBELLES_RAISON[partie.endReason] ?? partie.endReason}</p>}
        </div>
      )}

      {!enAttenteAdversaire && !partieTerminee && (
        <p>{autoriseJouer ? "C'est votre tour." : "En attente du coup de l'adversaire…"}</p>
      )}

      <Echiquier
        fen={partie.fen}
        couleurJoueur={couleurJoueur}
        autoriseJouer={autoriseJouer}
        onJouerCoup={jouerCoup}
      />

      {erreurCoup && <p className="erreur">{erreurCoup}</p>}

      <p>Coups joués : {partie.moves.length === 0 ? 'aucun' : partie.moves.join(' ')}</p>
    </main>
  );
}
