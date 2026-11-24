// Partage simple d'une note (F10, lot 2.1) : ce qui est envoyé (calcul pur, sans interface).
// - La note seule, ou la note puis ses sous-notes à la suite (ordre de Pages, toutes profondeurs).
//   Les sous-notes à la corbeille sont exclues ; les archivées sont incluses.
// - Les liens [[Titre]] deviennent « Titre » (texte simple) ; les tags #mot restent.
// - Rien d'autre que le titre et le contenu : ni insights, ni notes liées, ni réglages du téléphone.
import { safeName } from '@/backup/plainExport';
import { noteMarkdown } from '@/notes/markdown';
import { buildTree, type TreeNode } from '@/notes/tree';
import type { Note } from '@/notes/types';

type ShareNote = Pick<Note, 'id' | 'title' | 'body' | 'parentId' | 'deletedAt'>;

export type SharedNote = { title: string; body: string; depth: number };

const WIKI_LINK = /\[\[([^\[\]\n|]+?)\]\]/g;

/** « [[Titre]] » devient « Titre ». Les blocs de code (```) ne sont pas modifiés. */
export function plainLinks(src: string): string {
  let inFence = false;
  return src
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : line.replace(WIKI_LINK, (_m, title: string) => title.trim());
    })
    .join('\n');
}

/** Notes à partager, dans l'ordre : la note, puis (si demandé) ses sous-notes hors corbeille. */
export function collectShared(rootId: string, notes: ShareNote[], withChildren: boolean): SharedNote[] {
  const root = notes.find((n) => n.id === rootId);
  if (!root) return [];
  const out: SharedNote[] = [{ title: root.title, body: plainLinks(root.body), depth: 0 }];
  if (!withChildren) return out;
  const alive = notes.filter((n) => n.deletedAt === null || n.id === rootId);
  const node = findNode(buildTree(alive), rootId);
  const walk = (children: TreeNode<ShareNote>[], depth: number) => {
    for (const child of children) {
      out.push({ title: child.note.title, body: plainLinks(child.note.body), depth });
      walk(child.children, depth + 1);
    }
  };
  if (node) walk(node.children, 1);
  return out;
}

function findNode<T extends ShareNote>(list: TreeNode<T>[], id: string): TreeNode<T> | null {
  for (const n of list) {
    if (n.note.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

/** Nombre de sous-notes partageables (hors corbeille), pour afficher ou non l'option. */
export function shareableChildCount(rootId: string, notes: ShareNote[]): number {
  return collectShared(rootId, notes, true).length - 1;
}

/** Le texte Markdown partagé (format « Texte » et fichier `.md`) : notes séparées par un trait. */
export function sharedMarkdown(list: SharedNote[], untitled: string): string {
  return list
    .map((n) => noteMarkdown({ title: n.title.trim() === '' ? untitled : n.title, body: n.body }).trimEnd() + '\n')
    .join('\n---\n\n');
}

/** Nom du fichier partagé : le titre de la note, nettoyé (même règle que l'export en clair). */
export function sharedFileName(title: string, untitled: string, extension: 'md' | 'pdf'): string {
  return `${safeName(title, untitled)}.${extension}`;
}
