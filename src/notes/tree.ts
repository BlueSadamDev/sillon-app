// Arborescence des notes (calcul pur) : sous-notes, chemin d'une note, déplacement.
import type { Note } from './types';

type TreeNote = Pick<Note, 'id' | 'title' | 'parentId'>;

export type TreeNode<T extends TreeNote> = { note: T; children: TreeNode<T>[] };

function byTitle(a: TreeNote, b: TreeNote): number {
  return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }) || a.id.localeCompare(b.id);
}

/** Construit l'arbre. Une note dont le parent est absent (corbeille, effacé) est mise à la racine. */
export function buildTree<T extends TreeNote>(notes: T[]): TreeNode<T>[] {
  const nodes = new Map(notes.map((n) => [n.id, { note: n, children: [] as TreeNode<T>[] }]));
  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.note.parentId ? nodes.get(node.note.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: TreeNode<T>[]) => {
    list.sort((a, b) => byTitle(a.note, b.note));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Identifiants de toutes les sous-notes (à toute profondeur) d'une note. */
export function descendantIds(id: string, notes: TreeNote[]): string[] {
  const children = new Map<string, string[]>();
  for (const n of notes) {
    if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n.id]);
  }
  const out: string[] = [];
  const stack = [...(children.get(id) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (out.includes(next)) continue;
    out.push(next);
    stack.push(...(children.get(next) ?? []));
  }
  return out;
}

/** Une note ne peut pas être rangée dans elle-même ni dans une de ses sous-notes. */
export function canMove(id: string, newParentId: string | null, notes: TreeNote[]): boolean {
  if (newParentId === null) return true;
  if (newParentId === id) return false;
  return !descendantIds(id, notes).includes(newParentId);
}

/** Chemin d'une note, de la racine jusqu'à elle (pour « Parent › Note »). */
export function pathOf<T extends TreeNote>(id: string, notes: T[]): T[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const path: T[] = [];
  let current = byId.get(id);
  while (current && !path.includes(current)) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
