/// <reference types="node" />
// Test exécuté par Jest sur l'ordinateur (repris d'Aube). Garde-fou de confidentialité :
// aucun appel réseau, aucun console.log, aucune bibliothèque d'analytics, de suivi des plantages
// ou de publicité. Un ajout futur ferait échouer ce test.

import * as fs from 'fs';
import * as path from 'path';

const SRC = __dirname;
const ROOT = path.join(SRC, '..');

function appFiles(dir: string = SRC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return appFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const NETWORK_CALLS = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\b/,
  /\bdownloadAsync\b/,
  /\bdownloadFileAsync\b/,
  /\bcreateDownloadTask\b/,
  /\buploadAsync\b/,
  /\.upload\s*\(/,
  /\bcreateUploadTask\b/,
  /\bopenBrowserAsync\b/,
  /\bopenURL\s*\(/,
];

const FORBIDDEN_PACKAGES =
  /^(axios|@sentry\/|sentry-|@react-native-firebase\/|firebase|@amplitude\/|amplitude|@segment\/|mixpanel|@bugsnag\/|bugsnag|@datadog\/|posthog|expo-insights|expo-updates|react-native-blob-util|google-mobile-ads|react-native-google-mobile-ads)/;

describe('confidentialité', () => {
  const files = appFiles();

  it('parcourt bien le code de l’app', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('n’utilise aucune fonction réseau', () => {
    const found: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const re of NETWORK_CALLS) if (re.test(text)) found.push(`${path.relative(ROOT, file)} : ${re}`);
    }
    expect(found).toEqual([]);
  });

  it('ne contient aucune adresse Internet hors des notes fictives', () => {
    const found: string[] = [];
    for (const file of files.filter((f) => !f.includes(`${path.sep}__fixtures__${path.sep}`))) {
      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/(https?|wss?|ftp):\/\//i.test(line)) found.push(`${path.relative(ROOT, file)}:${i + 1}`);
        });
    }
    expect(found).toEqual([]);
  });

  it('n’écrit rien dans les journaux (console.*)', () => {
    const found = files.filter((f) => /\bconsole\.(log|info|warn|error|debug)\s*\(/.test(fs.readFileSync(f, 'utf8')));
    expect(found.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it('n’installe aucune bibliothèque réseau, d’analytics, de suivi des plantages ou de publicité', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(names.filter((n) => FORBIDDEN_PACKAGES.test(n))).toEqual([]);
  });

  it('le build de production retire la permission Internet', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'build-apk.yml'), 'utf8');
    expect(wf).toContain('android.permission.INTERNET');
    expect(wf).toContain('aapt');
  });
});
