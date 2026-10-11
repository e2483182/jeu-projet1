import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/serveur';

// Crée deux agents (chacun avec ses propres cookies de session) déjà connectés,
// pour simuler deux joueurs distincts via la route de connexion factice de test.
async function creerDeuxJoueursConnectes(app: ReturnType<typeof createApp>) {
  const hote = request.agent(app);
  const invite = request.agent(app);
  await hote.post('/api/dev/login').send({ username: 'alice' });
  await invite.post('/api/dev/login').send({ username: 'bob' });
  return { hote, invite };
}

describe("Récit 3 : rejoindre une partie privée avec un code", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("permet à un second joueur de rejoindre avec un code valide et tire les couleurs", async () => {
    const { hote, invite } = await creerDeuxJoueursConnectes(app);

    const creation = await hote.post('/api/rooms/create');
    expect(creation.status).toBe(201);
    const { code, gameId } = creation.body;

    const jointure = await invite.post('/api/rooms/join').send({ code });
    expect(jointure.status).toBe(200);
    expect(jointure.body.gameId).toBe(gameId);
    expect(['white', 'black']).toContain(jointure.body.color);
    expect(typeof jointure.body.fen).toBe('string');

    // La partie est maintenant consultable par les deux joueurs.
    const etat = await hote.get(`/api/games/${gameId}`);
    expect(etat.status).toBe(200);
    expect(etat.body.status).toBe('IN_PROGRESS');
    expect(etat.body.whitePlayerId).not.toBeNull();
    expect(etat.body.blackPlayerId).not.toBeNull();
    expect(etat.body.whitePlayerId).not.toBe(etat.body.blackPlayerId);
  });

  it("refuse un code inconnu avec un message clair", async () => {
    const { invite } = await creerDeuxJoueursConnectes(app);

    const reponse = await invite.post('/api/rooms/join').send({ code: 'INCONNU' });

    expect(reponse.status).toBe(404);
    expect(reponse.body.error).toMatch(/inconnu/i);
  });

  it("refuse un code déjà utilisé", async () => {
    const { hote, invite } = await creerDeuxJoueursConnectes(app);
    const troisieme = request.agent(app);
    await troisieme.post('/api/dev/login').send({ username: 'carla' });

    const creation = await hote.post('/api/rooms/create');
    const { code } = creation.body;

    const premiereJointure = await invite.post('/api/rooms/join').send({ code });
    expect(premiereJointure.status).toBe(200);

    const deuxiemeJointure = await troisieme.post('/api/rooms/join').send({ code });
    expect(deuxiemeJointure.status).toBe(409);
    expect(deuxiemeJointure.body.error).toMatch(/déjà/i);
  });

  it("refuse qu'une personne rejoigne sa propre partie", async () => {
    const { hote } = await creerDeuxJoueursConnectes(app);

    const creation = await hote.post('/api/rooms/create');
    const { code } = creation.body;

    const reponse = await hote.post('/api/rooms/join').send({ code });

    expect(reponse.status).toBe(400);
  });

  it("refuse de rejoindre sans être authentifié", async () => {
    const anonyme = request.agent(app);

    const reponse = await anonyme.post('/api/rooms/join').send({ code: 'ABC123' });

    expect(reponse.status).toBe(401);
  });
});
