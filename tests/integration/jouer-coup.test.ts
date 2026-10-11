import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/serveur';

async function creerPartieEnCours(app: ReturnType<typeof createApp>) {
  const hote = request.agent(app);
  const invite = request.agent(app);
  await hote.post('/api/dev/login').send({ username: 'alice' });
  await invite.post('/api/dev/login').send({ username: 'bob' });

  const creation = await hote.post('/api/rooms/create');
  const { code, gameId } = creation.body;
  const jointure = await invite.post('/api/rooms/join').send({ code });

  // Identifie qui a les blancs pour jouer dans le bon ordre.
  const blancs = jointure.body.color === 'white' ? invite : hote;
  const noirs = jointure.body.color === 'white' ? hote : invite;

  return { gameId, blancs, noirs };
}

describe("Récit 4 : jouer un coup", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("joue un coup légal quand c'est son tour", async () => {
    const { gameId, blancs } = await creerPartieEnCours(app);

    const reponse = await blancs
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'e2', to: 'e4' });

    expect(reponse.status).toBe(200);
    expect(reponse.body.moves).toEqual(['e4']);
    expect(reponse.body.turn).toBe('black');
    expect(reponse.body.status).toBe('IN_PROGRESS');
  });

  it("refuse un coup hors tour", async () => {
    const { gameId, noirs } = await creerPartieEnCours(app);

    const reponse = await noirs
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'e7', to: 'e5' });

    expect(reponse.status).toBe(409);
  });

  it("refuse un coup illégal", async () => {
    const { gameId, blancs } = await creerPartieEnCours(app);

    const reponse = await blancs
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'e2', to: 'e5' });

    expect(reponse.status).toBe(400);
  });

  it("refuse un coup joué par quelqu'un qui ne participe pas à la partie", async () => {
    const { gameId } = await creerPartieEnCours(app);
    const etranger = request.agent(app);
    await etranger.post('/api/dev/login').send({ username: 'carla' });

    const reponse = await etranger
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'e2', to: 'e4' });

    expect(reponse.status).toBe(403);
  });

  it("détecte l'échec et mat (mat du berger) et refuse un coup après la fin", async () => {
    const { gameId, blancs, noirs } = await creerPartieEnCours(app);

    // Mat du berger : 1.e4 e5 2.Dh5 Cc6 3.Fc4 Cf6?? 4.Dxf7#
    await blancs.post(`/api/games/${gameId}/moves`).send({ from: 'e2', to: 'e4' });
    await noirs.post(`/api/games/${gameId}/moves`).send({ from: 'e7', to: 'e5' });
    await blancs.post(`/api/games/${gameId}/moves`).send({ from: 'd1', to: 'h5' });
    await noirs.post(`/api/games/${gameId}/moves`).send({ from: 'b8', to: 'c6' });
    await blancs.post(`/api/games/${gameId}/moves`).send({ from: 'f1', to: 'c4' });
    const avantDernierCoup = await noirs
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'g8', to: 'f6' }); // erreur noire, laisse f7 sans défense

    expect(avantDernierCoup.status).toBe(200);
    const coupFinal = await blancs
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'h5', to: 'f7' });

    expect(coupFinal.status).toBe(200);
    expect(coupFinal.body.status).toBe('WHITE_WON');
    expect(coupFinal.body.endReason).toBe('CHECKMATE');

    const coupApresLaFin = await noirs
      .post(`/api/games/${gameId}/moves`)
      .send({ from: 'e8', to: 'e7' });
    expect(coupApresLaFin.status).toBe(409);
  });
});
