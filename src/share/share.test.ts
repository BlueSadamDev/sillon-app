// Partage simple (F10, lot 2.1) : contenu partagé, Markdown et page HTML du PDF, sur notes fictives.
import { FAKE_NOTES } from '@/notes/__fixtures__/notes';
import type { Note } from '@/notes/types';

import { collectShared, plainLinks, shareableChildCount, sharedFileName, sharedMarkdown } from './content';
import { A4, bodyHtml, escapeHtml, sharedHtml } from './html';

const UNTITLED = 'Sans titre';
const FONTS = { regular: 'UkVHVUxBUg==', bold: 'Qk9MRA==' };

function note(id: string, title: string, body: string, extra: Partial<Note> = {}): Note {
  return {
    id,
    title,
    body,
    parentId: null,
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    archivedAt: null,
    authorId: 'auteur-fictif',
    deviceId: 'appareil-fictif',
    ...extra,
  };
}

// Carnet fictif : « Jardin » contient « Tomates » (qui contient « Semis ») et « Arrosage » (archivée) ;
// « Outils » est à la corbeille ; « Voyage à Lisbonne » est ailleurs.
const notes: Note[] = [
  note('jardin', FAKE_NOTES.jardin.title, FAKE_NOTES.jardin.body),
  note('tomates', FAKE_NOTES.tomates.title, FAKE_NOTES.tomates.body, { parentId: 'jardin' }),
  note('semis', 'Semis', 'Voir [[Tomates]] et [[ Jardin ]].', { parentId: 'tomates' }),
  note('arrosage', 'Arrosage', 'Le soir.', { parentId: 'jardin', archivedAt: 5 }),
  note('outils', 'Outils', 'Bêche.', { parentId: 'jardin', deletedAt: 5 }),
  note('voyage', FAKE_NOTES.voyage.title, FAKE_NOTES.voyage.body),
];

describe('liens [[ ]] en texte simple', () => {
  it('garde le titre et retire les crochets', () => {
    expect(plainLinks(FAKE_NOTES.jardin.body)).toBe(
      'Semer les radis en mars. Penser à Voyage à Lisbonne pour l’arrosage. #jardin',
    );
    expect(plainLinks('[[ A ]] puis [[B]]')).toBe('A puis B');
  });

  it('ne touche pas aux blocs de code', () => {
    expect(plainLinks('```\n[[Code]]\n```\n[[Texte]]')).toBe('```\n[[Code]]\n```\nTexte');
  });
});

describe('notes partagées', () => {
  it('la note seule', () => {
    const list = collectShared('jardin', notes, false);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ title: 'Jardin', body: plainLinks(FAKE_NOTES.jardin.body), depth: 0 });
  });

  it('avec les sous-notes : ordre de Pages, toutes profondeurs, sans la corbeille, archives comprises', () => {
    const list = collectShared('jardin', notes, true);
    expect(list.map((n) => [n.title, n.depth])).toEqual([
      ['Jardin', 0],
      ['Arrosage', 1],
      ['Tomates', 1],
      ['Semis', 2],
    ]);
    expect(list.find((n) => n.title === 'Semis')!.body).toBe('Voir Tomates et Jardin.');
    expect(shareableChildCount('jardin', notes)).toBe(3);
    expect(shareableChildCount('voyage', notes)).toBe(0);
  });

  it('une sous-note partagée seule ne prend pas ses voisines', () => {
    expect(collectShared('tomates', notes, true).map((n) => n.title)).toEqual(['Tomates', 'Semis']);
  });

  it('note inconnue : rien', () => {
    expect(collectShared('absente', notes, true)).toEqual([]);
  });

  it("n'envoie ni identifiant d'auteur, ni appareil, ni dates", () => {
    const md = sharedMarkdown(collectShared('jardin', notes, true), UNTITLED);
    const html = sharedHtml(collectShared('jardin', notes, true), UNTITLED, FONTS);
    for (const out of [md, html]) {
      expect(out).not.toContain('auteur-fictif');
      expect(out).not.toContain('appareil-fictif');
      expect(out).not.toContain('Bêche');
    }
  });
});

describe('texte et fichier Markdown', () => {
  it('une note : titre puis contenu', () => {
    expect(sharedMarkdown(collectShared('voyage', notes, false), UNTITLED)).toBe(
      `# Voyage à Lisbonne\n\n${FAKE_NOTES.voyage.body}\n`,
    );
  });

  it('sous-notes à la suite, séparées par un trait', () => {
    const md = sharedMarkdown(collectShared('tomates', notes, true), UNTITLED);
    expect(md).toBe(`# Tomates\n\n${FAKE_NOTES.tomates.body}\n\n---\n\n# Semis\n\nVoir Tomates et Jardin.\n`);
  });

  it('note sans titre ni contenu', () => {
    expect(sharedMarkdown([{ title: '', body: '', depth: 0 }], UNTITLED)).toBe('# Sans titre\n');
  });

  it('nom du fichier : le titre nettoyé', () => {
    expect(sharedFileName('Voyage à Lisbonne', UNTITLED, 'pdf')).toBe('Voyage à Lisbonne.pdf');
    expect(sharedFileName('Plan: A/B ?', UNTITLED, 'md')).toBe('Plan A B.md');
    expect(sharedFileName('  ', UNTITLED, 'md')).toBe('Sans titre.md');
  });
});

describe('page HTML du PDF', () => {
  it('reprend la mise en forme : titres, cases, citation', () => {
    const html = bodyHtml(FAKE_NOTES.voyage.body + '\n\n' + FAKE_NOTES.lecture.body);
    expect(html).toContain('<h1>Idées</h1>');
    expect(html).toContain('<li class="task"><span class="box"></span>');
    expect(html).toContain('<li class="task done"><span class="box on"></span>');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('<input');
  });

  it('le HTML écrit dans une note reste du texte, et aucune image n’est chargée', () => {
    const html = bodyHtml(
      'Avant <img src="https://exemple.invalid/x.png"> après\n\n<script>alert(1)</script>\n\n![Photo du potager](https://exemple.invalid/p.jpg)',
    );
    expect(html).not.toMatch(/<img|<script/i);
    expect(html).toContain('&lt;img src=&quot;https://exemple.invalid/x.png&quot;&gt;');
    expect(html).toContain('Photo du potager');
  });

  it('page complète : police intégrée, titres des notes, rien à charger en ligne', () => {
    const html = sharedHtml(collectShared('tomates', notes, true), UNTITLED, FONTS);
    expect(html).toContain(`url(data:font/ttf;base64,${FONTS.regular})`);
    expect(html).toContain(`url(data:font/ttf;base64,${FONTS.bold})`);
    expect(html).toContain('<h1 class="note">Tomates</h1>');
    expect(html).toContain('<h2 class="note">Semis</h2>');
    expect(html).toContain('<title>Tomates</title>');
    expect(html).not.toMatch(/(src|href)="https?:/);
    expect(html).not.toMatch(/url\((?!data:)/);
  });

  it('titre avec caractères spéciaux échappé', () => {
    const html = sharedHtml([{ title: 'A < B & "C"', body: '', depth: 0 }], UNTITLED, FONTS);
    expect(html).toContain(`<h1 class="note">${escapeHtml('A < B & "C"')}</h1>`);
    expect(html).toContain('A &lt; B &amp; &quot;C&quot;');
  });

  it('format A4', () => {
    expect(A4).toEqual({ width: 595, height: 842 });
  });
});
