# Sillon

Application Android personnelle de prise de notes en Markdown. Une IA locale en tire des insights.
Tout se passe sur le téléphone : seule une sauvegarde chiffrée sort, dans un dossier pCloud.
Référence : [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md).

## État actuel : lot 2.1 (partage simple), en test

- Compte local créé au premier lancement (seule l'empreinte du mot de passe est gardée, dans le coffre
  sécurisé du téléphone), déverrouillage par empreinte digitale ou mot de passe, délai de verrouillage réglable.
- Accueil : capture rapide, notes épinglées et récentes, emplacement du « Sillon de la semaine » (lot 4).
- Éditeur Markdown (barre d'outils, mode lecture, enregistrement automatique et bouton « Enregistrer », liens `[[ ]]`, tags `#mot`).
- Confort d'écriture (lot 1.1) : « Enregistrer » au-dessus du clavier, « Lire » / « Écrire » en haut ; cases à
  cocher touchables en mode lecture ; « Copier tout le texte » (menu « … ») ; « + » avec un champ vide ouvre
  une note vide ; le brouillon de la capture rapide est gardé.
- Partage simple (lot 2.1) : menu « … » d'une note > « Partager », en texte, en fichier Markdown ou en
  PDF (fabriqué sur le téléphone, police Satoshi), avec ou sans les sous-notes, par le menu de partage
  d'Android. Aucune permission Internet. Tests sur le téléphone : [docs/TESTS_LOT_2_1.md](docs/TESTS_LOT_2_1.md).
- Pages : arborescence des notes et sous-notes, corbeille de 30 jours.
- Recherche par mots (sans accents, par début de mot).
- Archives (glisser une note de l’accueil vers la gauche) et corbeille (vers la droite).
- Écran Compte : mot de passe, empreinte, délai de verrouillage, effacement de toutes les données.
- Sauvegarde chiffrée (lot 2) : dossier pCloud choisi une fois, mot de passe de sauvegarde, sauvegarde
  automatique une fois par jour (à l'ouverture de l'app et en tâche de fond) et bouton « Sauvegarder
  maintenant ». Les 10 dernières sont gardées. Pastille d'état et message sur l'accueil en cas de problème.
- Export en clair (écran Compte, groupe Données) : un fichier ZIP avec une note par fichier Markdown,
  après un avertissement (le fichier n'est pas protégé).
- Les bancs d'essai du lot 0 restent accessibles depuis l'écran Compte. Résultats :
  [docs/RAPPORT_LOT_0.md](docs/RAPPORT_LOT_0.md).

## Lancer l'app (build de développement)

1. Installer l'APK de développement (voir plus bas), une seule fois.
2. Sur l'ordinateur : `npm ci`, puis `npx expo start`.
3. Ouvrir « Sillon (dev) » sur le téléphone, puis se connecter à l'ordinateur.

## Construire les APK (GitHub Actions, déclenchement manuel)

- **Développement** (`build-dev-apk.yml`) : onglet Actions > « Build APK de développement » > Run workflow.
  Aucun secret nécessaire. À reconstruire seulement quand une bibliothèque native ou une permission change.
- **Production** (`build-apk.yml`) : onglet Actions > « Build APK de production » > Run workflow.
  Il demande les 4 secrets de signature (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`). Le build échoue si l'APK contient la permission Internet.

Installer l'APK : à la fin du build, télécharger l'« artifact » (un fichier ZIP), l'ouvrir et copier le
fichier `.apk` sur le téléphone, puis l'ouvrir pour l'installer.

## Restaurer une sauvegarde

Il faut le **mot de passe de sauvegarde** : sans lui, aucune sauvegarde ne peut être relue.

- **Sur le même téléphone** : Compte > Sauvegarde > « Restaurer une sauvegarde ».
- **Sur un nouveau téléphone** : installer Sillon et l'app pCloud (connectée), puis, sur l'écran de
  création du compte, toucher « Restaurer une sauvegarde ». L'identifiant de la sauvegarde est repris ;
  on choisit ensuite le mot de passe du compte.

Ensuite : choisir le fichier (dans le sélecteur, ouvrir pCloud puis le dossier de sauvegarde ; les
fichiers s'appellent `sillon-AAAAMMJJ-HHMMSS.bin`), taper le mot de passe de sauvegarde, vérifier
l'aperçu (date, nombre de notes), puis confirmer. Les notes du téléphone sont remplacées par celles de la
sauvegarde.

## Vérifications avant chaque build

`npx expo-doctor`, `npx expo lint`, `npx tsc --noEmit`, `npx jest`.

Si les polices de `assets/fonts/` changent : `node scripts/generate-pdf-fonts.js` (polices du PDF partagé).
