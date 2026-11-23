# Règles du projet

## Contexte
- L'utilisateur ne sait pas développer. Tout expliquer en français simple, sans jargon (ou expliquer chaque terme technique).
- Projet : **Sillon**, application Android personnelle de prise de notes (Markdown) avec insights produits par une IA locale. **Tout se passe sur le téléphone** : pas de serveur, pas de compte en ligne. Seule une sauvegarde chiffrée par l'app sort du téléphone, écrite dans un dossier pCloud. Usage strictement personnel : pas de Play Store.
- Référence fonctionnelle : [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md). Le lire avant chaque nouveau lot ou fonctionnalité. Ne rien développer qui n'y figure pas sans demander.
- Livrable : un APK installable sur le téléphone (Android 14 ou plus récent).
- Une version sur ordinateur avec synchronisation est possible plus tard : ne rien construire pour elle, mais garder l'accès aux données dans `src/db/` pour qu'un module de synchro puisse s'y brancher.

## Organisation du dépôt
- L'application Expo (React Native, TypeScript), avec Expo Router. Écrans dans `src/app/`, le reste dans `src/` hors de `src/app/` :
  - `src/notes/` : notes, arborescence, tags, corbeille, recherche par mots (calculs purs, sans interface) ;
  - `src/editor/` : éditeur Markdown, barre d'outils, rendu en mode lecture ;
  - `src/db/` : base de données locale (SQLite) ;
  - `src/account/` : compte local, mot de passe, déverrouillage ;
  - `src/backup/` : chiffrement, écriture dans le dossier pCloud, rotation, restauration ;
  - `src/ai/` : IA locale (lot 3 et suivants) : modèles, embeddings, insights, gardien des réponses ;
  - `src/components/` : composants d'interface réutilisables ;
  - `src/texts/` : tous les textes affichés (charte dans DESIGN.md).
- Technologie imposée : Expo (React Native, TypeScript) et GitHub Actions pour les APK. Ne proposer aucun autre framework sans demander.
- **Pas d'Expo Go** dès que l'app contient du code natif (llama.rn, SQLite chiffré…) : tests avec un **build de développement** (`expo-dev-client`), construit par GitHub Actions.

## Confidentialité
- Aucun SDK d'analytics, de suivi des plantages ni de publicité.
- **L'APK de production n'a pas la permission Internet** : la retirer via `android.blockedPermissions` dans `app.json` (à vérifier à chaque build de production). Le build de développement, lui, en a besoin pour se recharger depuis l'ordinateur. Aucun appel réseau dans le code, aucune police ou image chargée en ligne.
- Ne jamais mettre de vraies notes dans le dépôt (dépôt **public**) : ni exports, ni captures, ni logs. Les tests utilisent uniquement des **notes fictives** (`src/**/__fixtures__/`).
- Ne jamais afficher le contenu des notes ni un mot de passe dans les logs (`console.log`).
- Un export **en clair** n'a lieu que sur demande explicite de l'utilisateur, avec un avertissement.

## Compte local
- Un seul compte, créé au premier lancement, **stocké sur le téléphone**. Le mot de passe n'est conservé que sous forme d'empreinte (Argon2id ou scrypt), dans `expo-secure-store`.
- Déverrouillage par empreinte ou mot de passe (`expo-local-authentication`), à l'ouverture et après le délai d'inactivité réglé.
- Mot de passe oublié : pas de réinitialisation sans effacer les données du téléphone ; l'app l'explique à la création du compte.

## Sauvegarde vers pCloud
- L'utilisateur choisit **une fois** un dossier pCloud avec le sélecteur de dossiers d'Android (Storage Access Framework). L'app garde l'accès à ce dossier (permission persistante) et y écrit ses fichiers ; c'est l'app pCloud qui les envoie dans le cloud.
- Toute sauvegarde est **chiffrée dans l'app avant écriture** (chiffrement authentifié, clé dérivée du mot de passe de sauvegarde par Argon2id ou scrypt). Bibliothèque choisie au lot 0. Le mot de passe de sauvegarde n'est jamais stocké en clair.
- Au plus une sauvegarde automatique par jour, plus le bouton « Sauvegarder maintenant ». Garder les 10 dernières, supprimer les plus anciennes.
- La restauration est testée à chaque modification du format de sauvegarde (test automatique : sauvegarder des notes fictives, restaurer, comparer).
- Le format du fichier porte un numéro de version, pour pouvoir relire les anciennes sauvegardes.
- Gérer proprement les cas « dossier inaccessible », « permission perdue », « app pCloud absente », avec un message clair et le bouton pour rechoisir le dossier.

## Préparer le partage (sans le construire)
- Le partage avec d'autres personnes et la collaboration sont possibles à long terme (cahier des charges, section 7, « Plus tard ») : **ne rien construire pour eux** (ni serveur, ni réseau, ni fusion automatique), mais ne pas se fermer la porte :
  1. chaque note garde un identifiant unique, sa date de modification, un **identifiant d'auteur** (celui du compte local) et l'appareil de la dernière modification ;
  2. **toutes** les écritures de notes (création, modification, suppression, déplacement) passent par `src/db/`, jamais directement depuis un écran ou un autre module ;
  3. le contenu d'une note ne contient aucun réglage propre au téléphone (ces réglages vivent à part).
- Le partage simple (lot 2.1) passe par le menu de partage d'Android : il ne demande pas la permission Internet et ne doit jamais l'ajouter.

## IA locale
- **100 % sur le téléphone**, avec `llama.rn`. Aucun appel réseau dans le code de l'IA.
- Modèle de rédaction : LFM2.5 1.2B Instruct (Q4_K_M), déjà validé sur le Samsung Galaxy S21 dans le projet Aube. Modèle d'embeddings : choisi au lot 0, résultat dans un rapport `docs/`.
- Modèles installés par **import manuel du fichier** (`expo-document-picker`), vérifiés (taille et empreinte SHA-256), copiés dans l'espace privé de l'app, supprimables. L'app ne télécharge jamais de modèle.
- Les fichiers de modèle (`*.gguf`, `*.pte`, `*.bin`, `*.safetensors`, `*.onnx`…) ne vont **jamais** dans le dépôt (bloqués par `.gitignore`).
- **L'app prépare, le modèle formule** : l'app choisit les notes concernées (au plus 3 à 5 extraits), compte les thèmes, repère les liens. Le modèle ne rédige qu'à partir de ce qu'on lui donne. Chaque insight cite ses notes sources ; un insight sans source est refusé.
- Le modèle dit « je ne sais pas » quand ses extraits ne répondent pas. L'IA ne modifie jamais une note sans validation de l'utilisateur.
- Embeddings calculés à l'enregistrement d'une note. Rédaction seulement quand l'utilisateur ouvre l'écran concerné ; le modèle est chargé à la demande puis libéré. Aucune génération lourde en arrière-plan.
- Tous les réglages de l'IA (nombre d'extraits, seuils de proximité, règles du gardien) sont dans `src/ai/settings.ts`, jamais en dur.
- Les tests de l'IA utilisent un modèle simulé et des notes fictives.

## Découpage en lots
- Le projet avance par lots (cahier des charges, section 7) : un lot = une branche `lot-<n>-<nom>` et un APK testé.
- **Lot 0** : faisabilité (dossier pCloud via le sélecteur Android, bibliothèques de chiffrement et de rendu Markdown, modèle d'embeddings sur le S21). Rapport dans `docs/RAPPORT_LOT_0.md`.
- **Lot 1** : socle (identité Sillon, compte local, déverrouillage, accueil, éditeur Markdown, arborescence, corbeille, recherche par mots, écran Compte).
- **Lot 2** : sauvegarde chiffrée vers le dossier pCloud, restauration testée.
- **Lot 3** : recherche par le sens et notes liées.
- **Lot 4** : insights (résumés, tags proposés, questions, bilan de la semaine).

## Design
Lire [DESIGN.md](DESIGN.md) avant toute modification d'interface et le respecter. Tant que DESIGN.md n'existe pas (lot 0), garder une interface minimale et lisible, sans travail graphique.
Tout texte affiché passe par `src/texts/` et respecte la charte des textes de DESIGN.md.

## Façon de travailler
- Commencer toujours par un plan court et attendre la validation avant d'écrire du code.
- Demander une validation à chaque étape majeure : création du projet, nouvelle fonctionnalité, changement d'architecture, ajout d'une dépendance ou d'une permission Android. Pour une petite modification, avancer sans demander.
- Faire de petites modifications et vérifier que ça fonctionne après chacune.
- Après chaque étape, résumer en 3 à 5 lignes ce qui a changé et comment le vérifier.
- Ne jamais supprimer de fichiers ni installer d'outil global sans demander.
- N'ajouter aucune fonctionnalité non demandée et ne pas réécrire du code qui marche.
- En cas de blocage après 2 tentatives : s'arrêter, expliquer le problème et proposer des options. Ne pas tourner en boucle.

## Dépendances
- Pour ajouter un module Expo : `npx expo install <nom>`, jamais `npm install`.
- Modules prévus (à ajouter seulement quand le lot en a besoin, avec validation) : `expo-sqlite`, `expo-secure-store`, `expo-local-authentication`, `expo-dev-client`, `expo-build-properties`, `expo-file-system` (accès au dossier pCloud), `expo-document-picker` (import du modèle, restauration), `expo-background-task` + `expo-task-manager` (sauvegarde quotidienne), `jest-expo`, une bibliothèque de rendu Markdown et une de chiffrement (choisies au lot 0), `llama.rn` (lot 3).
- Ne jamais ajouter manuellement `expo-modules-core` ni `expo-modules-autolinking` dans `package.json`. Lancer `npx expo install --fix` si nécessaire.
- **Dependabot** : ne jamais fusionner une PR Dependabot qui touche les dépendances npm. À la place : `npx expo install --check`, puis `npx expo install --fix` sur une branche dédiée, et fermer la PR avec une explication. Les PR sur les actions GitHub peuvent être fusionnées après un build réussi.

## Qualité du code (avant chaque build ou grosse étape)
- Exécuter systématiquement :
  1. `npx expo-doctor` (objectif : aucune erreur)
  2. `npx expo lint`
  3. `npx tsc --noEmit`
  4. `npx jest` (notamment : compte, sauvegarde puis restauration, recherche)
- Si `expo-doctor` signale des versions incompatibles : `npx expo install --fix`, puis relancer les vérifications.

## Git et GitHub
- Le code est versionné avec Git et poussé sur GitHub (dépôt **public**) : rien de personnel n'y entre, ni note ni secret.
- Faire un commit de sécurité avant chaque grosse modification ; commits fréquents avec des messages clairs en français.
- Ne jamais travailler directement sur la branche `main` ; une branche par lot ou fonctionnalité majeure.
- Après chaque étape validée : commit, puis push de la branche.
- Une fusion dans `main` demande un accord explicite qui nomme la PR (par exemple « fusionne la #4 »). Un « ok » général ne suffit pas.
- Dans chaque résumé, distinguer « APK construit » (le build GitHub a réussi) et « APK testé » (installé et vérifié par l'utilisateur).
- Ajouter les fichiers un par un, jamais `git add .` ni `git add -A`.
- Ne jamais faire de force push ni réécrire l'historique sans accord.

## Build de l'APK
- Méthode unique : **GitHub Actions**, déclenchement manuel. Deux workflows : `build-dev-apk.yml` (développement, avec `expo-dev-client`) et `build-apk.yml` (production).
- Reprendre les correctifs connus du projet Aube (`npm_config_warn: "false"`, propriétés via `./gradlew -PKEY=VALUE`, `project.getProperty('KEY')` dans `signingConfigs`, `enableMinifyInReleaseBuilds: false` si une tâche de fond plante).
- Donner les commandes exactes pour lancer le workflow, le lien du build, et expliquer comment installer l'APK (artifact → ZIP → `.apk`).

## Maîtrise des coûts
- Lire uniquement les fichiers nécessaires.
- Ne pas parcourir `node_modules/`, `.expo/`, `android/`, `dist/`, `build/`, les fichiers `*.apk` ni `package-lock.json`.
- Prévenir l'utilisateur quand la conversation devient longue.

## Secrets
- Ne jamais créer ni modifier de secret GitHub, de keystore ou de mot de passe de signature.
- Ne jamais lire `credentials.json`, le dossier `credentials/`, les fichiers `*.jks`, `*.keystore` ni les fichiers `.env`.

## Documentation
- Tenir à jour `README.md` : objectif de l'app, comment la lancer, comment construire les deux APK, comment restaurer une sauvegarde.
- Quand un lot change ce que prévoit le cahier des charges, le signaler et proposer la mise à jour de `docs/CAHIER_DES_CHARGES.md`.
