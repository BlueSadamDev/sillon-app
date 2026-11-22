// Préparation du texte Markdown avant le rendu (calcul pur).
// react-native-marked ne sait afficher ni les cases à cocher ni les liens [[ ]] :
//  - « - [ ] tâche » devient « - `☐` tâche » (un repère que le rendu remplace par une case) ;
//  - « [[Titre]] » devient « [Titre](sillonnote:Titre) » (un lien que le rendu reconnaît).
// Les blocs de code (```) ne sont pas modifiés.

export const TASK_OPEN = '☐';
export const TASK_DONE = '☑';
export const NOTE_SCHEME = 'sillonnote:';

const TASK_LINE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]\s+/;
const WIKI_LINK = /\[\[([^\[\]\n|]+?)\]\]/g;

export function prepareMarkdown(src: string): string {
  let inFence = false;
  return src
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      let out = line.replace(TASK_LINE, (_m, bullet: string, mark: string) => {
        const box = mark === ' ' ? TASK_OPEN : TASK_DONE;
        return `${bullet}\`${box}\` `;
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
