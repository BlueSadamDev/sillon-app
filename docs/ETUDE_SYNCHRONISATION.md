# Étude – Synchronisation entre appareils et collaboration

Version 1.0 (24 novembre 2026). Statut : **étude de conception**, rien n'est développé. Elle prépare les lots 7.0, 7, 7.1 et 8 du cahier des charges.

## En bref

- **Objectif** : retrouver les mêmes notes sur le téléphone (Samsung Galaxy S21) et sur une **tablette Android**, modifiables sur les deux, même hors connexion ; puis, plus tard, partager des espaces de notes avec d'autres personnes et écrire à plusieurs.
- **Choix retenu (option D)** : un **relais** installé sur le mini PC de la maison (Minisforum Z83-F), joint uniquement par **Tailscale**. Le relais garde et transmet des messages **chiffrés et signés par les appareils** : il ne peut ni les lire ni les falsifier.
- **Fusion des modifications** : chaque note devient un document **Yjs** (structure de type CRDT, qui fusionne toujours sans conflit). Le Markdown actuel reste tenu à jour à côté, pour la recherche, l'IA, le partage et la sauvegarde.
- **Clés** : une **clé de coffre** tirée au sort, transmise d'un appareil à l'autre par **QR code + quatre mots de vérification**, et une **clé de secours** de 24 mots sur papier.
- **Ce qui change dans les règles** : l'APK de production obtient la permission Internet, **limitée au seul module de synchronisation et à l'adresse Tailscale du relais**. Le relais est le seul « serveur » de Sillon, et il ne voit jamais le contenu.

Vocabulaire :
- **Relais** : petit programme sur le mini PC qui reçoit les messages d'un appareil et les remet aux autres. Il ne fait aucun calcul sur les notes.
- **Tailscale** : réseau privé chiffré entre tes appareils (technologie WireGuard). Le mini PC n'est visible que de tes appareils, rien n'est ouvert sur Internet.
- **Chiffrement de bout en bout** : seuls tes appareils ont les clés ; tout ce qui passe entre eux est illisible pour les intermédiaires.
- **Signature** : preuve mathématique qu'un message vient bien d'un de tes appareils et n'a pas été modifié.
- **CRDT / Yjs** : façon d'enregistrer un texte comme une suite d'opérations qui se combinent toujours de la même manière, dans n'importe quel ordre. Deux appareils qui ont écrit chacun de leur côté finissent avec le même texte, sans perte.

## 1. Pourquoi le relais sur le mini PC (option D)

| Option étudiée | Verdict |
| --- | --- |
| A. Dossier pCloud comme boîte aux lettres | Écartée par choix : délai de plusieurs minutes, réponses de pCloud peu fiables (lot 0), pas de temps réel ni de collaboration confortable. |
| B. Syncthing entre appareils | Écartée : app tierce de plus à surveiller, application Android maintenue par une équipe récente. |
| C. Liaison directe entre appareils | Écartée : les deux appareils doivent être allumés en même temps. |
| **D. Relais sur le mini PC via Tailscale** | **Retenue** : quasi temps réel, fonctionne hors de la maison, prête pour la collaboration, le relais ne voit rien, tout reste chez toi. |
| E. Solution clés en main (Evolu, Jazz…) | Écartée : remplacerait toute la base de Sillon ; fusion champ par champ, pas à l'intérieur d'un texte. |

Ce que le relais apporte en plus d'un simple dépôt de fichiers :
- il **refuse** tout appareil non autorisé, et **coupe immédiatement** un appareil retiré ;
- il prévient instantanément les appareils connectés qu'une modification est arrivée ;
- il est **jetable** : chaque appareil a toutes ses notes ; si le mini PC tombe en panne, on réinstalle le relais et les appareils renvoient leurs données.

## 2. Vue d'ensemble

```
 Téléphone (S21)                    Mini PC (Z83-F)                     Tablette Android
 ┌──────────────┐   Tailscale     ┌──────────────────┐   Tailscale    ┌──────────────┐
 │ Sillon       │ ◄─────────────► │ Relais Sillon    │ ◄────────────► │ Sillon       │
 │ notes en     │  messages       │ (stocke et       │  messages      │ notes en     │
 │ clair, clés  │  chiffrés et    │  transmet des    │  chiffrés et   │ clair, clés  │
 │ privées      │  signés         │  messages        │  signés        │ privées      │
 └──────┬───────┘                 │  illisibles)     │                └──────────────┘
        │                         │ AdGuard Home     │
        │ sauvegarde chiffrée     │ (inchangé)       │
        ▼ (lot 2, inchangée)      └──────────────────┘
   Dossier pCloud
```

- Chaque appareil garde **toutes** ses notes en local et fonctionne sans le relais.
- Le relais ne garde que des messages chiffrés, classés par note (identifiant aléatoire) et par appareil.
- La sauvegarde pCloud du lot 2 **reste en place**, indépendante de la synchronisation : c'est le filet de sécurité contre un défaut de synchro qui effacerait des notes partout.

## 3. Ce qui change dans les règles de Sillon

| Règle actuelle | À partir du lot 7 |
| --- | --- |
| Pas de serveur | Un relais sur le mini PC, qui ne voit jamais le contenu. Sillon reste utilisable sans lui. |
| APK de production sans permission Internet | Permission Internet présente, mais **seul `src/sync/` ouvre des connexions**, et uniquement vers l'adresse du relais (nom en `.ts.net` ou adresse Tailscale `100.64.0.0/10`). Un test automatique (`networkGuard.test.ts`) échoue si `fetch`, `WebSocket` ou `XMLHttpRequest` apparaît ailleurs dans le code. |
| Un seul téléphone | Plusieurs appareils du même utilisateur (téléphone et tablette au départ). |
| Un compte local | Inchangé sur chaque appareil (mot de passe et empreinte propres à chaque appareil). S'y ajoute une **clé de coffre** commune et une **paire de clés par appareil**. |
| Copie de conflit | Fusion automatique par Yjs ; historique des versions pour revenir en arrière. |

Rien ne change pour l'IA (toujours 100 % sur l'appareil), le partage simple (lot 2.1) et la sauvegarde pCloud.

## 4. Le relais sur le mini PC

### 4.1 Machine et système
- **Matériel** : Atom x5-Z8350, 4 Go de RAM (non extensibles), 64 Go eMMC. Le relais demande peu : quelques dizaines de Mo de mémoire, quelques Mo de disque pour des milliers de notes.
- **Système retenu** : Debian stable, sans interface graphique (décision du 24 novembre 2026). Si le mini PC tourne aujourd'hui sous Windows, le passage à Debian demande de réinstaller AdGuard Home (qui existe pour Linux) en reprenant sa configuration.
- **Coexistence avec AdGuard Home** : le relais utilise un port libre (par exemple 8443), jamais les ports 53, 80 ou 3000. La configuration d'AdGuard Home n'est jamais touchée.

### 4.2 Logiciel
- **Node.js (TypeScript)** : même langage que l'app, ce qui permet de **partager le format des messages et ses tests** entre l'app et le relais. Base **SQLite** (une table de messages, une table d'appareils autorisés).
- Le relais **ne contient pas Yjs** et ne déchiffre rien : il range des messages opaques et les redistribue.
- Lancé par un service système (`systemd`), redémarré automatiquement, mis à jour par une procédure écrite (sauvegarde de sa base, mise à jour, vérification).
- Code rangé dans `server/` du dépôt, avec ses tests et un guide d'installation pas à pas, commandes à copier-coller.

### 4.3 Réseau
- Le relais **n'écoute que sur l'interface Tailscale** du mini PC. Pare-feu : tout refusé sauf Tailscale.
- Connexion **WebSocket** (canal ouvert en permanence pendant que l'app est à l'écran). Chiffrement à trois couches : WireGuard (Tailscale), TLS avec un certificat `*.ts.net` fourni par Tailscale, puis le chiffrement de bout en bout de Sillon.
- **Liste d'accès Tailscale** : seuls tes appareils peuvent joindre le port du relais.
- **Bonus** : déclarer AdGuard Home comme serveur DNS du réseau Tailscale filtre aussi les publicités sur le téléphone et la tablette hors de la maison.

### 4.4 Ce que le relais voit et ne voit pas
- **Voit** : les clés publiques des appareils autorisés, les identifiants aléatoires des notes, la taille (arrondie) et l'heure des messages, quel appareil envoie quand.
- **Ne voit pas** : titres, textes, tags, arborescence, nombre de mots, contenu de l'historique.
- **Peut** : retenir ou supprimer des messages (détecté par les numéros de séquence, réparé par les appareils ou la sauvegarde).
- **Ne peut pas** : lire, modifier ou inventer une note, ni ajouter un appareil.

## 5. Identités et clés

Toutes les opérations utilisent **libsodium**, déjà présente dans Sillon (aucune cryptographie maison) :
- chiffrement : XChaCha20-Poly1305 (comme la sauvegarde) ;
- signatures : Ed25519 ;
- envoi d'une clé à un seul appareil : « boîte scellée » (X25519) ;
- empreintes : BLAKE2b.

Le lot 7.0 vérifie que `react-native-libsodium` 1.7.0 fournit bien ces fonctions (le lot 0 y a trouvé deux limites, contournées).

### 5.1 Les clés
| Clé | Où elle vit | Rôle |
| --- | --- | --- |
| **Clé de coffre** (32 octets tirés au sort) | Coffre sécurisé de chaque appareil (`expo-secure-store`) | Chiffre toutes les notes synchronisées |
| **Paire de clés d'appareil** (signature + boîte) | Coffre sécurisé de l'appareil, jamais copiée | Signer les messages ; recevoir la clé de coffre |
| **Clé de secours** (24 mots en français) | Papier, chez toi | Retrouver la clé de coffre si tous les appareils sont perdus |
| Mot de passe de sauvegarde (lot 2) | Inchangé | Sauvegarde pCloud |

La clé de coffre porte un **numéro d'époque** : quand elle change (appareil retiré), les nouveaux messages utilisent la nouvelle, et les appareils gardent les anciennes pour relire l'historique.

### 5.2 Mise en service (une fois)
1. Installation du relais sur le mini PC : il affiche un **code d'installation à usage unique**.
2. Sur le téléphone, « Activer la synchronisation » : adresse du relais (ou QR code affiché par le relais) + code d'installation. Le téléphone crée la clé de coffre et sa paire de clés, et s'enregistre comme premier appareil.
3. Sillon affiche la **clé de secours** (24 mots) et demande d'en retaper trois pour vérifier qu'elle est bien notée.
4. Les notes existantes sont converties en documents Yjs et envoyées (chiffrées) au relais.

### 5.3 Ajouter la tablette (appairage)
1. Sur la tablette : « Rejoindre mon coffre » → elle crée sa paire de clés et affiche un **QR code** (sa clé publique + l'adresse du relais + un identifiant d'appairage temporaire).
2. Sur le téléphone : « Ajouter un appareil » → il scanne le QR code (permission caméra, `expo-camera`).
3. Les deux écrans affichent **quatre mots de vérification** calculés à partir des deux clés publiques. Tu vérifies qu'ils sont identiques et tu confirmes sur les deux : personne ne s'est glissé entre les deux appareils.
4. Le téléphone signe une **autorisation d'appareil** (le relais n'accepte un nouvel appareil que sur présentation de cette autorisation) et envoie la clé de coffre à la tablette, scellée pour elle seule.
5. La tablette télécharge et déchiffre toutes les notes.

Sans caméra : la tablette affiche un code de 8 mots à saisir sur le téléphone, puis même vérification des quatre mots.

### 5.4 Authentification auprès du relais
Pas de mot de passe sur le relais : à chaque connexion, le relais envoie un défi aléatoire, l'appareil le signe avec sa clé privée, le relais vérifie avec la clé publique enregistrée.

### 5.5 Appareil perdu ou retiré
1. Depuis un autre appareil : « Mes appareils » → « Retirer » → le relais le **coupe immédiatement**.
2. Une **nouvelle clé de coffre** (nouvelle époque) est créée et envoyée aux appareils restants : l'appareil retiré ne pourra plus rien lire de nouveau.
3. **Effacement à distance** : si l'appareil retiré se reconnecte un jour, le relais lui remet son avis de retrait signé ; Sillon efface alors ses données locales.
4. Ce qu'il contenait déjà reste protégé par le verrouillage de Sillon et le chiffrement d'Android.
5. Chaque ajout ou retrait d'appareil déclenche une **notification sur tous les autres appareils** (« Un nouvel appareil a rejoint ton coffre »).

### 5.6 Tout perdu
Nouveau téléphone + clé de secours → Sillon retrouve la clé de coffre. Le relais exige toutefois un appareil autorisé : la remise à zéro de la liste des appareils se fait par une **commande sur le mini PC**. À défaut de relais, la sauvegarde pCloud permet de tout restaurer.

## 6. Données et fusion

### 6.1 Une note = un document Yjs
- Contenu d'un document : `title` (texte), `body` (texte Markdown), `meta` (note parente, épinglée, archivée, date de mise à la corbeille), `authorId`, et plus tard `comments`.
- Les tags restent calculés à partir du texte (`#mot`), comme aujourd'hui.
- **Matérialisation** : après chaque modification (locale ou reçue), `src/db/` réécrit la ligne de la table `notes` (titre, Markdown, métadonnées). La recherche par mots, la recherche par le sens, l'IA, le partage et la sauvegarde continuent de lire cette table **sans changement**.
- Nouvelle table locale `note_updates` (modifications Yjs, en clair sur l'appareil, protégées comme les notes) et `sync_state` (ce que chaque appareil a déjà reçu).
- Règle « toutes les écritures passent par `src/db/` » : c'est elle qui permet de transformer chaque modification en opération Yjs à un seul endroit.

### 6.2 Brancher l'éditeur sur Yjs
- À chaque frappe, l'éditeur compare l'ancien et le nouveau texte (partie commune au début et à la fin) et transmet à Yjs une seule opération « supprimer / insérer ».
- Quand une modification arrive d'un autre appareil pendant l'écriture, le texte se met à jour et le curseur est replacé grâce aux **positions relatives** de Yjs (le curseur suit le mot où il était).
- Point à mesurer au lot 7.0 : fluidité de la frappe et absence de saut du curseur dans le champ de saisie de React Native.

### 6.3 Arborescence
- Déplacer une note change sa note parente. Si deux déplacements simultanés créent une boucle (A dans B et B dans A), une règle fixe la casse : la note déplacée le plus récemment remonte à la racine, et un message l'explique.
- Corbeille de 30 jours synchronisée ; l'effacement définitif supprime aussi le document sur le relais.

### 6.4 Historique des versions
- Chaque appareil garde localement des **versions Markdown** d'une note : avant toute fusion avec des modifications d'un autre appareil, et toutes les 30 minutes d'écriture. Conservation 30 jours (réglable).
- Écran « Versions » d'une note : voir, comparer, restaurer (la restauration est une nouvelle modification, synchronisée).

## 7. Protocole de synchronisation

### 7.1 Enveloppe d'un message
| Champ | En clair pour le relais | Rôle |
| --- | --- | --- |
| `docId` | oui (identifiant aléatoire) | Note concernée |
| `deviceId` | oui | Appareil émetteur |
| `seq` | oui | Numéro croissant par appareil : détecte trous et répétitions |
| `epoch` | oui | Époque de la clé de coffre |
| `kind` | oui | Modification ou instantané |
| `payload` | **non** (chiffré) | Modification Yjs, complétée jusqu'à une taille arrondie |
| `signature` | oui | Signature Ed25519 de tous les champs ci-dessus |

La donnée associée du chiffrement contient `docId`, `deviceId`, `seq`, `epoch` et `kind` : un message déplacé vers une autre note ou rejoué est refusé au déchiffrement.

### 7.2 Échanges
- **App à l'écran** : connexion WebSocket ; envoi immédiat de chaque modification (regroupées toutes les 1 à 2 secondes pendant la frappe) ; réception en direct.
- **App en arrière-plan** : tâche de fond au plus toutes les 15 minutes (limite d'Android) qui envoie et reçoit. **Aucune notification Google (Firebase)** : Sillon ne dépend d'aucun service tiers en dehors de Tailscale.
- **Hors connexion** : les modifications attendent dans une file locale et partent au retour du réseau, dans l'ordre.
- **Rattrapage** : à la connexion, l'appareil donne pour chaque autre appareil le dernier `seq` reçu ; le relais renvoie la suite.

### 7.3 Compactage
Quand une note accumule beaucoup de petites modifications, un appareil envoie un **instantané** chiffré (l'état complet fusionné). Le relais peut alors effacer les modifications antérieures couvertes par cet instantané. Le relais reste petit, et une tablette qui arrive récupère vite les notes.

### 7.4 Tests prévus
- Les tests Jest font tourner **deux ou trois appareils simulés et un relais en mémoire**.
- Un **banc de chaos** les soumet à des messages perdus, répétés, dans le désordre, des coupures et des retours tardifs, et vérifie que tous les appareils finissent avec le même texte.
- Mêmes règles de notes fictives que le reste du projet.

## 8. Sécurité : menaces et parades

| Menace | Ce qui se passe | Parade |
| --- | --- | --- |
| Mini PC piraté | Lecture de la base du relais | Contenu chiffré de bout en bout ; signatures : rien ne peut être inventé ; métadonnées réduites (identifiants aléatoires, tailles arrondies) |
| Relais qui retient ou supprime des messages | Un appareil ne reçoit pas tout | Numéros de séquence (trou détecté, message « synchronisation incomplète ») ; les appareils renvoient ; sauvegarde pCloud |
| Compte Tailscale piraté | Un intrus rejoint le réseau privé | Le relais exige une clé d'appareil autorisée ; rien n'est lisible. Parade amont : double authentification sur le compte Tailscale, approbation manuelle des nouvelles machines |
| Téléphone ou tablette perdus | Accès physique à un appareil | Verrouillage de Sillon, chiffrement d'Android ; retrait de l'appareil, nouvelle clé de coffre, effacement à sa prochaine connexion |
| Attaque pendant l'appairage | Un intrus se fait passer pour la tablette | QR code lu en personne + quatre mots de vérification |
| Défaut de synchronisation | Une note abîmée ou effacée partout | Historique des versions, corbeille de 30 jours, sauvegarde pCloud indépendante, banc de chaos |
| Code réseau ajouté par erreur | Fuite de données vers un tiers | Permission Internet limitée à `src/sync/`, test `networkGuard`, liste d'adresses autorisées |
| Erreur de cryptographie | Protection plus faible que prévu | Uniquement des fonctions libsodium standard ; construction inspirée de secsync (architecture publique pour relayer des CRDT chiffrés) ; relecture du protocole avant le lot 7 |

## 9. Effets sur les fonctions existantes

| Fonction | Effet |
| --- | --- |
| Sauvegarde pCloud (lot 2) | Inchangée. Faite par **un seul appareil désigné** (le téléphone, décision du 24 novembre 2026), pour éviter deux rotations concurrentes dans le même dossier. Restaurer une sauvegarde sur un coffre synchronisé = nouvelle version de toutes les notes, envoyée aux autres appareils, après confirmation explicite. |
| Recherche par mots et par le sens (lot 3) | Inchangées : elles lisent la table `notes` matérialisée. Les vecteurs sont recalculés sur chaque appareil. |
| IA (lots 4, 4.1, 5) | Inchangée sur chaque appareil. La remise en forme (lot 4.1) produit une modification normale, donc synchronisée. Les tableaux d'actions restent calculés à partir des notes. |
| Partage simple (lot 2.1) | Inchangé. |
| Brouillon de la capture, réglages, compte local | Propres à chaque appareil, jamais synchronisés (règle 3 « Préparer le partage »). |
| Identifiant d'auteur | Devient la clé publique de ton identité au lot 8 ; les notes existantes sont rattachées à toi. |

## 10. La tablette

- **Même APK** que le téléphone : aucune version particulière à construire.
- **Écran en deux colonnes** (lot 7.1) : liste ou arborescence à gauche, note à droite, dès que l'écran est assez large.
- Le modèle d'IA s'importe sur la tablette comme sur le téléphone (taille et empreinte vérifiées).
- **Idée pour plus tard, l'appareil jardinier** : la tablette, branchée la nuit et peut-être plus puissante, calcule les vecteurs et les insights, voire avec un modèle plus grand, et les envoie chiffrés au téléphone, qui économise sa batterie.

## 11. Préparer la collaboration (lot 8)

Le relais et le format ci-dessus sont conçus pour s'étendre à plusieurs personnes sans réécriture.

- **Identités** : chaque personne a une **clé d'identité** qui certifie ses appareils. Les autres voient « Loïc » et non une liste d'appareils.
- **Espaces partagés** : on partage une page et ses sous-notes. Chaque espace a **sa propre clé** ; tes autres notes restent chiffrées avec ta clé de coffre, hors d'atteinte des invités.
- **Accès des invités au relais** : la fonction de **partage de machine** de Tailscale donne accès au seul mini PC (port du relais), sans montrer le reste de ton réseau. Rien n'est ouvert sur Internet.
- **Invitation** : en personne par QR code + quatre mots ; à distance par un lien dont le secret est placé après le `#` (jamais envoyé à un serveur), avec vérification des quatre mots par téléphone.
- **Droits** : lecture ou écriture. Le relais ne sert un espace qu'à ses membres, et chaque Sillon **refuse les modifications signées par un membre sans droit d'écriture**, même si le relais les laissait passer.
- **Retirer un membre** : le relais le coupe, et une nouvelle clé d'espace est créée. Il garde ce qu'il avait déjà vu, mais plus rien de nouveau.
- **Présence** : qui est dans la note et où est son curseur (fonction « awareness » de Yjs, chiffrée, jamais enregistrée).
- **Commentaires** et **historique par auteur**.
- **IA** : les notes d'un espace partagé n'entrent dans tes insights que si l'espace l'autorise ; un insight d'espace ne cite que ce que tous les membres voient.
- **Lecteur sans Sillon (idée)** : une page web statique déchiffre dans le navigateur une note dont le contenu chiffré et la clé tiennent dans le lien (après le `#`). C'est un instantané en lecture seule, et aucun serveur ne stocke rien.
- **Données personnelles** : héberger les notes d'autres personnes fait de toi le responsable de ces données. Entre proches, on reste en principe dans l'exception « activité personnelle ou domestique » du RGPD ; au-delà, à cadrer avant d'ouvrir l'accès.

## 12. Risques et points ouverts

- **Éditeur + Yjs** : fluidité de la frappe, curseur, gros textes. Premier point du lot 7.0.
- **Disponibilité du relais** : coupure de courant, box, mises à jour. Sans gravité (Sillon marche sans relais), mais la synchro attend.
- **Dépendance à Tailscale** (service d'une entreprise) : son serveur de coordination connaît la liste de tes machines, pas le trafic. Alternative plus tard : Headscale (serveur de coordination libre, à héberger soi-même).
- **Emplacement VPN d'Android** : Tailscale l'occupe ; incompatible avec un autre VPN actif en même temps.
- **Batterie** : connexion ouverte seulement app à l'écran, tâche de fond espacée. À mesurer au lot 7.0.
- **Migration des notes existantes** vers Yjs : une seule fois, testée sur notes fictives, avec sauvegarde forcée juste avant.
- **Complexité** : c'est le chantier le plus lourd de Sillon. D'où un lot de faisabilité, un banc de chaos et une relecture du protocole avant le lot 7.

## 13. Décisions prises (24 novembre 2026)

1. **Système du mini PC : Debian** (stable, sans interface graphique). AdGuard Home est réinstallé sous Debian si nécessaire, avec sa configuration actuelle.
2. **Place dans la feuille de route** : lots 7.0 et 7 **juste après le lot 3**, avant les lots 4, 4.1 et 5.
3. **Appareil chargé de la sauvegarde pCloud** : le téléphone.

## 14. Découpage proposé

- **Lot 7.0 – Faisabilité de la synchronisation** (rapport `docs/RAPPORT_LOT_7_0.md`) :
  1. relais prototype sur le Z83-F via Tailscale : mémoire, délai, reconnexions, cohabitation avec AdGuard Home ;
  2. Yjs dans l'app (moteur Hermes) et branchement de l'éditeur : fluidité, curseur ;
  3. fonctions libsodium disponibles (signatures, boîtes scellées, empreintes) ;
  4. appairage par QR code (`expo-camera`) ;
  5. synchronisation en tâche de fond et consommation de batterie.
- **Lot 7 – Duo téléphone et tablette** :
  - installation du relais (scripts, service, pare-feu, guide pas à pas) ;
  - clé de coffre, appairage, clé de secours, écran « Mes appareils » (retrait, effacement à distance) ;
  - migration des notes vers Yjs, synchronisation, historique des versions ;
  - test `networkGuard`, banc de chaos ;
  - sauvegarde depuis l'appareil désigné.
- **Lot 7.1 – Écran tablette** : affichage en deux colonnes.
- **Lot 8 – Collaboration** : identités, espaces partagés, invitations, droits, présence, commentaires, règle IA. Ce lot fera l'objet de son propre complément au cahier des charges.

Dépendances à prévoir (validées au début de chaque lot) : `yjs`, `expo-camera` (lot 7), et côté relais Node.js avec une bibliothèque WebSocket et SQLite.
