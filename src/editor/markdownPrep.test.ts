import { noteTitleFromHref, prepareMarkdown, TASK_DONE, TASK_OPEN } from './markdownPrep';

describe('préparation du Markdown', () => {
  it('transforme les cases à cocher', () => {
    expect(prepareMarkdown('- [ ] semer\n- [x] arroser\n* [X] fini')).toBe(
      `- \`${TASK_OPEN}\` semer\n- \`${TASK_DONE}\` arroser\n* \`${TASK_DONE}\` fini`,
    );
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
