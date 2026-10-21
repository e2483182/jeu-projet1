import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/serveur';

describe('Connexion GitHub', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('redirige vers GitHub puis authentifie le joueur dans sa session', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'client-test');
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'secret-test');
    vi.stubEnv('GITHUB_CALLBACK_URL', 'http://localhost:3000/auth/github/callback');

    const fetchGithub = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token-test' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 123, login: '<script>alert(1)</script>' }), { status: 200 }),
      );

    const navigateur = request.agent(createApp());
    const debut = await navigateur.get('/auth/github');

    expect(debut.status).toBe(302);
    const adresseGitHub = new URL(debut.headers.location);
    expect(adresseGitHub.origin).toBe('https://github.com');

    const etat = adresseGitHub.searchParams.get('state');
    expect(etat).toBeTruthy();

    const callback = await navigateur.get(
      `/auth/github/callback?code=code-test&state=${encodeURIComponent(etat!)}`,
    );

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe('/');
    expect(fetchGithub).toHaveBeenNthCalledWith(
      2,
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-test' }),
      }),
    );

    const profil = await navigateur.get('/api/me');
    expect(profil.status).toBe(200);
    expect(profil.body.username).toBe('<script>alert(1)</script>');
  });

  it('refuse le profil d’un visiteur non connecté', async () => {
    const reponse = await request(createApp()).get('/api/me');

    expect(reponse.status).toBe(401);
    expect(reponse.body.error).toBe('Non authentifié');
  });
});
