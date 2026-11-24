// Export en clair (F7, lot 2) : une note = un fichier Markdown, rangés en dossiers selon l'arborescence.
// Calcul pur. « Jardin » devient « Jardin.md », ses sous-notes vont dans le dossier « Jardin/ ».
// Les archives vont dans « Archives/ », la corbeille dans « Corbeille/ ».
// Le fichier ZIP n'est PAS chiffré : il n'est créé que sur demande, après un avertissement.
import { noteMarkdown } from '@/notes/markdown';
import type { Note } from '@/notes/types';

import type { ZipEntry } from './zip';

export type ExportLabels = { root: string; archives: string; trash: string; untitled: string };

const MAX_NAME = 80;

/** Nom de fichier sûr sur Android, Windows et macOS. */
export function safeName(title: string, untitled: string): string {
  const cleaned = title
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  const short = Array.from(cleaned).slice(0, MAX_NAME).join('').trim();
  return short === '' ? untitled : short;
}

function sectionOf(n: Note, labels: ExportLabels): string {
  if (n.deletedAt !== null) return `${labels.root}/${labels.trash}`;
  if (n.archivedAt !== null) return `${labels.root}/${labels.archives}`;
  return labels.root;
}

export function noteFile(n: Note): string {
  return noteMarkdown(n);
}

export function exportEntries(notes: Note[], labels: ExportLabels): ZipEntry[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const sorted = [...notes].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
  const dirOf = new Map<string, string>(); // dossier où se trouve la note
  const baseOf = new Map<string, string>(); // nom unique de la note dans ce dossier (sans « .md »)
  const taken = new Map<string, Set<string>>(); // noms pris par dossier (sans tenir compte de la casse)

  function place(n: Note, seen: Set<string>): void {
    if (baseOf.has(n.id)) return;
    const parent = n.parentId !== null ? byId.get(n.parentId) : undefined;
    let dir = sectionOf(n, labels);
    if (parent && !seen.has(parent.id)) {
      place(parent, new Set(seen).add(n.id));
      const parentDir = dirOf.get(parent.id)!;
      // Sous la même section que la note ; chemin des parentes repris.
      const relative = parentDir.startsWith(sectionOf(parent, labels))
        ? parentDir.slice(sectionOf(parent, labels).length)
        : '';
      dir = `${dir}${relative}/${baseOf.get(parent.id)}`;
    }
    const names = taken.get(dir) ?? new Set<string>();
    const wanted = safeName(n.title, labels.untitled);
    let base = wanted;
    for (let i = 2; names.has(base.toLocaleLowerCase('fr')); i++) base = `${wanted} (${i})`;
    names.add(base.toLocaleLowerCase('fr'));
    taken.set(dir, names);
    dirOf.set(n.id, dir);
    baseOf.set(n.id, base);
  }

  sorted.forEach((n) => place(n, new Set([n.id])));
  const encoder = new TextEncoder();
  return sorted.map((n) => ({
    path: `${dirOf.get(n.id)}/${baseOf.get(n.id)}.md`,
    data: encoder.encode(noteFile(n)),
    modifiedAt: n.updatedAt,
  }));
}
