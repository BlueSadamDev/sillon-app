// Lot 7.0 (prototype) : branchement d'un champ de saisie sur un texte Yjs.
// Étude de la synchronisation, section 6.2 :
// - à chaque frappe, on compare l'ancien et le nouveau texte (partie commune au début et à la fin)
//   et on transmet à Yjs une seule opération « supprimer / insérer » ;
// - quand une modification arrive d'un autre appareil, le curseur est replacé grâce aux
//   positions relatives de Yjs (il suit le texte où il était).
import * as Y from 'yjs';

export type Splice = { index: number; remove: number; insert: string };
export type Selection = { start: number; end: number };

/** Origines des transactions Yjs : ce qui vient de ce champ, ou d'un autre appareil. */
export const LOCAL = 'local';
export const REMOTE = 'remote';

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;

/**
 * Plus petite opération qui transforme `before` en `after`, sans jamais couper un émoji
 * (paire de caractères UTF-16). Renvoie null si rien n'a changé.
 */
export function diffText(before: string, after: string): Splice | null {
  if (before === after) return null;
  const max = Math.min(before.length, after.length);
  let start = 0;
  while (start < max && before.charCodeAt(start) === after.charCodeAt(start)) start++;
  if (start > 0 && isHigh(before.charCodeAt(start - 1))) start--;
  let endB = before.length;
  let endA = after.length;
  while (endB > start && endA > start && before.charCodeAt(endB - 1) === after.charCodeAt(endA - 1)) {
    endB--;
    endA--;
  }
  if (endB < before.length && endB > start && isLow(before.charCodeAt(endB))) {
    endB++;
    endA++;
  }
  return { index: start, remove: endB - start, insert: after.slice(start, endA) };
}

export function applySplice(text: string, s: Splice): string {
  return text.slice(0, s.index) + s.insert + text.slice(s.index + s.remove);
}

/**
 * Un champ de saisie relié à un texte Yjs. Le champ appelle `local()` à chaque changement et
 * `select()` à chaque déplacement du curseur ; les modifications reçues passent par `applyRemote()`.
 */
export class TextBinding {
  readonly doc: Y.Doc;
  readonly ytext: Y.Text;
  text: string;
  selection: Selection = { start: 0, end: 0 };

  constructor(doc: Y.Doc = new Y.Doc(), field = 'body') {
    this.doc = doc;
    this.ytext = doc.getText(field);
    this.text = this.ytext.toString();
  }

  /** Le champ a changé (frappe, collage, effacement) : une seule opération Yjs. */
  local(next: string): Splice | null {
    const splice = diffText(this.text, next);
    if (!splice) return null;
    this.doc.transact(() => {
      if (splice.remove > 0) this.ytext.delete(splice.index, splice.remove);
      if (splice.insert) this.ytext.insert(splice.index, splice.insert);
    }, LOCAL);
    this.text = next;
    const end = splice.index + splice.insert.length;
    this.selection = { start: end, end };
    return splice;
  }

  select(sel: Selection) {
    this.selection = sel;
  }

  /**
   * Applique une modification venue d'un autre appareil. Le curseur est attaché au caractère
   * à sa gauche (association -1) : il reste juste après ce qu'on vient de taper.
   */
  applyRemote(update: Uint8Array): { text: string; selection: Selection } {
    const relStart = Y.createRelativePositionFromTypeIndex(this.ytext, this.selection.start, -1);
    const relEnd = Y.createRelativePositionFromTypeIndex(this.ytext, this.selection.end, -1);
    Y.applyUpdate(this.doc, update, REMOTE);
    this.text = this.ytext.toString();
    const start = Y.createAbsolutePositionFromRelativePosition(relStart, this.doc)?.index ?? this.selection.start;
    const end = Y.createAbsolutePositionFromRelativePosition(relEnd, this.doc)?.index ?? this.selection.end;
    this.selection = { start: Math.min(start, this.text.length), end: Math.min(end, this.text.length) };
    return { text: this.text, selection: this.selection };
  }

  /** Abonnement aux modifications locales à envoyer (au relais, ou au faux appareil du banc). */
  onLocalUpdate(listener: (update: Uint8Array) => void): () => void {
    const handler = (update: Uint8Array, origin: unknown) => {
      if (origin === LOCAL) listener(update);
    };
    this.doc.on('update', handler);
    return () => this.doc.off('update', handler);
  }
}

/**
 * Faux deuxième appareil, dans la mémoire du téléphone (aucun réseau) : il reçoit les
 * modifications du champ et insère de temps en temps un mot fictif, au début d'un mot.
 */
export class FakePeer {
  readonly doc = new Y.Doc();
  private readonly ytext = this.doc.getText('body');

  constructor(initial?: Uint8Array) {
    if (initial) Y.applyUpdate(this.doc, initial, REMOTE);
  }

  receive(update: Uint8Array) {
    Y.applyUpdate(this.doc, update, REMOTE);
  }

  get text(): string {
    return this.ytext.toString();
  }

  /** Insère `word` au début du mot le plus proche de `at` ; renvoie la modification à envoyer. */
  insertWord(word: string, at: number): { update: Uint8Array; index: number; length: number } {
    const text = this.ytext.toString();
    let i = Math.max(0, Math.min(at, text.length));
    while (i > 0 && !/\s/.test(text[i - 1])) i--;
    let update: Uint8Array | null = null;
    const handler = (u: Uint8Array) => {
      update = u;
    };
    this.doc.on('update', handler);
    const inserted = `${word} `;
    this.ytext.insert(i, inserted);
    this.doc.off('update', handler);
    return { update: update!, index: i, length: inserted.length };
  }
}
