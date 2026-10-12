# Échecs en ligne

Application web de jeu d'échecs à deux joueurs : une partie privée est créée
avec un code, puis l'adversaire rejoint avec ce code. Les coups et la position
de la partie sont stockés dans SQLite. Le navigateur actualise l'état de la
partie en interrogeant l'API toutes les deux secondes.

## Choix techniques

- **Express** expose l'API et gère les sessions.
- **React Router en mode framework** rend les pages côté serveur (SSR) et
  hydrate les composants dans le navigateur.
- **`chess.js`** valide les coups côté serveur. Le frontend l'utilise aussi
  pour afficher les pièces depuis le FEN et guider le joueur avec les coups
  légaux possibles ; le serveur reste l'autorité et refuse tout coup illégal.
- **SQLite (`node:sqlite`)** persiste les joueurs et les parties. En Docker,
  le fichier est placé dans le volume `donnees-echecs`.

## Développement local

Prérequis : Node.js 24 ou supérieur.

```powershell
npm install
npm run dev
```

Ouvrez <http://localhost:3000>. Configurez `SESSION_SECRET`,
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` et `GITHUB_CALLBACK_URL` dans
l'environnement du serveur pour activer la connexion GitHub OAuth. L'URL de
rappel doit correspondre à celle enregistrée dans l'application OAuth GitHub.
Pour lancer les tests d'intégration de l'API :

```powershell
npm test
```

La production peut être compilée avec `npm run build`. Pour un démarrage
manuel, définissez `NODE_ENV=production`, `SESSION_SECRET` et, si nécessaire,
`DATABASE_PATH` avant `npm start`.

## Déploiement avec Docker Compose

Le serveur de déploiement n'a besoin que de Docker avec le plugin Docker
Compose. Il télécharge une image déjà publiée sur GitHub Container Registry ;
le fichier Compose ne construit pas l'image.

1. Le workflow GitHub Actions vérifie les tests, les types et le build sur les
   pull requests vers `main`. Après un push sur `main` ou d'un tag `v*`, il
   publie l'image sur GHCR avec un tag `sha-<SHA complet>` (ainsi que les tags
   de branche ou de version).
2. Sur la machine de déploiement, placez `deploy/compose.yml` et créez un
   fichier `deploy/.env` à partir de `deploy/.env.example`.
3. Dans `deploy/.env`, vérifiez `GHCR_OWNER`, `IMAGE_NAME` et `IMAGE_TAG`, puis
   remplacez `SESSION_SECRET` par une valeur aléatoire longue et unique. Ce
   fichier n'est pas suivi par Git. Ne partagez pas cette clé.
4. Si le dépôt d'images est privé, connectez Docker à GHCR avec un jeton ayant
   la permission de lecture de paquets :

   ```powershell
   docker login ghcr.io
   ```

5. Démarrez l'application depuis le dossier `deploy` :

   ```powershell
   docker compose pull
   docker compose up -d
   docker compose logs -f
   ```

L'application est disponible sur le port indiqué par `PORT` dans `.env`
(3000 par défaut). Les données SQLite restent dans le volume nommé
`donnees-echecs` lorsque le conteneur est remplacé ou redémarré.

Pour construire puis publier une image manuellement depuis la racine du dépôt :

```powershell
docker login ghcr.io
docker build -t ghcr.io/e2483182/jeu-projet1:latest .
docker push ghcr.io/e2483182/jeu-projet1:latest
```

Pour la remise, placez le tag Git `v1` sur le commit final après la fusion du
workflow CI. La poussée de ce tag exécute les validations et publie l'image de
ce même commit sous
`ghcr.io/e2483182/jeu-projet1:sha-<SHA complet du commit v1>`. Si `v1` existe
déjà sur un ancien commit, vérifiez le commit cible avant de déplacer le tag.

### Limitation connue

L'expérience de jeu dépend des routes et de l'API disponibles dans l'application ;
la connexion OAuth seule ne crée pas de partie automatiquement.
