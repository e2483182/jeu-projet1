import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/serveur';

describe('Connexion GitHub', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirige vers GitHub puis revient sur la page d’accueil connectée', async () => {
    process.env.GITHUB_CLIENT_ID = 'client-test';
    process.env.GITHUB_CLIENT_SECRET = 'secret-test';
    process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/auth/github/callback';

    vi.spyOn(globalThis, 'fetch')
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

    const accueil = await navigateur.get('/');
    expect(accueil.status).toBe(200);
    expect(accueil.headers['content-type']).toContain('text/html');
    expect(accueil.text).toContain('Connexion réussie');
    expect(accueil.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(accueil.text).not.toContain('<script>alert(1)</script>');
  });

  it('propose la connexion GitHub aux visiteurs non connectés', async () => {
    const reponse = await request(createApp()).get('/');

    expect(reponse.status).toBe(200);
    expect(reponse.text).toContain('href="/auth/github"');
  });
});
