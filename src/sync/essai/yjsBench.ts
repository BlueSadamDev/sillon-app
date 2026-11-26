// Lot 7.0 (banc d'essai) : mesures de Yjs sur des textes fictifs, sans écran.
// Utilisé par l'écran « Yjs et éditeur » et par les tests sur l'ordinateur.
import * as Y from 'yjs';

import { FakePeer, TextBinding } from './yjsBinding';
import { REMOTE_WORDS, makeFakeText } from './__fixtures__/fakeText';

export type Stats = { p50: number; p95: number; max: number; mean: number };

export function stats(values: number[]): Stats {
  if (values.length === 0) return { p50: 0, p95: 0, max: 0, mean: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { p50: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1], mean: values.reduce((a, b) => a + b, 0) / values.length };
}

/** Générateur pseudo-aléatoire reproductible (mêmes essais à chaque fois). */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = () => performance.now();

/** Durée d'un calcul, en millisecondes. */
export function timed(fn: () => void): number {
  const t0 = now();
  fn();
  return now() - t0;
}

export type TypingResult = {
  size: number;
  ops: number;
  /** Temps par frappe : comparaison des deux textes + opération Yjs (ms). */
  keystroke: Stats;
  /** Temps d'application d'une modification reçue, curseur compris (ms). */
  remote: Stats;
  /** Taille moyenne d'une modification locale encodée (octets). */
  updateBytes: number;
  /** Chargement du texte initial dans Yjs (ms). */
  loadMs: number;
  /** État Yjs complet après les frappes (octets) et texte final (caractères). */
  stateBytes: number;
  textLength: number;
  /** Encodage et relecture de l'état complet (ms). */
  encodeMs: number;
  decodeMs: number;
  /** Les deux appareils ont-ils le même texte à la fin ? */
  converged: boolean;
  /** Le curseur est-il toujours resté sur le même caractère après une insertion reçue ? */
  cursorKept: boolean;
};

/**
 * Simule `ops` frappes sur un texte fictif de `size` caractères : surtout des lettres tapées au
 * curseur, quelques effacements, déplacements et collages, et une insertion du faux appareil
 * toutes les `remoteEvery` frappes.
 */
export function simulateTyping(size: number, ops = 2000, remoteEvery = 50, seed = 1): TypingResult {
  const rnd = seededRandom(seed);
  const binding = new TextBinding();
  const t0 = now();
  binding.local(makeFakeText(size));
  const loadMs = now() - t0;
  const peer = new FakePeer(Y.encodeStateAsUpdate(binding.doc));
  const outgoing: Uint8Array[] = [];
  const stop = binding.onLocalUpdate((u) => outgoing.push(u));
  outgoing.length = 0;

  let cursor = Math.floor(binding.text.length / 2);
  binding.select({ start: cursor, end: cursor });
  const keyTimes: number[] = [];
  const remoteTimes: number[] = [];
  let updateBytes = 0;
  let updates = 0;
  let cursorKept = true;
  const letters = 'abcdefghijklmnopqrstuvwxyzéèà ';

  for (let i = 0; i < ops; i++) {
    const r = rnd();
    const text = binding.text;
    let next: string;
    if (r < 0.85) {
      const ch = letters[Math.floor(rnd() * letters.length)];
      next = text.slice(0, cursor) + ch + text.slice(cursor);
      cursor += 1;
    } else if (r < 0.95) {
      if (cursor === 0) continue;
      next = text.slice(0, cursor - 1) + text.slice(cursor);
      cursor -= 1;
    } else if (r < 0.99) {
      cursor = Math.floor(rnd() * text.length);
      binding.select({ start: cursor, end: cursor });
      continue;
    } else {
      const paste = makeFakeText(200);
      next = text.slice(0, cursor) + paste + text.slice(cursor);
      cursor += paste.length;
    }
    const k0 = now();
    binding.local(next);
    keyTimes.push(now() - k0);
    binding.select({ start: cursor, end: cursor });

    for (const u of outgoing) {
      updateBytes += u.length;
      updates++;
      peer.receive(u);
    }
    outgoing.length = 0;

    if (i % remoteEvery === remoteEvery - 1) {
      const word = REMOTE_WORDS[Math.floor(rnd() * REMOTE_WORDS.length)];
      const ins = peer.insertWord(word, Math.floor(rnd() * binding.text.length));
      // Attendu : le curseur avance si le mot arrive avant lui, ne bouge pas sinon.
      const expected = ins.index < cursor ? cursor + ins.length : cursor;
      const r0 = now();
      const res = binding.applyRemote(ins.update);
      remoteTimes.push(now() - r0);
      if (res.selection.start !== expected) cursorKept = false;
      cursor = res.selection.start;
    }
  }
  stop();

  const e0 = now();
  const state = Y.encodeStateAsUpdate(binding.doc);
  const encodeMs = now() - e0;
  const d0 = now();
  const copy = new Y.Doc();
  Y.applyUpdate(copy, state);
  const copied = copy.getText('body').toString();
  const decodeMs = now() - d0;

  return {
    size,
    ops: keyTimes.length,
    keystroke: stats(keyTimes),
    remote: stats(remoteTimes),
    updateBytes: updates ? updateBytes / updates : 0,
    loadMs,
    stateBytes: state.length,
    textLength: binding.text.length,
    encodeMs,
    decodeMs,
    converged: peer.text === binding.text && copied === binding.text,
    cursorKept,
  };
}

export const ms = (v: number) => (v < 10 ? v.toFixed(2) : v.toFixed(0));

export function describeTyping(r: TypingResult): string[] {
  const k = r.keystroke;
  const rm = r.remote;
  return [
    `Texte de ${r.size} caractères, ${r.ops} frappes :`,
    `  frappe : médiane ${ms(k.p50)} ms, 95 % sous ${ms(k.p95)} ms, pire ${ms(k.max)} ms`,
    `  modification reçue : médiane ${ms(rm.p50)} ms, 95 % sous ${ms(rm.p95)} ms, pire ${ms(rm.max)} ms`,
    `  chargement ${ms(r.loadMs)} ms ; modification envoyée ${r.updateBytes.toFixed(0)} octets en moyenne`,
    `  état Yjs ${(r.stateBytes / 1024).toFixed(0)} Kio pour ${(r.textLength / 1024).toFixed(0)} Kio de texte ; encodage ${ms(r.encodeMs)} ms ; relecture ${ms(r.decodeMs)} ms`,
    `  mêmes textes sur les deux appareils : ${r.converged ? 'oui' : 'NON (problème !)'} ; curseur gardé : ${r.cursorKept ? 'oui' : 'NON (problème !)'}`,
  ];
}

export const BENCH_SIZES = [1_000, 10_000, 50_000, 200_000];
