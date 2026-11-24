# Tests du lot 2.1 sur le Samsung S21

APK utilisé : **APK de production** (s'installe par-dessus Sillon et garde les notes).
Préparer des notes **de test** : une note « Essai partage » avec un titre `# Idées`, une case à cocher
non cochée, une case cochée, une citation `> …`, un lien `[[Essai sous-note]]` et un tag `#essai` ;
dedans, deux sous-notes « Essai sous-note » et « Essai sous-sous-note » (rangée dans la première), et une
troisième sous-note mise à la corbeille. Tout mettre à la corbeille à la fin.
Renvoyer seulement « oui / non » et les messages affichés, jamais le contenu de vraies notes.
Pour essayer sans rien envoyer à personne : partager vers **sa propre adresse mail**, ou vers une app qui
enregistre le fichier sur le téléphone (par exemple « Mes fichiers »), selon ce qui est proposé.

## Liste à cocher

- [x] **1. Menu.** Dans « Essai partage », menu « … » : « Partager » apparaît sous « Copier tout le
  texte ». Le toucher ouvre l'écran « Partager la note » : 3 formats (Texte choisi d'office), la case
  « Inclure les 2 sous-notes » (la sous-note à la corbeille n'est pas comptée), la phrase de rappel et
  le bouton « Partager ».
- [x] **2. Note sans sous-note.** Dans « Essai sous-sous-note », l'écran « Partager la note » n'affiche
  pas la case « Inclure… ».
- [x] **3. Texte.** Format « Texte », case décochée, « Partager » : le menu de partage d'Android
  s'ouvre. Envoyer dans une app de messages ou de mail (à soi-même) : le message commence par
  « # Essai partage », puis le texte en Markdown ; le lien est devenu « Essai sous-note » sans crochets ;
  le tag `#essai` est là.
- [x] **4. Fichier Markdown.** Format « Fichier Markdown » : le fichier s'appelle « Essai partage.md ».
  L'ouvrir (Fichiers, Drive ou une app de notes) : même contenu que le test 3. Noter les apps proposées
  dans le menu de partage (si une app attendue manque, le signaler).
- [x] **5. PDF.** Format « PDF » : le fichier s'appelle « Essai partage.pdf ». L'ouvrir : page A4
  blanche, police Satoshi (celle de l'app), titre en gras, cases dessinées (la cochée pleine, son texte
  barré), citation avec un trait à gauche, aucun bouton ni date. Le temps de préparation est-il
  acceptable (moins de 3 s) ?
- [x] **6. Sous-notes.** Cocher « Inclure les 2 sous-notes », puis partager en Texte, en Markdown et en
  PDF : la note, puis « Essai sous-note », puis « Essai sous-sous-note », à la suite (séparées par un
  trait) ; la sous-note à la corbeille n'apparaît pas.
- [x] **7. Dernière version.** Modifier une ligne de la note, puis tout de suite menu « … » >
  « Partager » > Texte : la modification est bien dans le message.
- [x] **8. Annuler.** Ouvrir le menu de partage puis revenir en arrière sans choisir d'app : retour sur
  l'écran « Partager la note », sans message d'erreur ; le bouton redevient « Partager ».
- [x] **9. Texte très long.** (Facultatif) Partager en Texte une note longue vers une app de SMS : si le
  message est coupé, le noter (le fichier Markdown ou le PDF reste la solution).
- [x] **10. Sans Internet.** Mettre le téléphone en mode avion, refaire le test 5 (PDF) : il fonctionne.
  Dans Paramètres > Applications > Sillon > Autorisations, aucune autorisation « Internet » ni nouvelle
  autorisation n'apparaît.
- [x] **11. Rien d'autre n'a changé.** Une sauvegarde manuelle (« Sauvegarder maintenant ») réussit
  toujours ; la note partagée s'ouvre et s'édite normalement.
