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

Ouvrez <http://localhost:3000>. En développement, entrez un nom pour vous
connecter. Cette connexion factice n'est activée qu'en développement et en
test ; l'authentification GitHub OAuth réelle n'est pas encore implémentée.
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

1. Dans le dépôt, construisez et publiez une image Docker sur GHCR (ou utilisez
   une image publiée par le pipeline de CI).
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

### Limitation connue

La connexion GitHub OAuth (récit 1) n'est pas implémentée. En production, la
connexion factice est désactivée pour empêcher l'usurpation de compte ; la
page l'indique et le jeu ne peut pas encore être utilisé avant l'ajout du vrai
flux OAuth. Les variables OAuth ne sont donc pas demandées dans `.env` tant que
ce flux n'existe pas.
