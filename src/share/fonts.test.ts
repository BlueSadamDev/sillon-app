/// <reference types="node" />
// Les polices intégrées au PDF (fonts.generated.ts) doivent correspondre aux fichiers de assets/fonts/.
// En cas d'échec : node scripts/generate-pdf-fonts.js
import * as fs from 'fs';
import * as path from 'path';

import { SATOSHI_BOLD_BASE64, SATOSHI_REGULAR_BASE64 } from './fonts.generated';

const fontFile = (name: string) => fs.readFileSync(path.join(__dirname, '../../assets/fonts', name)).toString('base64');

it('polices du PDF identiques aux fichiers Satoshi', () => {
  expect(SATOSHI_REGULAR_BASE64).toBe(fontFile('Satoshi-Regular.ttf'));
  expect(SATOSHI_BOLD_BASE64).toBe(fontFile('Satoshi-Bold.ttf'));
});
