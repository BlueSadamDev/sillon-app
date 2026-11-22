import { applyAction, continueList } from './format';

const at = (n: number) => ({ start: n, end: n });

describe('barre d’outils', () => {
  it('gras : entoure la sélection, puis la libère', () => {
    const once = applyAction('bold', 'un mot ici', { start: 3, end: 6 });
    expect(once).toEqual({ text: 'un **mot** ici', selection: { start: 5, end: 8 } });
    expect(applyAction('bold', once.text, once.selection)).toEqual({ text: 'un mot ici', selection: { start: 3, end: 6 } });
  });
  it('italique sans sélection : place le curseur entre les deux signes', () => {
    expect(applyAction('italic', 'ab', at(1))).toEqual({ text: 'a**b', selection: at(2) });
  });
  it('titre : # puis ## puis rien', () => {
    const one = applyAction('heading', 'Idée\nsuite', at(2));
    expect(one.text).toBe('# Idée\nsuite');
    expect(one.selection).toEqual(at(4));
    const two = applyAction('heading', one.text, one.selection);
    expect(two.text).toBe('## Idée\nsuite');
    expect(applyAction('heading', two.text, two.selection).text).toBe('Idée\nsuite');
  });
  it('liste : ajoute des puces aux lignes choisies, puis les retire', () => {
    const on = applyAction('list', 'a\nb\nc', { start: 0, end: 3 });
    expect(on.text).toBe('- a\n- b\nc');
    expect(applyAction('list', on.text, on.selection).text).toBe('a\nb\nc');
  });
  it('case à cocher : transforme une puce, puis retire la case', () => {
    const on = applyAction('task', '- pain', at(6));
    expect(on.text).toBe('- [ ] pain');
    expect(applyAction('task', on.text, on.selection).text).toBe('pain');
  });
  it('lien vers une note : [[ ]] autour de la sélection', () => {
    expect(applyAction('link', 'voir Jardin', { start: 5, end: 11 })).toEqual({
      text: 'voir [[Jardin]]',
      selection: { start: 7, end: 13 },
    });
  });
});

describe('retour à la ligne dans une liste', () => {
  it('continue la puce, la case (décochée) ou le numéro', () => {
    expect(continueList('- pain', '- pain\n')).toEqual({ text: '- pain\n- ', selection: at(9) });
    expect(continueList('- [x] fait', '- [x] fait\n')?.text).toBe('- [x] fait\n- [ ] ');
    expect(continueList('1. un', '1. un\n')?.text).toBe('1. un\n2. ');
  });
  it('sort de la liste sur une puce vide', () => {
    expect(continueList('- a\n- ', '- a\n- \n')).toEqual({ text: '- a\n', selection: at(4) });
  });
  it('ne fait rien hors d’une liste', () => {
    expect(continueList('texte', 'texte\n')).toBeNull();
    expect(continueList('- a', '- ab')).toBeNull();
  });
});
