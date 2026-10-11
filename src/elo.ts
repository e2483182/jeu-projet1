const ELO_MIN = 100;
const ELO_MAX = 3000;
const FACTEUR_K = 20;

export type Vainqueur = 'white' | 'black' | 'draw';

export function attendu(eloA: number, eloB: number): number {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

export function nouvelElo(eloA: number, eloB: number, score: number): number {
  const arrondi = Math.round(eloA + FACTEUR_K * (score - attendu(eloA, eloB)));
  return Math.min(ELO_MAX, Math.max(ELO_MIN, arrondi));
}

export function mettreAJourClassements(eloBlanc: number, eloNoir: number, vainqueur: Vainqueur) {
  const scoreBlanc = vainqueur === 'white' ? 1 : vainqueur === 'black' ? 0 : 0.5;
  const scoreNoir = vainqueur === 'black' ? 1 : vainqueur === 'white' ? 0 : 0.5;
  return {
    white: nouvelElo(eloBlanc, eloNoir, scoreBlanc),
    black: nouvelElo(eloNoir, eloBlanc, scoreNoir),
  };
}