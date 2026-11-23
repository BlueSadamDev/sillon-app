# Tests du lot 2 sur le Samsung S21

APK utilisé : **APK de production** (sans permission Internet), le même qu'au quotidien.
Il s'installe par-dessus la version actuelle de Sillon et garde les notes.
Ne pas mettre de vraies notes dans les résultats envoyés : seulement « oui / non » et les messages affichés.

Avant de commencer : l'app pCloud est installée et connectée sur le téléphone.

## Liste à cocher

Jour 1 :

- [ ] **1. Sauvegarde manuelle.** Compte > Sauvegarde : configurer (dossier pCloud, mot de passe de sauvegarde
  deux fois) si ce n'est pas déjà fait, puis « Sauvegarder maintenant ».
  Attendu : « Sauvegardé. », la pastille passe à « À jour », et dans l'app pCloud un fichier
  `sillon-AAAAMMJJ-HHMMSS.bin` apparaît dans le dossier (taille plus grande que 0 après quelques secondes).
- [ ] **2. Après un redémarrage.** Éteindre et rallumer le téléphone, ouvrir Sillon, puis
  « Sauvegarder maintenant ».
  Attendu : aucun message « Sillon n'a plus accès… », un nouveau fichier dans pCloud.
- [ ] **3. Rotation.** Toucher « Sauvegarder maintenant » encore 11 fois, **en attendant 30 secondes**
  entre deux (environ 6 minutes). Regarder ensuite le dossier dans pCloud.
  Attendu : **10 fichiers** `sillon-…` exactement, les plus anciens ont disparu. Noter si un message
  d'erreur s'est affiché pendant la série. (S'il en reste 11 ou 12 : une suppression a été refusée par
  pCloud ; faire encore une sauvegarde, il doit retomber à 10.)
- [ ] **4. Export en clair.** Compte > Données > « Exporter mes notes en clair ».
  Attendu : un avertissement d'abord ; choisir le dossier **Téléchargements** (surtout pas pCloud : le
  fichier n'est pas chiffré) ; message « Export enregistré… » ; le ZIP s'ouvre dans « Mes fichiers » avec
  une note par fichier `.md`. **Supprimer ce ZIP ensuite** : il n'est pas protégé.
- [ ] **5. Accès perdu.** Dans l'app pCloud, se déconnecter du compte. Fermer Sillon complètement
  (bouton des apps récentes, balayer Sillon), puis le rouvrir et le déverrouiller.
  Attendu : sur l'accueil et dans Compte, le message « Sillon n'a plus accès à ton dossier pCloud… » avec le
  bouton « Choisir le dossier à nouveau ». Se reconnecter dans pCloud, puis toucher ce bouton et rechoisir le
  même dossier : le message disparaît, et « Sauvegarder maintenant » remarche.

Le lendemain (sans toucher Sillon le matin) :

- [ ] **6. Sauvegarde automatique.** Avant d'ouvrir Sillon, regarder le dossier dans pCloud : s'il y a
  déjà un fichier daté du jour, c'est la **tâche de fond** qui l'a fait (noter l'heure du nom du fichier).
  Sinon, ouvrir Sillon et attendre une minute : un fichier daté du jour doit apparaître (sauvegarde
  **à l'ouverture**). Dans les deux cas, la pastille indique « À jour ».
- [ ] **7. Restauration d'un fichier déjà envoyé.** Faire d'abord « Sauvegarder maintenant » (pour ne rien
  perdre). Puis Compte > Sauvegarde > « Restaurer une sauvegarde », choisir dans pCloud **un fichier
  de la veille**, taper le mot de passe de sauvegarde.
  Attendu : l'aperçu montre la bonne date et le bon nombre de notes ; après confirmation, les notes de la
  veille sont là. Restaurer ensuite le fichier fait juste avant, pour revenir aux notes du jour.

## Ce qu'il faut me renvoyer

Pour chaque point : **oui / non**, et en cas de « non » le message affiché (recopié mot pour mot) et ce
qu'on voit dans le dossier pCloud (nombre de fichiers, tailles). Pour le point 6 : tâche de fond ou
ouverture, et l'heure du fichier.
