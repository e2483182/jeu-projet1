import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/serveur';
import { userRepository } from '../../src/repo/user';

async function creerPartieEnCours(
  app: ReturnType<typeof createApp>,
  noms: { invite: string; hote: string }
) {
  const hote = request.agent(app);
  const invite = request.agent(app);
  const sessionHote = await hote.post('/api/dev/login').send({ username: noms.hote });
  const sessionInvite = await invite.post('/api/dev/login').send({ username: noms.invite });

  const creation = await hote.post('/api/rooms/create');
  const { code, gameId } = creation.body;
  const jointure = await invite.post('/api/rooms/join').send({ code });

  const blancs = jointure.body.color === 'white' ? invite : hote;
  const noirs = jointure.body.color === 'white' ? hote : invite;
  const idBlanc = jointure.body.color === 'white' ? sessionInvite.body.id : sessionHote.body.id;
  const idNoir = jointure.body.color === 'white' ? sessionHote.body.id : sessionInvite.body.id;

  return { gameId, blancs, noirs, hote, invite, idBlanc, idNoir };
}

describe('Récits 5 et 6 : abandon, résultat, classement et historique', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("l'abandon fait perdre, met à jour les deux Elo et apparaît dans l'historique", async () => {
    const { gameId, blancs, noirs } = await creerPartieEnCours(app, {
      hote: 'alice-abandon',
      invite: 'bob-abandon',
    });

    const avant = await blancs.get('/api/me/history');
    expect(avant.status).toBe(200);
    expect(avant.body).toEqual([]);

    const abandon = await blancs.post(`/api/games/${gameId}/resign`);
    expect(abandon.status).toBe(200);
    expect(abandon.body.status).toBe('BLACK_WON');
    expect(abandon.body.endReason).toBe('RESIGNATION');
    expect(abandon.body.ratings.white.before).toBe(1000);
    expect(abandon.body.ratings.black.before).toBe(1000);
    expect(abandon.body.ratings.white.after).toBe(990);
    expect(abandon.body.ratings.black.after).toBe(1010);

    const moiBlanc = await blancs.get('/api/me');
    const moiNoir = await noirs.get('/api/me');
    expect(moiBlanc.body.elo).toBe(990);
    expect(moiNoir.body.elo).toBe(1010);

    // L'adversaire voit le résultat en interrogeant la partie, sans jouer de coup.
    const vueAdversaire = await noirs.get(`/api/games/${gameId}`);
    expect(vueAdversaire.status).toBe(200);
    expect(vueAdversaire.body.status).toBe('BLACK_WON');
    expect(vueAdversaire.body.endReason).toBe('RESIGNATION');
    expect(vueAdversaire.body.ratings.white.after).toBe(990);
    expect(vueAdversaire.body.ratings.black.after).toBe(1010);

    const historiqueBlanc = await blancs.get('/api/me/history');
    expect(historiqueBlanc.body).toHaveLength(1);
    expect(historiqueBlanc.body[0].gameId).toBe(gameId);
    expect(historiqueBlanc.body[0].resultat).toBe('defaite');
    expect(historiqueBlanc.body[0].endReason).toBe('RESIGNATION');

    const historiqueNoir = await noirs.get('/api/me/history');
    expect(historiqueNoir.body[0].resultat).toBe('victoire');
    expect(historiqueNoir.body[0].ratings.black.after).toBe(1010);
  });

  it('refuse un second abandon, un abandon hors partie, et un coup après la fin', async () => {
    const { gameId, noirs, hote } = await creerPartieEnCours(app, {
      hote: 'alice-refus',
      invite: 'bob-refus',
    });

    const etranger = request.agent(app);
    await etranger.post('/api/dev/login').send({ username: 'carla-refus' });
    const pendantLaPartie = await etranger.post(`/api/games/${gameId}/resign`);
    expect(pendantLaPartie.status).toBe(403);

    const abandon = await noirs.post(`/api/games/${gameId}/resign`);
    expect(abandon.status).toBe(200);
    expect(abandon.body.status).toBe('WHITE_WON');
    expect(abandon.body.ratings.white.after).toBe(1010);
    expect(abandon.body.ratings.black.after).toBe(990);

    const second = await noirs.post(`/api/games/${gameId}/resign`);
    expect(second.status).toBe(409);

    const intrusion = await etranger.post(`/api/games/${gameId}/resign`);
    expect(intrusion.status).toBe(409);

    const coupApres = await hote.post(`/api/games/${gameId}/moves`).send({ from: 'e2', to: 'e4' });
    expect(coupApres.status).toBe(409);

    const anonyme = request.agent(app);
    expect((await anonyme.post(`/api/games/${gameId}/resign`)).status).toBe(401);
    expect((await anonyme.get('/api/me/history')).status).toBe(401);
  });

  it("refuse d'abandonner une partie qui n'a pas commencé", async () => {
    const hote = request.agent(app);
    await hote.post('/api/dev/login').send({ username: 'alice-attente' });
    const creation = await hote.post('/api/rooms/create');

    const reponse = await hote.post(`/api/games/${creation.body.gameId}/resign`);
    expect(reponse.status).toBe(409);
    expect(reponse.body.error).toMatch(/pas en cours/i);
  });

  it('le mat met à jour les classements et inscrit la partie dans l’historique', async () => {
    const { gameId, blancs, noirs } = await creerPartieEnCours(app, {
      hote: 'alice-mat',
      invite: 'bob-mat',
    });

    // Mat du fou : 1.f3 e5 2.g4 Dh4#
    await blancs.post(`/api/games/${gameId}/moves`).send({ from: 'f2', to: 'f3' });
    await noirs.post(`/api/games/${gameId}/moves`).send({ from: 'e7', to: 'e5' });
    await blancs.post(`/api/games/${gameId}/moves`).send({ from: 'g2', to: 'g4' });
    const mat = await noirs.post(`/api/games/${gameId}/moves`).send({ from: 'd8', to: 'h4' });

    expect(mat.status).toBe(200);
    expect(mat.body.status).toBe('BLACK_WON');
    expect(mat.body.endReason).toBe('CHECKMATE');
    expect(mat.body.ratings.white.after).toBe(990);
    expect(mat.body.ratings.black.after).toBe(1010);

    const historique = await noirs.get('/api/me/history');
    expect(historique.body).toHaveLength(1);
    expect(historique.body[0].status).toBe('BLACK_WON');
    expect(historique.body[0].resultat).toBe('victoire');
    expect(historique.body[0].endReason).toBe('CHECKMATE');
  });

  it('le pat est une nulle : les Elo égaux restent à 1000 et la partie est dans l’historique', async () => {
    const { gameId, blancs, noirs } = await creerPartieEnCours(app, {
      hote: 'alice-pat',
      invite: 'bob-pat',
    });

    const sequence = [
      ['e2', 'e3'],
      ['a7', 'a5'],
      ['d1', 'h5'],
      ['a8', 'a6'],
      ['h5', 'a5'],
      ['h7', 'h5'],
      ['h2', 'h4'],
      ['a6', 'h6'],
      ['a5', 'c7'],
      ['f7', 'f6'],
      ['c7', 'd7'],
      ['e8', 'f7'],
      ['d7', 'b7'],
      ['d8', 'd3'],
      ['b7', 'b8'],
      ['d3', 'h7'],
      ['b8', 'c8'],
      ['f7', 'g6'],
      ['c8', 'e6'],
    ];

    let dernier;
    for (let i = 0; i < sequence.length; i += 1) {
      const [from, to] = sequence[i];
      const joueur = i % 2 === 0 ? blancs : noirs;
      dernier = await joueur.post(`/api/games/${gameId}/moves`).send({ from, to });
      expect(dernier.status, `coup ${from}${to}`).toBe(200);
    }

    expect(dernier!.body.status).toBe('DRAW');
    expect(dernier!.body.endReason).toBe('STALEMATE');
    expect(dernier!.body.ratings.white.after).toBe(1000);
    expect(dernier!.body.ratings.black.after).toBe(1000);

    const historique = await blancs.get('/api/me/history');
    expect(historique.body[0].resultat).toBe('nulle');
    expect(historique.body[0].ratings.white.after).toBe(1000);
  });

  it('utilise les Elo du début de partie, pas un classement modifié après coup', async () => {
    const hote = request.agent(app);
    const invite = request.agent(app);
    const sessionHote = await hote.post('/api/dev/login').send({ username: 'fort' });
    await invite.post('/api/dev/login').send({ username: 'faible' });
    userRepository.updateElo(sessionHote.body.id, 1400);

    const creation = await hote.post('/api/rooms/create');
    const jointure = await invite.post('/api/rooms/join').send({ code: creation.body.code });
    const blancs = jointure.body.color === 'white' ? invite : hote;

    // Le joueur à 1400 abandonne s'il a les blancs, sinon c'est l'autre.
    // On force l'abandon du joueur « fort » quel que soit sa couleur.
    const abandon = await hote.post(`/api/games/${creation.body.gameId}/resign`);
    expect(abandon.status).toBe(200);

    if (blancs === hote) {
      expect(abandon.body.ratings.white.before).toBe(1400);
      expect(abandon.body.ratings.white.after).toBe(1382);
      expect(abandon.body.ratings.black.before).toBe(1000);
      expect(abandon.body.ratings.black.after).toBe(1018);
    } else {
      expect(abandon.body.ratings.black.before).toBe(1400);
      expect(abandon.body.ratings.black.after).toBe(1382);
      expect(abandon.body.ratings.white.before).toBe(1000);
      expect(abandon.body.ratings.white.after).toBe(1018);
    }
  });
});
