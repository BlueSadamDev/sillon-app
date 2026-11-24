// Copie les polices Satoshi (Regular et Bold) dans le code de l'app, en base64, pour le PDF du partage
// (F10, lot 2.1). Le PDF les contient ainsi sans rien charger en ligne.
// À relancer seulement si les fichiers de assets/fonts/ changent : node scripts/generate-pdf-fonts.js
// Un test (src/share/fonts.test.ts) vérifie que le fichier produit correspond toujours aux polices.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const b64 = (name) => fs.readFileSync(path.join(root, 'assets/fonts', name)).toString('base64');

const out = `// FICHIER PRODUIT par scripts/generate-pdf-fonts.js : ne pas modifier à la main.
// Polices Satoshi en base64 pour le PDF du partage (F10, lot 2.1).

export const SATOSHI_REGULAR_BASE64 =
  '${b64('Satoshi-Regular.ttf')}';

export const SATOSHI_BOLD_BASE64 =
  '${b64('Satoshi-Bold.ttf')}';
`;
fs.writeFileSync(path.join(root, 'src/share/fonts.generated.ts'), out);
