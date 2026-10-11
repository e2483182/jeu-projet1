import { describe, it, expect } from 'vitest';
import { attendu, mettreAJourClassements, nouvelElo } from '../src/elo';

describe('Récit 6 : formule Elo', () => {
  it('deux joueurs à 1000 : victoire +10, défaite -10, nulle inchangée', () => {
    expect(attendu(1000, 1000)).toBe(0.5);
    expect(nouvelElo(1000, 1000, 1)).toBe(1010);
    expect(nouvelElo(1000, 1000, 0)).toBe(990);
    expect(nouvelElo(1000, 1000, 0.5)).toBe(1000);
  });

  it('une nulle entre 1400 et 1000 fait perdre des points au plus fort', () => {
    const { white, black } = mettreAJourClassements(1400, 1000, 'draw');
    expect(white).toBe(1392);
    expect(black).toBe(1008);
  });

  it('borne le classement entre 100 et 3000', () => {
    expect(nouvelElo(100, 3000, 0)).toBe(100);
    expect(nouvelElo(3000, 100, 1)).toBe(3000);
  });
});
