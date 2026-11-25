// Notes liées et recherche par le sens : classement des vecteurs déjà calculés. Calculs purs.
import { cosine, type Ranked } from './similarity';

type Doc = { id: string; vector: ArrayLike<number> };

function ranked(query: ArrayLike<number>, docs: Doc[], threshold: number, max: number, skip: Set<string>): Ranked[] {
  const out: Ranked[] = [];
  for (const d of docs) {
    if (skip.has(d.id) || d.vector.length !== query.length) continue;
    const score = cosine(query, d.vector);
    if (score >= threshold) out.push({ id: d.id, score });
  }
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, max);
}

/** Les notes les plus proches d'une note, au-dessus du seuil, sans la note elle-même. */
export function relatedNotes(noteId: string, vector: ArrayLike<number>, docs: Doc[], threshold: number, max: number): Ranked[] {
  return ranked(vector, docs, threshold, max, new Set([noteId]));
}

/** Résultats par le sens, sans ceux déjà trouvés par les mots. */
export function semanticResults(
  query: ArrayLike<number>,
  docs: Doc[],
  threshold: number,
  max: number,
  alreadyFound: string[] = [],
): Ranked[] {
  return ranked(query, docs, threshold, max, new Set(alreadyFound));
}
