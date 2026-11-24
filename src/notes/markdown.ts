// Une note entière en Markdown (calcul pur) : le titre en « # », puis le contenu.
// Utilisé par l'export en clair et par « Copier tout le texte » (lot 1.1).

export function noteMarkdown(n: { title: string; body: string }): string {
  return n.title.trim() === '' ? `${n.body}\n` : `# ${n.title.trim()}\n\n${n.body}\n`;
}
