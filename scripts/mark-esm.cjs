// Script exécuté après `react-router build` (voir package.json) : indique à
// Node que le dossier build/server contient du code ESM, nécessaire pour que
// l'import() dynamique dans server.mjs (lui-même en ESM) fonctionne, sans
// avoir à ajouter "type": "module" au package.json racine (qui casserait le
// reste du backend, écrit en CommonJS).
const fs = require('node:fs');
const path = require('node:path');

const cheminPackage = path.join(__dirname, '..', 'build', 'server', 'package.json');
fs.writeFileSync(cheminPackage, JSON.stringify({ type: 'module' }, null, 2) + '\n');
console.log('build/server/package.json marqué comme module ESM.');
