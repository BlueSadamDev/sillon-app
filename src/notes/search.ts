// Recherche par mots (calcul pur) : préparation de la requête, mise en relief, extrait.
// La recherche ignore les accents et les majuscules (« ete » trouve « Été »), et accepte
// un début de mot (« lisb » trouve « Lisbonne »).
import { EXCERPT_LENGTH } from './settings';

/** Mots d'une recherche, en minuscules et sans accents. */
export function searchTerms(input: string): string[] {
  const words = normalize(input).match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words)];
}

/** Requête pour le moteur plein texte de SQLite (FTS5) : tous les mots, chacun en début de mot. */
export function toFtsQuery(input: string): string | null {
  const terms = searchTerms(input);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"*`).join(' ');
}

/** Minuscules sans accents, en gardant la même longueur que le texte d'origine. */
export function normalize(text: string): string {
  return Array.from(text, (ch) => {
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
    return base.length === ch.length ? base : ch.toLocaleLowerCase('fr');
  }).join('');
}

export type Segment = { text: string; match: boolean };

/** Découpe un texte en morceaux, en marquant les débuts de mots qui correspondent à la recherche. */
export function highlight(text: string, terms: string[]): Segment[] {
  if (terms.length === 0 || text.length === 0) return text ? [{ text, match: false }] : [];
  const norm = normalize(text);
  const marks = new Array<boolean>(text.length).fill(false);
  for (const term of terms) {
    let from = 0;
    while (from < norm.length) {
      const at = norm.indexOf(term, from);
      if (at === -1) break;
      const startsWord = at === 0 || !/[\p{L}\p{N}]/u.test(norm[at - 1]);
      if (startsWord) for (let i = at; i < at + term.length; i++) marks[i] = true;
      from = at + 1;
    }
  }
  const out: Segment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];
    if (last && last.match === marks[i]) last.text += text[i];
    else out.push({ text: text[i], match: marks[i] });
  }
  return out;
}

/** Texte brut d'une note pour un extrait : sans les signes Markdown les plus courants. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^\s*(```|~~~).*$/gm, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrait d'une note autour du premier mot trouvé (ou son début, sans recherche). */
export function excerpt(markdown: string, terms: string[], length: number = EXCERPT_LENGTH): string {
  const text = plainText(markdown);
  if (text.length <= length) return text;
  const norm = normalize(text);
  const firstHit = terms.map((t) => norm.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (firstHit === undefined || firstHit < length / 3) return text.slice(0, length).trimEnd() + '…';
  const start = text.lastIndexOf(' ', firstHit - Math.floor(length / 3));
  const from = start < 0 ? 0 : start + 1;
  return '…' + text.slice(from, from + length).trimEnd() + (from + length < text.length ? '…' : '');
}
