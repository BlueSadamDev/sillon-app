// Capture rapide de l'accueil (DESIGN.md, « Champ de capture rapide ») : calcul pur.
// Une seule ligne : la note est enregistrée directement, la ligne devient son titre.
// Plusieurs lignes : la première devient le titre, le reste le contenu, et l'éditeur s'ouvre.

export type Capture = { title: string; body: string; openEditor: boolean };

export function splitCapture(text: string): Capture | null {
  const trimmed = text.replace(/\r\n?/g, '\n').trim();
  if (trimmed.length === 0) return null;
  const newline = trimmed.indexOf('\n');
  if (newline === -1) return { title: trimmed, body: '', openEditor: false };
  return {
    title: trimmed.slice(0, newline).trim(),
    body: trimmed.slice(newline + 1).replace(/^\n+/, ''),
    openEditor: true,
  };
}
