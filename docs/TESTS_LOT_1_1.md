# Tests du lot 1.1 sur le Samsung S21

APK utilisé : **APK de production** (s'installe par-dessus Sillon et garde les notes).
Faire les essais sur une note de test (par exemple « Essai »), puis la mettre à la corbeille.
Renvoyer seulement « oui / non » et les messages affichés, jamais le contenu de vraies notes.

## Liste à cocher

- [ ] **1. Boutons.** Ouvrir une note en mode écriture : « Enregistrer » est dans la barre au-dessus du
  clavier, à droite ; « Lire » est en haut, dans l'en-tête. Toucher « Lire » : la barre du bas disparaît,
  le bouton du haut devient « Écrire ». « Enregistrer » enregistre et revient à l'écran précédent.
- [ ] **2. Cases en mode écriture.** Sur une ligne « pain », toucher le bouton « Case à cocher » : la ligne
  devient `- [ ] pain`. Le toucher encore : `- [x] pain`. Encore : `- [ ] pain`.
- [ ] **3. Cases en mode lecture.** Passer en mode lecture et toucher la case : elle se coche (carré plein
  avec une coche). Toucher à côté de la case (à un doigt près) marche aussi. Revenir en mode écriture : le
  texte montre `- [x] pain`. Quitter la note et la rouvrir : la case est toujours cochée.
  Vérifier aussi l'alignement : la case est sur la même ligne que son texte, les lignes ne sont pas
  plus espacées qu'avant.
- [ ] **4. Copier en mode écriture.** Appui long sur un mot : la sélection apparaît avec le menu
  « Copier ». Copier, puis coller ailleurs (par exemple dans la capture rapide) : le texte arrive.
  Essayer aussi juste après avoir utilisé un bouton de la barre d'outils.
- [ ] **5. Copier en mode lecture.** Appui long sur un paragraphe : le menu « Copier » apparaît.
- [ ] **6. Copier tout le texte.** Menu « … » > « Copier tout le texte » : message « Texte de la note
  copié. » ; coller ailleurs : le titre (avec « # ») puis le texte en Markdown.
- [ ] **7. « + » avec un champ vide.** Sur l'accueil, sans rien taper, toucher « + » : une note vide
  s'ouvre en mode écriture, le curseur dans le titre. Revenir sans rien écrire : aucune note vide ne reste
  dans les récentes.
- [ ] **8. Brouillon gardé.** Taper un texte dans la capture rapide sans valider, puis :
  a) ouvrir une note et revenir ; b) fermer Sillon (balayer dans les apps récentes) et le rouvrir.
  Le texte est toujours là. Toucher « + » : la note est créée et le champ se vide ; fermer et rouvrir
  Sillon : le champ reste vide.

## Ce qu'il faut me renvoyer

Pour chaque point : **oui / non**, et en cas de « non » ce qui se passe (message mot pour mot, ou ce
qu'on voit à l'écran).
