// Notes FICTIVES pour le banc d'essai des embeddings (aucune vraie note).
// Chaque question de test a une seule « bonne » note, formulée avec d'autres mots
// que la note elle-même, pour tester le sens et pas seulement les mots communs.

export type FixtureNote = { id: string; title: string; body: string };
export type FixtureQuery = { text: string; expectedId: string };

export const FIXTURE_NOTES: FixtureNote[] = [
  {
    id: 'sommeil',
    title: 'Mes nuits cette semaine',
    body: "Couché tard trois soirs de suite à cause des écrans. Réveils fréquents vers 4 h. Essayer de couper le téléphone à 22 h et de garder la chambre fraîche. Le café après 15 h semble aggraver les choses.",
  },
  {
    id: 'course',
    title: 'Plan d’entraînement',
    body: "Objectif : boucler 21 km en avril. Trois sorties par semaine : une longue le dimanche, du fractionné le mardi, un footing lent le jeudi. Penser à changer les chaussures après 800 km.",
  },
  {
    id: 'recette',
    title: 'Curry de lentilles corail',
    body: "Faire revenir oignon, ail et gingembre. Ajouter 200 g de lentilles corail, une boîte de lait de coco, du curry et du cumin. Laisser mijoter 20 minutes. Servir avec du riz basmati et de la coriandre.",
  },
  {
    id: 'jardin',
    title: 'Potager au printemps',
    body: "Semer les tomates en godets fin mars, repiquer en mai après les gelées. Prévoir des courgettes, du basilic et des radis. Installer un récupérateur d'eau de pluie près de l'abri.",
  },
  {
    id: 'lecture',
    title: 'Livre en cours',
    body: "Roman sur une famille de pêcheurs bretons sur trois générations. J'aime la façon dont l'auteur décrit la mer et le silence entre les personnages. Noter les passages sur la transmission.",
  },
  {
    id: 'travail',
    title: 'Réunion projet Atlas',
    body: "Point d'équipe : le prototype est en retard de deux semaines. Décision : réduire le périmètre de la première version et livrer l'export PDF plus tard. Prochain point jeudi avec la cliente fictive.",
  },
  {
    id: 'voyage',
    title: 'Idées pour Lisbonne',
    body: "Quatre jours en octobre. Quartier de l'Alfama, tram 28, pastéis de nata à Belém, coucher de soleil au miradouro. Réserver le logement près de la place du Commerce.",
  },
  {
    id: 'budget',
    title: 'Comptes de novembre',
    body: "Loyer, électricité et abonnements : 1 050 euros. Courses en hausse ce mois-ci. Résilier l'abonnement de streaming inutilisé et mettre 150 euros de côté pour les fêtes.",
  },
  {
    id: 'meditation',
    title: 'Respiration du matin',
    body: "Dix minutes assis avant le petit-déjeuner. Inspirer sur quatre temps, retenir quatre temps, expirer sur six. Les pensées partent souvent vers le travail : les laisser passer sans les juger.",
  },
  {
    id: 'guitare',
    title: 'Apprendre la guitare',
    body: "Travailler les accords de do, sol, ré et mi mineur. Passer d'un accord à l'autre sans regarder la main. Quinze minutes par jour valent mieux qu'une heure le dimanche. Morceau visé : une ballade folk simple.",
  },
];

export const FIXTURE_QUERIES: FixtureQuery[] = [
  { text: 'Comment mieux dormir ?', expectedId: 'sommeil' },
  { text: 'Préparer un semi-marathon', expectedId: 'course' },
  { text: 'Un plat végétarien à cuisiner ce soir', expectedId: 'recette' },
  { text: 'Quels légumes planter cette année', expectedId: 'jardin' },
  { text: 'Partir quelques jours au Portugal', expectedId: 'voyage' },
  { text: 'Faire des économies sur les dépenses', expectedId: 'budget' },
  { text: 'Se calmer et gérer le stress', expectedId: 'meditation' },
  { text: 'Progresser en musique', expectedId: 'guitare' },
  { text: 'Le retard du projet et les décisions prises', expectedId: 'travail' },
  { text: 'Un roman sur la mer', expectedId: 'lecture' },
];
