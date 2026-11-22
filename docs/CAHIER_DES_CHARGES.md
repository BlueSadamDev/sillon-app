# Cahier des charges – Sillon

Nom de l'app : **Sillon** (application de notes personnelle avec IA locale).
Version : 0.3 (22 novembre 2026). Changement par rapport à la 0.2 : choix techniques du lot 0 (voir `docs/RAPPORT_LOT_0.md`) : modèle d'embeddings, bibliothèques de chiffrement et de rendu Markdown, règles d'écriture dans pCloud.

## 1. Contexte et objectifs

- Outil personnel de prise de notes inspiré de Notion, pour un seul utilisateur, sur un seul téléphone.
- Usage principal : **prise de notes libre en Markdown**, puis **insights** produits par une IA locale à partir de ces notes (thèmes, idées liées, bilan de la semaine, questions sur ses notes).
- **Tout reste sur le téléphone** : notes, recherche, IA. Seule une sauvegarde **chiffrée par l'app** sort du téléphone, déposée dans un dossier pCloud.
- Usage strictement personnel : pas de Play Store, pas de serveur, pas de compte en ligne.
- Projet conduit comme Aube : cahier des charges, puis design, puis lots. Le code est écrit par Claude à partir des règles du CLAUDE.md.
- Évolution possible plus tard (hors périmètre) : version sur ordinateur avec synchronisation. L'architecture ne doit pas l'empêcher, mais rien n'est construit pour elle.

## 2. Architecture

| Élément | Rôle | Technologie |
| --- | --- | --- |
| App Android | Saisie, lecture, recherche, IA, sauvegarde | Expo (React Native, TypeScript), SQLite local, rendu Markdown par react-native-marked, APK construit par GitHub Actions |
| IA locale | Embeddings (recherche par le sens) et rédaction des insights | llama.rn ; modèle de rédaction LFM2.5 1.2B (validé sur Aube) ; modèle d'embeddings EmbeddingGemma 300M QAT Q8_0 (313 Mo, choisi au lot 0) |
| Sauvegarde | Copie chiffrée hors du téléphone | Fichier chiffré par l'app, écrit dans un **dossier pCloud choisi une fois** via le sélecteur de dossiers d'Android (l'app pCloud joue le rôle de « fournisseur de fichiers ») ; chiffrement par react-native-libsodium |

L'APK de production **n'a pas la permission Internet** : l'app écrit le fichier dans le dossier pCloud, c'est l'app pCloud qui l'envoie dans le cloud.

## 3. Données

### 3.1 Note
- Identifiant unique (UUID), titre, contenu en **Markdown**, note parente (pour imbriquer les pages), tags, épinglée oui/non.
- Dates de création et de modification.
- Suppression « douce » : une note supprimée va dans une corbeille pendant 30 jours.

### 3.2 Données calculées
- Embeddings de chaque note, résumé court, tags proposés, thèmes, liens entre notes, bilans de semaine. Chaque insight garde la liste des notes qui l'ont produit.
- Elles peuvent être recalculées : elles ne sont pas incluses dans la sauvegarde (sauf les tags et résumés acceptés, qui deviennent des données de la note).

### 3.3 Compte local
- Identifiant et mot de passe créés au premier lancement, stockés **sur le téléphone** : le mot de passe uniquement sous forme d'empreinte (Argon2id ou scrypt), dans le coffre sécurisé.
- Réglages de déverrouillage (empreinte, délai d'inactivité).
- Mot de passe de sauvegarde (voir F7), distinct du mot de passe du compte, jamais stocké en clair.

## 4. Fonctionnalités

### F1 – Écran d'accueil
- **Capture rapide** : un champ bien visible pour écrire une note en une seconde.
- **Insight du moment** (« Le sillon de la semaine ») : un thème qui revient, une idée liée à reprendre ou le bilan de la semaine (à partir du lot 4). Avant cela, emplacement avec un texte explicatif.
- **Notes épinglées** et **notes récentes** (5 à 10).
- **État de la sauvegarde** : « Sauvegardé aujourd'hui », « Dernière sauvegarde il y a N jours », « Dossier pCloud inaccessible ».
- Navigation en bas : Accueil, Pages, Recherche, Insights.

### F2 – Compte et connexion
- **Premier lancement** : créer son compte (identifiant, mot de passe deux fois), puis proposer d'activer l'empreinte, puis proposer de configurer la sauvegarde (possible plus tard).
- **Restaurer depuis une sauvegarde** au premier lancement (nouveau téléphone) : choisir le fichier dans le dossier pCloud, saisir le mot de passe de sauvegarde.
- **Déverrouillage** : empreinte digitale ou mot de passe, à l'ouverture et après un délai d'inactivité réglable.
- **Écran « Compte »** : changer le mot de passe ; régler le déverrouillage ; voir l'état de la sauvegarde et du dossier pCloud ; sauvegarder maintenant ; restaurer ; exporter toutes ses notes en clair (fichiers Markdown dans un ZIP, avec avertissement) ; effacer toutes les données (double confirmation).
- Mot de passe oublié : pas de réinitialisation possible sans perdre les données du téléphone ; restauration ensuite depuis la sauvegarde avec le mot de passe de sauvegarde. L'app l'explique clairement à la création du compte.

### F3 – Éditeur de notes
- Contenu en **Markdown** écrit avec une barre d'outils au-dessus du clavier : titres, gras/italique, listes, cases à cocher, citations, liens entre notes `[[ ]]`.
- Bascule entre mode écriture et mode lecture (rendu mis en forme).
- Pages imbriquées (une note peut contenir des sous-notes).
- Enregistrement automatique, sans bouton.

### F4 – Organisation et recherche
- Arborescence des pages, tags, épingles, corbeille.
- Recherche par mots (texte intégral) dès le lot 1 ; recherche par le sens à partir du lot 3.

### F5 – Insights (IA locale)
- **Notes liées** : sous chaque note, les notes les plus proches par le sens.
- **Résumé et tags proposés** pour une note, acceptés ou refusés par l'utilisateur.
- **Questions sur ses notes** : réponse courte qui cite les notes utilisées ; « je ne sais pas » si rien ne répond.
- **Bilan de la semaine** : thèmes qui reviennent, idées notées plusieurs fois, sujets laissés en plan, 2 ou 3 pistes pour la semaine suivante.
- **L'app prépare, le modèle formule** (repris d'Aube) : l'app choisit les notes concernées, compte les thèmes et repère les liens ; le modèle ne rédige qu'à partir de ce qu'on lui donne. Tout insight sans note source est refusé.
- L'IA ne modifie jamais une note sans validation.

### F6 – Corbeille
- Notes supprimées gardées 30 jours, restaurables, puis effacées.

### F7 – Sauvegarde chiffrée vers pCloud
- **Configuration (une fois)** : l'utilisateur choisit un dossier dans pCloud avec le sélecteur de dossiers d'Android, puis crée son **mot de passe de sauvegarde** (deux fois), avec un avertissement : sans lui, la sauvegarde est illisible ; le noter dans un gestionnaire de mots de passe.
- **Contenu** : toutes les notes, l'arborescence, les tags, la corbeille, les réglages (hors mot de passe du compte et fichiers de modèle IA).
- **Chiffrement** dans l'app avant écriture : XChaCha20-Poly1305 (chiffrement authentifié), clé dérivée du mot de passe de sauvegarde par Argon2id (3 passes, 256 Mo ; environ 1,2 s sur le S21). Bibliothèque : react-native-libsodium (choisie au lot 0). Repli si la tâche de fond manque de mémoire : Argon2id 3 passes, 128 Mo.
- **Fichiers** : nom daté se terminant par `.bin` (sinon pCloud ajoute lui-même « .bin »).
- **Fréquence** : automatique au plus une fois par jour (à l'ouverture de l'app ou en tâche de fond), plus un bouton « Sauvegarder maintenant ».
- **Rotation** : garder les 10 dernières sauvegardes datées dans le dossier, supprimer les plus anciennes. Une suppression refusée par pCloud est retentée à la sauvegarde suivante.
- **Une action à la fois** dans le dossier pCloud, espacées de quelques secondes ; après chaque action, l'app relit la liste du dossier pour vérifier ce qui a vraiment été fait (pCloud signale parfois une erreur sur une action réussie).
- **Restauration** : choisir un fichier, saisir le mot de passe, aperçu (date, nombre de notes), confirmation, remplacement des données.
- **En cas d'échec** (dossier inaccessible, app pCloud déconnectée, permission perdue) : message clair sur l'accueil et dans Compte, avec le bouton pour rechoisir le dossier.
- **Solution de repli** si l'écriture directe dans pCloud ne marche pas : export du fichier chiffré puis partage vers l'app pCloud.

## 5. Règles de l'IA

- 100 % local : le modèle tourne sur le téléphone, importé à la main (fichier vérifié par taille et empreinte SHA-256), jamais téléchargé par l'app.
- Contexte limité (environ 4 096 jetons, soit environ 3 000 mots) : le modèle reçoit au plus 3 à 5 extraits choisis par l'app.
- Tâches courtes et cadrées uniquement. Pas de synthèse libre de tout le carnet.
- Embeddings calculés à l'enregistrement d'une note. Rédaction seulement quand l'utilisateur ouvre l'écran concerné ; le bilan de la semaine est généré à la première ouverture à partir du dimanche. Modèle chargé à la demande, puis libéré.
- Au lot 4, vérifier que le modèle de rédaction et le modèle d'embeddings peuvent servir dans la même session de l'app : llama.rn 0.12.9 garde la taille des vecteurs du premier modèle chargé (défaut corrigé dans llama.rn 0.13).

## 6. Exigences non fonctionnelles

- **Confidentialité** : aucun SDK d'analytics, de suivi des plantages ni de publicité. APK de production sans permission Internet. Aucune vraie note dans le dépôt (public) : tests sur notes fictives uniquement. Pas de contenu de notes dans les logs.
- **Sécurité** : notes dans la base locale de l'app (espace privé, chiffré par Android) ; app verrouillée ; sauvegarde toujours chiffrée ; un export en clair seulement sur demande explicite.
- **Performance** : ouverture en moins de 2 s, capture rapide immédiate, recherche par mots instantanée jusqu'à quelques milliers de notes.
- **Téléphone** : Android 14 ou plus récent ; IA validée sur Samsung Galaxy S21 (8 Go).
- Les textes de l'app suivent la charte d'écriture du DESIGN.md.

## 7. Découpage en lots

- **Lot 0 – Faisabilité** :
  1. vérifier que l'app pCloud apparaît dans le sélecteur de dossiers d'Android et accepte qu'une autre app y écrive, garde l'accès après redémarrage, et envoie bien le fichier dans le cloud ;
  2. choisir la bibliothèque de chiffrement et la bibliothèque de rendu Markdown ;
  3. tester un modèle d'embeddings avec llama.rn sur le S21 (vitesse, qualité en français).
  Rapport dans `docs/RAPPORT_LOT_0.md`.
- **Lot 1 – Socle** : identité Sillon, création du compte local, déverrouillage, écran d'accueil (sans insight), éditeur Markdown, arborescence, corbeille, recherche par mots, écran Compte.
- **Lot 2 – Sauvegarde** : sauvegarde chiffrée vers le dossier pCloud (configuration, automatique, rotation), restauration testée, état sur l'accueil.
- **Lot 3 – Recherche par le sens** : embeddings, notes liées, recherche par le sens.
- **Lot 4 – Insights** : import du modèle, résumés et tags proposés, questions sur ses notes, bilan de la semaine, carte d'insight sur l'accueil.
- **Plus tard** : organisation de la semaine (tâches extraites des notes), bases de données façon Notion, import de PDF, version sur ordinateur avec synchronisation.

## 8. Points ouverts et risques

- **pCloud comme dossier Android** : **confirmé au lot 0** (écriture directe, fichiers arrivés complets dans le cloud). Restent à vérifier au lot 2 : accès après redémarrage du téléphone, suppressions espacées, relecture d'une sauvegarde déjà envoyée.
- **Réponses de pCloud peu fiables** : pCloud peut signaler une erreur sur une écriture ou une suppression réussie, et refuse les actions trop rapprochées. Parade : une action à la fois et vérification par la liste du dossier.
- **Tâche de fond et dossier pCloud** : l'écriture en arrière-plan peut échouer si l'app pCloud est endormie ; la sauvegarde à l'ouverture de l'app sert de filet.
- **Mot de passe de sauvegarde perdu** = sauvegardes illisibles. Avertissement obligatoire.
- **Perte du téléphone sans sauvegarde récente** = perte des notes depuis la dernière sauvegarde.
- **Qualité des insights** avec un modèle de 1,2 milliard de paramètres : fragile sur la synthèse de textes libres. À mesurer au lot 4 sur notes fictives.
- **Changement de téléphone** (par exemple un Pixel 8 Pro) : refaire les mesures de l'IA.
