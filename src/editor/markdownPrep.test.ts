import {
  noteTitleFromHref,
  prepareMarkdown,
  TASK_DONE,
  TASK_OPEN,
  taskLineFromHref,
  toggleTaskAt,
} from './markdownPrep';

describe('préparation du Markdown', () => {
  it('transforme les cases à cocher', () => {
    expect(prepareMarkdown('- [ ] semer\n- [x] arroser\n* [X] fini')).toBe(
      `- ![${TASK_OPEN}](sillontask:0) semer\n- ![${TASK_DONE}](sillontask:1) arroser\n* ![${TASK_DONE}](sillontask:2) fini`,
    );
    expect(taskLineFromHref('sillontask:2')).toBe(2);
    expect(taskLineFromHref('sillontask:abc')).toBeNull();
    expect(taskLineFromHref('https://example.org/a.png')).toBeNull();
  });

  it('coche et décoche une case par son numéro de ligne', () => {
    const src = '# Courses\n- [ ] pain\n  - [x] farine\n1. [ ] lait\ntexte';
    expect(toggleTaskAt(src, 1)).toBe('# Courses\n- [x] pain\n  - [x] farine\n1. [ ] lait\ntexte');
    expect(toggleTaskAt(src, 2)).toBe('# Courses\n- [ ] pain\n  - [ ] farine\n1. [ ] lait\ntexte');
    expect(toggleTaskAt(src, 3)).toBe('# Courses\n- [ ] pain\n  - [x] farine\n1. [x] lait\ntexte');
    expect(toggleTaskAt(toggleTaskAt(src, 1), 1)).toBe(src);
    // Ligne sans case, hors du texte, ou dans un bloc de code : rien ne change.
    expect(toggleTaskAt(src, 0)).toBe(src);
    expect(toggleTaskAt(src, 9)).toBe(src);
    expect(toggleTaskAt('```\n- [ ] code\n```', 1)).toBe('```\n- [ ] code\n```');
  });

  it('transforme les liens [[ ]] et les relit', () => {
    const out = prepareMarkdown('Voir [[Idées pour Lisbonne]] et [[Plan]].');
    expect(out).toBe('Voir [Idées pour Lisbonne](sillonnote:Id%C3%A9es%20pour%20Lisbonne) et [Plan](sillonnote:Plan).');
    expect(noteTitleFromHref('sillonnote:Id%C3%A9es%20pour%20Lisbonne')).toBe('Idées pour Lisbonne');
    expect(noteTitleFromHref('https://example.org')).toBeNull();
  });

  it('ne touche pas aux blocs de code ni au texte ordinaire', () => {
    const src = '```\n- [ ] code\n[[pas un lien]]\n```\nTexte [simple](a) et [ ] crochets.';
    expect(prepareMarkdown(src)).toBe(src);
  });
});
