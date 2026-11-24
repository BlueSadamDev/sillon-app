// Textes donnés au modèle d'embeddings, avec les préfixes de sa famille (rapport du lot 0).
// Calculs purs, sans interface.
import { EMBEDDING_MODEL, MODEL_FAMILIES, NOTE_TEXT, UNKNOWN_FAMILY } from './settings';

const family = MODEL_FAMILIES.find((f) => f.id === EMBEDDING_MODEL.familyId) ?? UNKNOWN_FAMILY;

function clip(text: string): string {
  return text.length <= NOTE_TEXT.maxChars ? text : text.slice(0, NOTE_TEXT.maxChars);
}

/** Texte d'une note : titre puis contenu, coupé à la longueur lue par le modèle. */
export function documentText(note: { title: string; body: string }): string {
  const content = [note.title.trim(), note.body.trim()].filter(Boolean).join('\n');
  return family.documentPrefix + clip(content);
}

export function queryText(query: string): string {
  return family.queryPrefix + clip(query.trim());
}

/** Vrai si la note n'a rien à comparer (titre et contenu vides) : pas de vecteur à calculer. */
export function isBlank(note: { title: string; body: string }): boolean {
  return note.title.trim() === '' && note.body.trim() === '';
}

/** Empreinte courte du texte (FNV-1a, 32 bits) : sert seulement à savoir s'il a changé. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
