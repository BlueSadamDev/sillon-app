// Préparation du texte Markdown avant le rendu (calcul pur).
// react-native-marked ne sait afficher ni les cases à cocher ni les liens [[ ]] :
//  - « - [ ] tâche » devient « - ![☐](sillontask:4) tâche » : un repère que le rendu remplace par une
//    case touchable ; 4 est le numéro de la ligne dans le texte, pour la cocher (lot 1.1) ;
//  - « [[Titre]] » devient « [Titre](sillonnote:Titre) » (un lien que le rendu reconnaît).
// Les blocs de code (```) ne sont pas modifiés.

export const TASK_OPEN = '☐';
export const TASK_DONE = '☑';
export const NOTE_SCHEME = 'sillonnote:';
export const TASK_SCHEME = 'sillontask:';

const TASK_LINE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]\s+/;
const WIKI_LINK = /\[\[([^\[\]\n|]+?)\]\]/g;

export function prepareMarkdown(src: string): string {
  let inFence = false;
  return src
    .split('\n')
    .map((line, index) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      let out = line.replace(TASK_LINE, (_m, bullet: string, mark: string) => {
        const box = mark === ' ' ? TASK_OPEN : TASK_DONE;
        return `${bullet}![${box}](${TASK_SCHEME}${index}) `;
      });
      out = out.replace(WIKI_LINK, (_m, title: string) => {
        const t = title.trim();
        return `[${t}](${NOTE_SCHEME}${encodeURIComponent(t)})`;
      });
      return out;
    })
    .join('\n');
}

/** Titre de la note visée par un lien sillonnote:, ou null pour un lien ordinaire. */
export function noteTitleFromHref(href: string): string | null {
  if (!href.startsWith(NOTE_SCHEME)) return null;
  try {
    return decodeURIComponent(href.slice(NOTE_SCHEME.length));
  } catch {
    return href.slice(NOTE_SCHEME.length);
  }
}

/** Numéro de ligne d'une case à cocher (lien sillontask:), ou null pour une autre image. */
export function taskLineFromHref(href: string): number | null {
  if (!href.startsWith(TASK_SCHEME)) return null;
  const n = Number(href.slice(TASK_SCHEME.length));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Coche ou décoche la case de la ligne donnée (« - [ ] » ↔ « - [x] »). Renvoie le texte inchangé si
 * la ligne n'est pas (ou plus) une case à cocher, ou si elle est dans un bloc de code.
 */
export function toggleTaskAt(src: string, lineIndex: number): string {
  const lines = src.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return src;
  let inFence = false;
  for (let i = 0; i < lineIndex; i++) if (/^\s*(```|~~~)/.test(lines[i])) inFence = !inFence;
  if (inFence) return src;
  const line = lines[lineIndex];
  const m = line.match(TASK_LINE);
  if (!m) return src;
  const mark = m[2] === ' ' ? 'x' : ' ';
  lines[lineIndex] = `${m[1]}[${mark}]${line.slice(m[1].length + 3)}`;
  return lines.join('\n');
}
