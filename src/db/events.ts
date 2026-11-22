// Signal « les notes ont changé » : les listes ouvertes (accueil, pages…) se relisent.
type Listener = () => void;
const listeners = new Set<Listener>();

export function notesChanged(): void {
  listeners.forEach((l) => l());
}

export function onNotesChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
