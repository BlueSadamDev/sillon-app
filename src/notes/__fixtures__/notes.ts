// Notes fictives pour les tests (jamais de vraies notes dans le dépôt).

export const FAKE_NOTES = {
  voyage: {
    title: 'Voyage à Lisbonne',
    body: '# Idées\n- [ ] Réserver le train\n- [x] Choisir le quartier\n\nVisiter le musée des azulejos. #voyage #été',
  },
  jardin: {
    title: 'Jardin',
    body: 'Semer les radis en mars. Penser à [[Voyage à Lisbonne]] pour l’arrosage. #jardin',
  },
  tomates: {
    title: 'Tomates',
    body: 'Variétés anciennes : cœur de bœuf, noire de Crimée. #jardin #potager',
  },
  lecture: {
    title: 'Lecture du soir',
    body: '> Une citation fictive pour les tests.\n\nLivre sur le sommeil, chapitre 3.',
  },
} as const;
