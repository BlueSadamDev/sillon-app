// Tags d'une note : les mots écrits « #mot » dans le texte (calcul pur).
// Un « # » suivi d'une espace est un titre Markdown, pas un tag. Les blocs de code sont ignorés,
// ainsi que les « # » collés à un mot (adresse, « C# »).
import { TAG_MAX_LENGTH } from './settings';

const TAG = /(^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;

export function extractTags(body: string): string[] {
  const found = new Set<string>();
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const withoutCode = line.replace(/`[^`]*`/g, ' ');
    for (const m of withoutCode.matchAll(TAG)) {
      const tag = m[2].replace(/[-_]+$/, '').toLocaleLowerCase('fr');
      if (tag.length > 0 && tag.length <= TAG_MAX_LENGTH) found.add(tag);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b, 'fr'));
}
