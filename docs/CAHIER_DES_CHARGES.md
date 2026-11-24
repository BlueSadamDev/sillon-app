# Cahier des charges – Sillon

Nom de l'app : **Sillon** (application de notes personnelle avec IA locale).
Version : 0.7 (24 novembre 2026). Changements par rapport à la 0.6 : auteur et appareil précisés (3.1), vérifications pCloud du lot 2 (section 8).
Version 0.6 (23 novembre 2026). Changements par rapport à la 0.5 : retours du premier usage (lot 1.1 : cases à cocher dans les deux modes, copie du texte, bouton « + », brouillon de la capture, boutons « Lire » et « Enregistrer » intervertis), dictée vocale locale (F11, lot 6), partage simple d'une note (F10, lot 2.1), préparation des données au partage et à la collaboration (3.1), feuille de route du partage à long terme (section 7, « Plus tard »).
Version 0.5 (22 novembre 2026). Changements par rapport à la 0.4 : feuille de route complétée par la remise en forme des notes (F8, lot 4.1) et les actions (F9, lot 5).
Version 0.4 (22 novembre 2026). Changements par rapport à la 0.3 (décisions du lot 1) : archive des notes, glissement sur l'accueil (corbeille, archive), bouton « Enregistrer » dans l'éditeur, carte d'insight au-dessus de la capture rapide, règle de la capture rapide, tags écrits `#mot`, export en clair reporté au lot 2.

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
- **Tags** : écrits dans le texte sous la forme `#mot` ; l'app les reconnaît d'elle-même.
- Dates de création et de modification.
- **Préparation au partage** (rien à construire, voir CLAUDE.md) : chaque note garde aussi un **identifiant d'auteur** : celui du compte qui l'a **créée**, il ne change plus ensuite (il est repris d'une sauvegarde restaurée sur un nouveau téléphone). Elle garde aussi l'**appareil de la dernière écriture**, noté à chaque écriture : modification, épingle, déplacement, archive, corbeille et leurs annulations. L'identifiant d'appareil est propre à chaque installation et n'est jamais sauvegardé. Toutes les modifications passent par `src/db/` ; le contenu d'une note ne contient aucun réglage propre au téléphone.
- Suppression « douce » : une note supprimée va dans une corbeille pendant 30 jours.
- **Archive** : une note archivée (avec ses sous-notes) quitte l'accueil (récentes, épinglées) mais reste dans Pages (« Archives ») et dans la recherche. Elle n'est jamais effacée toute seule et peut être sortie des archives.

### 3.2 Données calculées
- Embeddings de chaque note, résumé court, tags proposés, thèmes, liens entre notes, bilans de semaine. Chaque insight garde la liste des notes qui l'ont produit.
- Elles peuvent être recalculées : elles ne sont pas incluses dans la sauvegarde (sauf les tags et résumés acceptés, qui deviennent des données de la note).

### 3.3 Compte local
- Identifiant et mot de passe créés au premier lancement, stockés **sur le téléphone** : le mot de passe uniquement sous forme d'empreinte (Argon2id ou scrypt), dans le coffre sécurisé.
- Réglages de déverrouillage (empreinte, délai d'inactivité).
- Mot de passe de sauvegarde (voir F7), distinct du mot de passe du compte, jamais stocké en clair.

## 4. Fonctionnalités

### F1 – Écran d'accueil
- **Insight du moment** (« Le sillon de la semaine »), en haut : un thème qui revient, une idée liée à reprendre ou le bilan de la semaine (à partir du lot 4). Avant cela, emplacement avec un texte explicatif.
- **Capture rapide**, juste en dessous : un champ bien visible pour écrire une note en une seconde. Une seule ligne est enregistrée directement (elle devient le titre) ; plusieurs lignes ouvrent l'éditeur (la première ligne devient le titre).
  - **Champ vide** (lot 1.1) : le bouton « + » ouvre directement une nouvelle note vide dans l'éditeur.
  - **Brouillon gardé** (lot 1.1) : le texte saisi et non encore validé est conservé si l'on quitte l'accueil, ferme l'app ou si le téléphone la coupe ; il réapparaît au retour. Il est stocké dans la base locale de l'app (même protection que les notes), effacé dès que la note est créée, et n'entre pas dans la sauvegarde.
- **Notes épinglées** et **notes récentes** (5 à 10). Une note récente se glisse **vers la droite pour la corbeille** et **vers la gauche pour l'archive**, avec « Annuler » pendant quelques secondes.
- **État de la sauvegarde** : « Sauvegardé aujourd'hui », « Dernière sauvegarde il y a N jours », « Dossier pCloud inaccessible ».
- Navigation en bas : Accueil, Pages, Recherche, Insights.

### F2 – Compte et connexion
- **Premier lancement** : créer son compte (identifiant, mot de passe deux fois), puis proposer d'activer l'empreinte, puis proposer de configurer la sauvegarde (possible plus tard).
- **Restaurer depuis une sauvegarde** au premier lancement (nouveau téléphone) : choisir le fichier dans le dossier pCloud, saisir le mot de passe de sauvegarde.
- **Déverrouillage** : empreinte digitale ou mot de passe, à l'ouverture et après un délai d'inactivité réglable.
- **Écran « Compte »** : changer le mot de passe ; régler le déverrouillage ; voir l'état de la sauvegarde et du dossier pCloud ; sauvegarder maintenant ; restaurer ; exporter toutes ses notes en clair (fichiers Markdown dans un ZIP, avec avertissement ; lot 2) ; effacer toutes les données (double confirmation).
- Mot de passe oublié : pas de réinitialisation possible sans perdre les données du téléphone ; restauration ensuite depuis la sauvegarde avec le mot de passe de sauvegarde. L'app l'explique clairement à la création du compte.

### F3 – Éditeur de notes
- Contenu en **Markdown** écrit avec une barre d'outils au-dessus du clavier : titres, gras/italique, listes, cases à cocher, citations, liens entre notes `[[ ]]`.
- Bascule entre mode écriture et mode lecture (rendu mis en forme).
- Pages imbriquées (une note peut contenir des sous-notes).
- Enregistrement automatique pendant la frappe, et bouton **« Enregistrer »** en mode écriture, qui enregistre et revient à l'écran précédent.
- **Boutons intervertis** (lot 1.1) : « Enregistrer » passe dans la barre d'outils, à droite, au-dessus du clavier (à portée de pouce) ; la bascule « Lire » / « Écrire » passe dans l'en-tête.
- **Cases à cocher utilisables dans les deux modes** (lot 1.1) :
  - en mode lecture, toucher une case la coche ou la décoche (la ligne `- [ ]` devient `- [x]` dans le texte, enregistrement immédiat) ;
  - en mode écriture, le bouton « Case à cocher » de la barre d'outils coche ou décoche la case de la ligne où se trouve le curseur (et crée la case si la ligne n'en a pas).
- **Copier du texte** (lot 1.1) :
  - mode écriture : la sélection et le menu « Copier » d'Android doivent fonctionner normalement ;
  - mode lecture : texte sélectionnable paragraphe par paragraphe ;
  - menu « … » : **« Copier tout le texte »** (Markdown de la note dans le presse-papiers).

### F4 – Organisation et recherche
- Arborescence des pages, tags, épingles, archives, corbeille.
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
- **Contenu** : toutes les notes, l'arborescence, les tags, les archives, la corbeille, les réglages (hors mot de passe du compte et fichiers de modèle IA).
- **Chiffrement** dans l'app avant écriture : XChaCha20-Poly1305 (chiffrement authentifié), clé dérivée du mot de passe de sauvegarde par Argon2id (3 passes, 256 Mo ; environ 1,2 s sur le S21). Bibliothèque : react-native-libsodium (choisie au lot 0). Repli si la tâche de fond manque de mémoire : Argon2id 3 passes, 128 Mo.
- **Fichiers** : nom daté se terminant par `.bin` (sinon pCloud ajoute lui-même « .bin »).
- **Fréquence** : automatique au plus une fois par jour (à l'ouverture de l'app ou en tâche de fond), plus un bouton « Sauvegarder maintenant ».
- **Rotation** : garder les 10 dernières sauvegardes datées dans le dossier, supprimer les plus anciennes. Une suppression refusée par pCloud est retentée à la sauvegarde suivante.
- **Une action à la fois** dans le dossier pCloud, espacées de quelques secondes ; après chaque action, l'app relit la liste du dossier pour vérifier ce qui a vraiment été fait (pCloud signale parfois une erreur sur une action réussie).
- **Restauration** : choisir un fichier, saisir le mot de passe, aperçu (date, nombre de notes), confirmation, remplacement des données.
- **En cas d'échec** (dossier inaccessible, app pCloud déconnectée, permission perdue) : message clair sur l'accueil et dans Compte, avec le bouton pour rechoisir le dossier.
- **Solution de repli** si l'écriture directe dans pCloud ne marche pas : export du fichier chiffré puis partage vers l'app pCloud.

### F8 – Remise en forme d'une note (lot 4.1)
- Deux boutons distincts dans le menu « … » d'une note :
  - **« Corriger les fautes »** : orthographe, accords et ponctuation ; aucun changement de structure ni de sens ;
  - **« Mettre en forme »** : structure seulement (titres, listes, cases à cocher, paragraphes), sans reformuler les phrases.
- **D'abord l'app, puis l'IA** : l'app applique seule les remises en forme sûres (listes repérées, espaces en trop, lignes vides) ; l'IA ne traite que ce qui reste.
- **Comparaison avant / après** obligatoire : l'utilisateur accepte ou refuse la proposition en entier. Rien n'est modifié sans validation.
- **Version précédente gardée** : bouton « Annuler la remise en forme » disponible au moins jusqu'à la modification suivante de la note.
- **Gardien** : la proposition est refusée si un chiffre, une date, un nom propre, un lien `[[ ]]` ou un tag `#mot` de la note d'origine a disparu ou changé, ou si le texte a perdu plus d'une part réglable de ses mots (réglage dans `src/ai/settings.ts`). En cas de refus : nouvelle tentative, puis message « Sillon n'a pas réussi à remettre en forme cette note sans la modifier. »
- **Notes longues** : traitement section par section (une section = un titre ou un bloc d'environ 1 500 mots au plus), puis assemblage par l'app.

### F9 – Actions (lot 5)
- **Actions explicites (5a, sans IA)** : l'app relève les cases à cocher `- [ ]` et `- [x]` de chaque note, et les dates écrites dans la même ligne (« vendredi », « 15 décembre », « demain »), traduites en date par l'app.
- **Tableau d'actions d'une page (5a)** : écran ouvert depuis une page, qui rassemble les actions de la page et de ses sous-notes. Colonnes : action, note d'origine (lien), échéance, fait ou pas. Tri par échéance, filtre « à faire / faites ». Cocher dans le tableau coche la case dans la note : **la note reste la seule source**, le tableau est calculé.
- **Actions proposées par l'IA (5b)** : l'IA repère les actions implicites (« il faudrait que je rappelle le plombier »), **une note à la fois**. Chaque proposition cite la phrase d'origine ; sans phrase d'origine retrouvée mot pour mot dans la note, elle est refusée. L'utilisateur accepte (la proposition devient une case `- [ ]` ajoutée dans la note, sous la phrase d'origine ou dans une section « Actions »), modifie ou refuse. Une proposition refusée n'est plus reproposée pour la même phrase.
- **Doublons** : l'app écarte une proposition proche d'une action existante de la même note.
- **Ma semaine (5c)** : vue qui regroupe les actions datées de toutes les notes, jour par jour sur 7 jours, plus « En retard » et « Sans date ». Le bilan de la semaine (F5) peut s'y appuyer.
- Pas de base de données façon Notion : le tableau et « Ma semaine » sont des écrans calculés à partir des notes.

### F10 – Partage simple d'une note (lot 2.1)
- Bouton **« Partager »** dans le menu « … » d'une note : ouvre le menu de partage d'Android (messagerie, mail, Drive…).
- Trois formats au choix : **texte** (Markdown brut dans le message), **fichier Markdown** (`.md`), **PDF** (mise en forme du mode lecture, police Satoshi, sans les éléments d'interface).
- Option « inclure les sous-notes » pour une page (un seul fichier, sous-notes à la suite, ou un ZIP de fichiers `.md`).
- Le partage envoie une **copie** : les modifications suivantes ne sont pas transmises.
- **Aucune permission Internet** : le partage passe par les autres apps du téléphone. Les liens `[[ ]]` vers des notes non partagées deviennent du texte simple ; les insights et notes liées ne sont jamais inclus.
- Bibliothèques pressenties (à valider au début du lot) : `expo-sharing` et `expo-print` (PDF généré sur le téléphone).

### F11 – Dictée vocale locale (lot 6)
- Bouton **micro** dans la capture rapide et dans la barre d'outils de l'éditeur : l'utilisateur parle, le texte s'écrit à l'endroit du curseur, il peut le corriger ensuite.
- **100 % sur le téléphone** : transcription par un modèle Whisper local (bibliothèque `whisper.rn`, de la même équipe que `llama.rn`), importé à la main comme le modèle de rédaction. Aucun audio ne sort du téléphone et l'APK reste sans permission Internet.
- Nouvelle permission : **micro** (`RECORD_AUDIO`), demandée au premier usage, avec une phrase qui explique pourquoi.
- L'audio n'est jamais conservé : il est effacé dès que le texte est produit.
- Ponctuation et majuscules ajoutées par le modèle ; les commandes vocales (« à la ligne », « case à cocher ») sont hors périmètre au départ.
- En attendant ce lot : la dictée du clavier Gboard (touche micro) fonctionne déjà dans tous les champs de Sillon. Elle passe par Google, sauf si la reconnaissance hors connexion du français est installée sur le téléphone.

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
- **Lot 1 – Socle** : identité Sillon, création du compte local, déverrouillage, écran d'accueil (sans insight), éditeur Markdown, arborescence, archives, corbeille, recherche par mots, écran Compte.
- **Lot 2 – Sauvegarde** : sauvegarde chiffrée vers le dossier pCloud (configuration, automatique, rotation), restauration testée, état sur l'accueil, export en clair (ZIP).
- **Lot 1.1 – Confort d'écriture** (retours du premier usage, à faire juste après la fusion du lot 2 pour éviter les conflits) : cases à cocher dans les deux modes, copie du texte, « + » qui ouvre une note vide, brouillon de la capture gardé, boutons « Lire » et « Enregistrer » intervertis.
- **Lot 2.1 – Partage simple** (F10) : partage d'une note ou d'une page en texte, Markdown ou PDF par le menu de partage d'Android.
- **Lot 3 – Recherche par le sens** : embeddings, notes liées, recherche par le sens.
- **Lot 4 – Insights** : import du modèle, résumés et tags proposés, questions sur ses notes, bilan de la semaine, carte d'insight sur l'accueil.
- **Lot 4.1 – Remise en forme** (F8) : « Corriger les fautes », puis « Mettre en forme », avec comparaison avant / après, annulation et gardien.
- **Lot 5 – Actions** (F9) :
  - 5a : actions explicites et tableau d'actions par page, sans IA ;
  - 5b : actions implicites proposées par l'IA, validées une par une ;
  - 5c : vue « Ma semaine ».
- **Lot 6 – Dictée vocale locale** (F11) : d'abord un banc d'essai (taille et vitesse des modèles Whisper sur le S21, qualité en français, cohabitation avec le modèle de rédaction en mémoire), puis le bouton micro dans la capture et l'éditeur.
- **Plus tard** : bases de données façon Notion, import de PDF, version sur ordinateur avec synchronisation.
- **Plus tard – partage et collaboration**, par niveaux (chaque niveau demande son propre cahier des charges et une phase de faisabilité) :
  - **Partage à jour en lecture, par dossier pCloud partagé** (sans serveur) : Sillon dépose la note chiffrée dans un dossier pCloud partagé, la Sillon de l'invité la lit. Demande : Sillon et pCloud chez l'invité, une clé par note partagée transmise à l'invité, une mise à jour non instantanée.
  - **Collaboration (plusieurs personnes modifient la même note)** : change les règles de base de Sillon. Conditions :
    - un **serveur relais** (le mini PC suffit pour quelques personnes), joint par Tailscale de préférence (invités ajoutés au réseau, rien d'ouvert sur Internet) ;
    - la **permission Internet**, limitée à un seul module de synchronisation ;
    - de **vrais comptes** : une identité et une paire de clés par personne ;
    - **chiffrement de bout en bout** : une clé par note partagée, remise aux seuls invités ; le serveur ne voit jamais le contenu ;
    - **fusion automatique des modifications** (structure de type CRDT : Yjs ou Automerge) à la place des copies de conflit ; c'est le changement le plus lourd, il touche au stockage des notes ;
    - **droits** (lecture, écriture, retrait d'un invité) et historique des modifications par auteur ;
    - **règle IA** : les notes des autres n'entrent pas dans les insights sans leur accord ;
    - **données personnelles** : héberger les notes d'autres personnes fait de l'utilisateur le responsable de ces données ; à cadrer avant d'ouvrir le partage.

## 8. Points ouverts et risques

- **pCloud comme dossier Android** : **confirmé** : écriture directe et envoi complet dans le cloud (lot 0) ; accès conservé après un redémarrage et suppressions espacées (lot 2). Reste à vérifier : la relecture d'une sauvegarde déjà envoyée (test 7 du lot 2).
- **Réponses de pCloud peu fiables** : pCloud peut signaler une erreur sur une écriture ou une suppression réussie, et refuse les actions trop rapprochées. Parade : une action à la fois et vérification par la liste du dossier.
- **Tâche de fond et dossier pCloud** : l'écriture en arrière-plan peut échouer si l'app pCloud est endormie ; la sauvegarde à l'ouverture de l'app sert de filet.
- **Mot de passe de sauvegarde perdu** = sauvegardes illisibles. Avertissement obligatoire.
- **Perte du téléphone sans sauvegarde récente** = perte des notes depuis la dernière sauvegarde.
- **Qualité des insights** avec un modèle de 1,2 milliard de paramètres : fragile sur la synthèse de textes libres. À mesurer au lot 4 sur notes fictives.
- **Remise en forme (F8)** : un modèle de 1,2 milliard de paramètres peut retirer ou modifier du contenu. Le gardien et la comparaison avant / après sont obligatoires ; mesurer au lot 4.1 sur notes fictives le taux de propositions refusées par le gardien.
- **Actions implicites (F9, 5b)** : risque d'actions inventées ou en double. Parades : phrase d'origine obligatoire, validation une par une, filtre des doublons. Pour une page avec beaucoup de sous-notes, le traitement note par note est plus lent : à mesurer.
- **Dates écrites en français** (F9, 5a) : « vendredi » ou « fin du mois » demandent des règles claires (vendredi = le prochain à venir). Les règles retenues seront écrites dans le cahier au lot 5a.
- **Partage simple (F10)** : un PDF ou un fichier partagé sort du contrôle de Sillon (copie en clair chez le destinataire et dans l'app utilisée). Le menu de partage le rappelle en une phrase.
- **Collaboration (long terme)** : passer d'une note en Markdown simple à une structure de fusion automatique demandera une migration des notes existantes. La préparation de la section 3.1 la rend plus simple, pas gratuite.
- **Copie en mode lecture (lot 1.1)** : l'affichage Markdown ne permet de sélectionner qu'un paragraphe à la fois. « Copier tout le texte » compense ; une sélection sur plusieurs paragraphes demanderait de changer de bibliothèque de rendu.
- **Dictée locale (F11)** : un modèle Whisper assez bon en français pèse plusieurs centaines de Mo et peut être lent sur le S21 ; à mesurer au banc d'essai du lot 6. Repli : petit modèle plus rapide, ou dictée Gboard hors connexion.
- **Changement de téléphone** (par exemple un Pixel 8 Pro) : refaire les mesures de l'IA.
