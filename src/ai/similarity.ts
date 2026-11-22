// Calculs purs pour la recherche par le sens : proximité entre vecteurs et mesure de qualité.

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error('Vecteurs de tailles différentes');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export type Ranked = { id: string; score: number };

/** Les éléments classés du plus proche au moins proche. */
export function rank(query: number[], docs: { id: string; vector: number[] }[]): Ranked[] {
  return docs
    .map((d) => ({ id: d.id, score: cosine(query, d.vector) }))
    .sort((x, y) => y.score - x.score);
}

export type QualityReport = {
  queries: number;
  top1: number;
  topK: number;
  /** Rang moyen réciproque (1 = toujours premier). */
  mrr: number;
  /** Écart moyen entre le score de la bonne note et celui de la meilleure mauvaise note. */
  meanMargin: number;
  details: { query: string; expectedId: string; rank: number; firstId: string; margin: number }[];
};

export function evaluate(
  queries: { text: string; expectedId: string; vector: number[] }[],
  docs: { id: string; vector: number[] }[],
  k: number,
): QualityReport {
  let top1 = 0;
  let topK = 0;
  let rr = 0;
  let marginSum = 0;
  const details: QualityReport['details'] = [];
  for (const q of queries) {
    const ranked = rank(q.vector, docs);
    const pos = ranked.findIndex((r) => r.id === q.expectedId);
    const position = pos + 1;
    const good = ranked[pos]?.score ?? 0;
    const bestOther = ranked.find((r) => r.id !== q.expectedId)?.score ?? 0;
    const margin = good - bestOther;
    if (position === 1) top1++;
    if (position >= 1 && position <= k) topK++;
    if (position >= 1) rr += 1 / position;
    marginSum += margin;
    details.push({ query: q.text, expectedId: q.expectedId, rank: position, firstId: ranked[0]?.id ?? '', margin });
  }
  const n = queries.length || 1;
  return { queries: queries.length, top1, topK, mrr: rr / n, meanMargin: marginSum / n, details };
}
