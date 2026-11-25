# Tests du lot 3 sur le Samsung S21

APK utilisé : **APK de production** construit depuis la branche `lot-3-recherche-sens` (s'installe
par-dessus Sillon et garde les notes).
Fichier à copier sur le téléphone avant de commencer (dans « Téléchargements », par exemple) :
`embeddinggemma-300m-qat-Q8_0.gguf` (ggml-org/embeddinggemma-300m-qat-q8_0-GGUF, environ 313 Mo).
Préparer des notes **de test** : « Essai potager » (semer des tomates, repiquer en mai), « Essai
jardinage » (arroser les courgettes, le basilic) et « Essai cuisine » (curry de lentilles). Tout mettre à
la corbeille à la fin.
Renvoyer seulement « oui / non », les messages affichés et les mesures, jamais le contenu de vraies notes.

## Liste à cocher

- [x] **1. Modèle absent.** Avant l'import : sous une note en mode lecture, le bloc « Notes liées » dit
  que Sillon a besoin de son modèle, avec « Importe-le depuis Compte » qui ouvre l'écran du modèle.
  Onglet Recherche, taper « jardin » : la partie « Par le sens » dit la même chose.
- [x] **2. Mauvais fichier.** Compte > Recherche par le sens > « Importer le modèle », choisir un autre
  fichier (une photo, un PDF) : message clair, rien n'est installé.
- [x] **3. Import.** (Taille affichée : 329 Mo.) Choisir le bon fichier : « Sillon vérifie le fichier… », puis « Modèle installé sur
  ce téléphone (… Mo) ». **Noter la taille affichée** (elle sera figée dans les réglages). Combien de
  secondes a pris la vérification ?
- [x] **4. Rattrapage.** (« Toutes tes notes sont prises en compte. » atteint, app fluide.) Juste après l'import, l'écran affiche « Sillon a lu N notes sur M », qui monte
  jusqu'à « Toutes tes notes sont prises en compte. ». Pendant ce temps, l'app reste fluide (ouvrir une
  note, écrire, changer d'onglet). Combien de temps pour tout le carnet, et combien de notes ?
- [x] **5. Notes liées.** Ouvrir « Essai potager » en mode lecture : « Essai jardinage » apparaît dans
  « Notes liées », « Essai cuisine » non (ou après). Toucher une puce ouvre la note.
- [x] **6. Enregistrement.** Écrire une nouvelle note « Essai semis » (semer des radis au potager),
  « Enregistrer », la rouvrir en mode lecture : « Sillon lit cette note… » peut s'afficher un instant,
  puis « Essai potager » apparaît dans ses notes liées.
- [ ] **7. Seuil.** (1er essai : seul Stricte, à 0,55, donnait des liens justes ; Large et Normale montraient des notes sans rapport. Seuils relevés : Large 0,50, Normale 0,55, Stricte 0,62. À revérifier avec le nouvel APK.) Écran du modèle, « Proximité des notes liées » : Large, Normale, Stricte. Avec
  Stricte, moins de notes liées ; avec Large, davantage. Le choix est gardé après fermeture de l'app.
  Avec tes vraies notes : quel niveau donne les liens les plus justes ? Des notes sans rapport
  apparaissent-elles en Normale ?
- [x] **8. Aucune note proche.** (Vu sur « Essai cuisine ».) Écrire une note sur un sujet sans rapport (« Essai fusée »),
  Stricte : « Aucune note n'est assez proche pour l'instant. ».
- [x] **9. Recherche par le sens.** (« Légumes a planter » : rien par les mots ; potager, semis et jardinage par le sens ; cuisine absente.) Onglet Recherche, taper « légumes à planter » : la partie « Avec ces
  mots » ne trouve rien (ou peu), la partie « Par le sens » propose « Essai potager » et « Essai
  jardinage ». Une note trouvée par les mots n'est pas répétée dans « Par le sens ». Le temps d'attente
  est-il acceptable (moins de 1 s) ?
- [x] **10. Corbeille.** (Disparition et retour confirmés.) Mettre « Essai jardinage » à la corbeille : elle disparaît des notes liées et
  de la recherche par le sens. La restaurer : elle revient.
- [x] **11. Suppression du modèle.** « Supprimer le modèle », confirmer : les notes sont intactes, les
  états « modèle absent » reviennent (tests 1). Réimporter : les notes liées reviennent vite (les
  vecteurs déjà calculés sont gardés).
- [x] **12. Sauvegarde.** « Sauvegarder maintenant » fonctionne comme avant ; la taille du fichier de
  sauvegarde n'a pas augmenté avec le modèle (les vecteurs n'y sont pas).
- [x] **13. Mode avion.** Mettre le téléphone en mode avion : notes liées et recherche par le sens
  fonctionnent.
- [ ] **14. Mémoire.** Après 1 minute sans écrire, l'app libère le modèle : rien de visible, mais
  l'app ne doit pas ralentir ni se fermer après un long usage. Signaler toute fermeture inattendue.
