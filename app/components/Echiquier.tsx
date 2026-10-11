import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';

// Symboles Unicode des pièces d'échecs.
const SYMBOLES: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

interface EchiquierProps {
  fen: string;
  /** Couleur du joueur devant son propre écran ; null si spectateur. */
  couleurJoueur: 'w' | 'b' | null;
  /** True seulement si c'est le tour du joueur et que la partie n'est pas terminée. */
  autoriseJouer: boolean;
  onJouerCoup: (from: string, to: string, promotion?: string) => void;
}

/**
 * Échiquier "maison" (pas de bibliothèque de plateau) : chess.js n'est utilisé
 * ici que côté client pour lire la position (FEN) et calculer les coups
 * légaux à surligner. Le serveur reste seul juge de la légalité d'un coup
 * (voir src/api/joue.ts) ; ce composant ne fait qu'aider visuellement.
 */
export function Echiquier({ fen, couleurJoueur, autoriseJouer, onJouerCoup }: EchiquierProps) {
  const [caseSelectionnee, setCaseSelectionnee] = useState<Square | null>(null);
  const [promotionEnAttente, setPromotionEnAttente] = useState<{ from: Square; to: Square } | null>(null);

  const partie = useMemo(() => new Chess(fen), [fen]);
  const plateau = partie.board();

  const casesJouables = useMemo(() => {
    if (!caseSelectionnee) return [];
    return partie.moves({ square: caseSelectionnee, verbose: true }).map((coup) => coup.to);
  }, [partie, caseSelectionnee]);

  // Affiche le plateau du point de vue du joueur noir pour plus de confort.
  const rangsAffiches = couleurJoueur === 'b' ? [...plateau].reverse() : plateau;

  function cliquerSurCase(square: Square) {
    if (promotionEnAttente) return;
    const piece = partie.get(square);

    if (caseSelectionnee && casesJouables.includes(square)) {
      const estPromotion = partie
        .moves({ square: caseSelectionnee, verbose: true })
        .some((coup) => coup.to === square && coup.promotion);
      if (estPromotion) {
        setPromotionEnAttente({ from: caseSelectionnee, to: square });
      } else {
        onJouerCoup(caseSelectionnee, square);
      }
      setCaseSelectionnee(null);
      return;
    }

    if (!autoriseJouer) return;
    if (piece && piece.color === couleurJoueur) {
      setCaseSelectionnee(square === caseSelectionnee ? null : square);
    } else {
      setCaseSelectionnee(null);
    }
  }

  function choisirPromotion(piece: 'q' | 'r' | 'b' | 'n') {
    if (!promotionEnAttente) return;
    onJouerCoup(promotionEnAttente.from, promotionEnAttente.to, piece);
    setPromotionEnAttente(null);
  }

  return (
    <div>
      <div className="echiquier">
        {rangsAffiches.map((rang, indexRang) => {
          const rangOriginal = couleurJoueur === 'b' ? 7 - indexRang : indexRang;
          const casesAffichees = couleurJoueur === 'b' ? [...rang].reverse() : rang;
          return casesAffichees.map((piece, indexFichier) => {
            const fichierOriginal = couleurJoueur === 'b' ? 7 - indexFichier : indexFichier;
            const square = `${'abcdefgh'[fichierOriginal]}${8 - rangOriginal}` as Square;
            const estClaire = (rangOriginal + fichierOriginal) % 2 === 0;
            const jouable = autoriseJouer && (
              (piece && piece.color === couleurJoueur) || casesJouables.includes(square)
            );
            return (
              <div
                key={square}
                className={[
                  'case',
                  estClaire ? 'claire' : 'sombre',
                  jouable ? 'jouable' : '',
                  caseSelectionnee === square ? 'selectionnee' : '',
                  casesJouables.includes(square) ? 'jouable' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => cliquerSurCase(square)}
              >
                {piece ? SYMBOLES[`${piece.color}${piece.type}`] : ''}
              </div>
            );
          });
        })}
      </div>

      {promotionEnAttente && (
        <div className="promotion">
          <div className="promotion-choix">
            <button onClick={() => choisirPromotion('q')} title="Dame">♕</button>
            <button onClick={() => choisirPromotion('r')} title="Tour">♖</button>
            <button onClick={() => choisirPromotion('b')} title="Fou">♗</button>
            <button onClick={() => choisirPromotion('n')} title="Cavalier">♘</button>
          </div>
        </div>
      )}
    </div>
  );
}
