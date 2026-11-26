// Texte Markdown fictif (aucune vraie note), de la longueur voulue, toujours le même.
const PARAGRAPHS = [
  '## Carnet du potager imaginaire',
  'Les tomates cerises du rang trois ont rougi plus tôt que prévu. Penser à tuteurer les plants les plus hauts avant le vent de la semaine.',
  '- [ ] arroser les courges le soir\n- [x] semer les radis\n- [ ] commander du paillage #jardin',
  'Idée : un tableau des semis par mois, avec la date de levée et une note sur la météo. Voir aussi [[Calendrier lunaire fictif]].',
  '> Une phrase recopiée d’un livre inventé : le jardin se fait autant avec les mains qu’avec la patience.',
  'Liste de lecture fictive : trois romans, un essai sur les abeilles, un guide des champignons de la forêt voisine.',
];

export function makeFakeText(length: number): string {
  let out = '';
  let i = 0;
  while (out.length < length) {
    out += PARAGRAPHS[i % PARAGRAPHS.length] + '\n\n';
    i++;
  }
  return out.slice(0, length);
}

/** Mots que le faux deuxième appareil insère (fictifs). */
export const REMOTE_WORDS = ['lavande', 'brouette', 'citrouille', 'arrosoir', 'compost', 'mésange'];
