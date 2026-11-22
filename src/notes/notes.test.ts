import { splitCapture } from './capture';
import { uuidFromBytes } from './id';
import { excerpt, highlight, normalize, plainText, searchTerms, toFtsQuery } from './search';
import { extractTags } from './tags';
import { daysLeft, purgeCutoff } from './trash';
import { buildTree, canMove, descendantIds, pathOf } from './tree';

describe('tags', () => {
  it('trouve les #mots, en minuscules, sans doublon', () => {
    expect(extractTags('Idée #Voyage et #été, encore #voyage.')).toEqual(['été', 'voyage']);
  });
  it('ignore les titres, les « # » collés à un mot et le code', () => {
    expect(extractTags('# Titre\n## Sous-titre\nC# et page#ancre `#code`\n```\n#bloc\n```\n(#ok)')).toEqual(['ok']);
  });
});

describe('capture rapide', () => {
  it('une ligne : enregistrée directement', () => {
    expect(splitCapture('  Acheter du pain  ')).toEqual({ title: 'Acheter du pain', body: '', openEditor: false });
  });
  it('plusieurs lignes : titre, contenu, ouverture de l’éditeur', () => {
    expect(splitCapture('Idée\n\nUn paragraphe\nsuite')).toEqual({
      title: 'Idée',
      body: 'Un paragraphe\nsuite',
      openEditor: true,
    });
  });
  it('texte vide : rien', () => {
    expect(splitCapture('  \n ')).toBeNull();
  });
});

describe('identifiant', () => {
  it('fabrique un UUID version 4', () => {
    const id = uuidFromBytes(new Uint8Array(16).fill(255));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('arborescence', () => {
  const notes = [
    { id: 'a', title: 'Maison', parentId: null },
    { id: 'b', title: 'Jardin', parentId: 'a' },
    { id: 'c', title: 'Tomates', parentId: 'b' },
    { id: 'd', title: 'Cuisine', parentId: 'a' },
    { id: 'e', title: 'Orpheline', parentId: 'disparue' },
  ];
  it('range les sous-notes par ordre alphabétique, les orphelines à la racine', () => {
    const tree = buildTree(notes);
    expect(tree.map((n) => n.note.id)).toEqual(['a', 'e']);
    expect(tree[0].children.map((n) => n.note.title)).toEqual(['Cuisine', 'Jardin']);
  });
  it('liste toutes les sous-notes', () => {
    expect(descendantIds('a', notes).sort()).toEqual(['b', 'c', 'd']);
  });
  it('refuse de ranger une note dans elle-même ou une de ses sous-notes', () => {
    expect(canMove('a', 'c', notes)).toBe(false);
    expect(canMove('a', 'a', notes)).toBe(false);
    expect(canMove('c', 'd', notes)).toBe(true);
    expect(canMove('c', null, notes)).toBe(true);
  });
  it('donne le chemin d’une note', () => {
    expect(pathOf('c', notes).map((n) => n.title)).toEqual(['Maison', 'Jardin', 'Tomates']);
  });
});

describe('corbeille', () => {
  const DAY = 86_400_000;
  it('garde les notes 30 jours', () => {
    expect(purgeCutoff(100 * DAY)).toBe(70 * DAY);
    expect(daysLeft(0, 0)).toBe(30);
    expect(daysLeft(0, 29.5 * DAY)).toBe(1);
    expect(daysLeft(0, 40 * DAY)).toBe(0);
  });
});

describe('recherche', () => {
  it('ignore accents et majuscules', () => {
    expect(normalize('Été À')).toBe('ete a');
    expect(searchTerms('  Été, ÉTÉ lisb ')).toEqual(['ete', 'lisb']);
  });
  it('prépare une requête sans caractère spécial', () => {
    expect(toFtsQuery('lisb "été" OR')).toBe('"lisb"* "ete"* "or"*');
    expect(toFtsQuery(' ?! ')).toBeNull();
  });
  it('met en relief les débuts de mots trouvés', () => {
    expect(highlight('Un été à Lisbonne', ['ete', 'lisb'])).toEqual([
      { text: 'Un ', match: false },
      { text: 'été', match: true },
      { text: ' à ', match: false },
      { text: 'Lisb', match: true },
      { text: 'onne', match: false },
    ]);
    expect(highlight('arrêter', ['ete'])).toEqual([{ text: 'arrêter', match: false }]);
  });
  it('retire les signes Markdown des extraits', () => {
    expect(plainText('# Titre\n- [ ] **tâche** [[Note]]\n> cité')).toBe('Titre tâche Note cité');
  });
  it('centre l’extrait sur le mot trouvé', () => {
    const long = 'début '.repeat(40) + 'Lisbonne ' + 'fin '.repeat(40);
    const out = excerpt(long, ['lisb'], 60);
    expect(out.startsWith('…')).toBe(true);
    expect(out).toContain('Lisbonne');
  });
});
