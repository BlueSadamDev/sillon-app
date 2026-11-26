// Tests du branchement de l'éditeur sur Yjs (lot 7.0), sur des textes fictifs uniquement.
import * as Y from 'yjs';

import { applySplice, diffText, FakePeer, TextBinding } from './yjsBinding';
import { seededRandom, simulateTyping } from './yjsBench';

describe('diffText', () => {
  it('trouve la plus petite opération', () => {
    expect(diffText('bonjour', 'bonjour')).toBeNull();
    expect(diffText('bonjour', 'bonsoir')).toEqual({ index: 3, remove: 3, insert: 'soi' });
    expect(diffText('abc', 'abxc')).toEqual({ index: 2, remove: 0, insert: 'x' });
    expect(diffText('abc', 'ac')).toEqual({ index: 1, remove: 1, insert: '' });
    expect(diffText('', 'texte')).toEqual({ index: 0, remove: 0, insert: 'texte' });
  });

  it('ne coupe jamais un émoji', () => {
    const s = diffText('a😀b', 'a😃b')!;
    expect(s.insert).toBe('😃');
    expect(s.remove).toBe(2);
  });

  it('retrouve toujours le nouveau texte (essais au hasard)', () => {
    const rnd = seededRandom(42);
    const alphabet = 'ab 😀é\n';
    const randomText = () => Array.from({ length: Math.floor(rnd() * 12) }, () => [...alphabet][Math.floor(rnd() * 6)]).join('');
    for (let i = 0; i < 2000; i++) {
      const a = randomText();
      const b = randomText();
      const s = diffText(a, b);
      expect(s ? applySplice(a, s) : a).toBe(b);
    }
  });
});

describe('TextBinding', () => {
  it('garde Yjs et le champ identiques', () => {
    const b = new TextBinding();
    b.local('Liste de courses fictive');
    b.local('Liste de courses fictive : pommes');
    b.local('Liste fictive : pommes');
    expect(b.ytext.toString()).toBe('Liste fictive : pommes');
  });

  it('replace le curseur après une insertion reçue', () => {
    const b = new TextBinding();
    b.local('un deux trois');
    const peer = new FakePeer(Y.encodeStateAsUpdate(b.doc));
    b.select({ start: 7, end: 7 }); // après « deux »
    const before = peer.insertWord('zéro', 0);
    const res = b.applyRemote(before.update);
    expect(res.text).toBe('zéro un deux trois');
    expect(res.selection).toEqual({ start: 12, end: 12 });
    const after = peer.insertWord('fin', 18);
    expect(b.applyRemote(after.update).selection).toEqual({ start: 12, end: 12 });
  });

  it('fusionne deux appareils qui écrivent hors connexion', () => {
    const a = new TextBinding();
    a.local('Idée fictive.');
    const b = new TextBinding();
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    b.text = b.ytext.toString();
    a.local('Idée fictive. Première suite.');
    b.local('Grande idée fictive.');
    const fromA = Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc));
    const fromB = Y.encodeStateAsUpdate(b.doc, Y.encodeStateVector(a.doc));
    a.applyRemote(fromB);
    b.applyRemote(fromA);
    expect(a.text).toBe(b.text);
    expect(a.text).toBe('Grande idée fictive. Première suite.');
  });
});

describe('simulateTyping', () => {
  it('converge et garde le curseur', () => {
    const r = simulateTyping(10_000, 500, 25);
    expect(r.converged).toBe(true);
    expect(r.cursorKept).toBe(true);
    expect(r.ops).toBeGreaterThan(400);
  });
});
