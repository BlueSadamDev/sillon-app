# DESIGN.md – Sillon

Référence visuelle : la direction **« A · Papier »** de la toile « Sillon – pistes de design » (écrans Accueil et Note). Ce fichier en fixe les règles pour le code. En cas de doute, il fait foi ; s'il doit changer, le modifier ici d'abord.

## Identité
- **Nom affiché** : « Sillon » (dans `app.json` : `name`). Le mot-symbole s'écrit **Sillon**, Satoshi Bold, espacement des lettres −0,02 em, couleur `ink`.
- **Logo** : deux sillons parallèles (deux traits ondulés) et une petite pousse qui sort du sillon du haut. Dessin de référence (viewBox 0 0 120 120), trait 9, bouts et jointures arrondis, couleur `ink` :
  - sillon bas : `M18 86 C38 72 52 72 60 80 S82 92 102 78` ;
  - sillon haut : `M18 62 C38 48 52 48 60 56 S82 68 102 54` ;
  - pousse : tige `M60 54 L60 30`, feuille `M60 38 C68 30 78 30 82 34 C76 42 66 42 60 38` en `accent`.
  - En petit (≤ 48 px) : retirer la feuille, trait 11.
- **Icône Android** : logo centré sur fond `bg` (`#F5F1E8`), icône adaptative (avant-plan = logo, arrière-plan = `bg`), le logo occupant environ 60 % de la zone sûre. Générer les fichiers à partir d'un SVG unique rangé dans `assets/brand/`.
- **Écran de démarrage** : fond `bg`, logo 120 px centré, « Sillon » en 36 px dessous, puis « Tes notes, et ce qui en pousse » (15 px, `inkMuted`).
- La feuille du logo est le seul usage décoratif de `accent`.

## Principes
- **Papier et encre** : fond crème, texte presque noir, une seule couleur d'accent (terracotta). Ambiance carnet, calme, éditoriale.
- **L'écriture d'abord** : sur l'accueil, la capture rapide reste visible sans défiler, juste sous la carte d'insight ; dans une note, le texte occupe l'écran, les outils restent discrets.
- **L'insight se distingue sans crier** : une seule carte foncée (`ink`) par écran, réservée à l'IA (« Le sillon de la semaine »).
- **La couleur porte un sens, jamais seule** : chaque état est accompagné d'un libellé texte.
- **Pas d'emoji, pas de dégradés, pas d'ombres portées.** Séparation par bordures fines (1 px `line`) et fonds `surface`. Icônes en trait (1,8 à 2 px), couleur du texte.
- Thème clair uniquement pour l'instant. Un thème sombre (inspiré de la direction « Nuit ») pourra venir plus tard.

## Couleurs (tokens)

| Token | Valeur | Usage |
| --- | --- | --- |
| `bg` | `#F5F1E8` | Fond de tous les écrans |
| `surface` | `#FBF8F2` | Cartes, champs, barre de navigation, barre d'outils |
| `surfaceAlt` | `#EDE6D7` | Pastilles de tags, fond des éléments sélectionnés |
| `line` | `#E1DACB` | Bordures, séparateurs (`#E4DED1` entre les lignes d'une liste) |
| `ink` | `#1D1B17` | Texte principal, carte d'insight (fond) |
| `inkSoft` | `#4E493F` | Citations, texte sur `surfaceAlt` |
| `inkMuted` | `#6A655B` | Libellés, dates, textes secondaires, onglets inactifs |
| `accent` | `#B4532A` | Bouton principal (fond), cases cochées, feuille du logo |
| `accentText` | `#9A4422` | Liens et texte en couleur d'accent sur `bg` / `surface` |
| `onInk` | `#F5F1E8` | Texte sur la carte d'insight |
| `onInkMuted` | `#D9CFBB` | Libellé de la carte d'insight |
| `onInkAccent` | `#F0B48F` | Lien dans la carte d'insight |
| `ok` | `#3F5A3A` sur `#E7EBDD` | Sauvegarde à jour |
| `warn` | `#8A5A00` sur `#F6E9C8` | Sauvegarde ancienne (plus de 3 jours) |
| `error` | `#A3322A` sur `#F6DEDA` | Dossier pCloud inaccessible, échec |

Contraste : tout texte atteint 4,5:1 sur son fond. **`accent` ne s'utilise jamais pour du petit texte sur `bg`** (contraste insuffisant) : prendre `accentText`. Le texte blanc sur `accent` est conforme.

## Typographie
- **Satoshi** (Regular 400, Medium 500, Bold 700), la police de X-Gallery, pour tout : titres et texte.
- Fichiers `.ttf` dans `assets/fonts/` (repris de X-Gallery), chargés avec `expo-font`, jamais depuis Internet (l'APK de production n'a pas la permission Internet).
- Pas d'italique réel dans Satoshi : les citations et l'italique Markdown utilisent l'italique simulé, avec parcimonie.

| Rôle | Taille / graisse |
| --- | --- |
| Salutation de l'accueil | 32 / 700, espacement −0,8 px |
| Titre d'une note | 30 / 700, interligne 1,15 |
| Texte d'insight (carte foncée) | 21 / 500, interligne 1,3 |
| Titre de carte (épinglée) | 17 / 700 |
| Corps d'une note (mode lecture) | 17 / 400, interligne 1,6 |
| Corps d'une note (mode écriture), champ de saisie | 16 / 400 |
| Titre d'une ligne de liste | 15 / 500 |
| Texte secondaire, extrait | 13 / 400, `inkMuted` |
| Libellé de section | 13 / 700, `inkMuted` |
| Libellé de la carte d'insight | 12 / 500, MAJUSCULES, espacement 1 px, `onInkMuted` |
| Petites mentions, onglets | 11–12 / 400 |

## Espacements et formes
- Marges d'écran : 22 px (accueil), 26 px (corps d'une note). Espacement entre blocs : 22 px. Grilles : 10 px.
- Rayons : carte d'insight 20 px, champ de capture 16 px, cartes 14–16 px, boutons 10–12 px, pastilles 999 px.
- **Cibles tactiles ≥ 44 px** (boutons, onglets, cases, liens de liste).

## Composants
- **Champ de capture rapide** : fond `surface`, bordure `line`, rayon 16, texte 16 px, invitation « Une idée, une pensée… » ; à droite, bouton carré 44 px fond `accent`, icône « + » blanche. Valider crée la note et ouvre l'éditeur, ou l'enregistre directement si le texte tient sur une ligne (à trancher au lot 1).
- **Carte d'insight** (« Le sillon de la semaine ») : fond `ink`, rayon 20, padding 20 ; libellé en majuscules `onInkMuted` ; phrase en 21/500 `onInk` ; lien « Voir les notes liées → » en `onInkAccent`. Avant le lot 4 : même carte avec « Sillon repérera ici les idées qui reviennent dans tes notes. »
- **Carte épinglée** : fond `surface`, bordure `line`, rayon 14, titre 17/700, mention « N sous-notes » en `inkMuted`. Deux par ligne.
- **Ligne de note (liste)** : titre 15/500, extrait 13 px `inkMuted` sur une ligne (points de suspension), date à droite en 12 px ; séparateur 1 px en bas. Toute la ligne est cliquable.
- **Glissement d'une ligne** (récentes de l'accueil) : vers la droite, fond `error` et libellé « Corbeille » ; vers la gauche, fond `surfaceAlt` et libellé « Archiver ». L'action part au-delà d'environ un tiers de la largeur, puis un message propose « Annuler ». Les mêmes actions sont offertes aux lecteurs d'écran.
- **Pastille d'état de la sauvegarde** : pilule 12 px, icône + libellé (« À jour », « Il y a 4 jours », « À vérifier »), couleurs `ok` / `warn` / `error`. Toucher ouvre l'écran Compte.
- **Pastille de tag** : fond `surfaceAlt`, texte 12 px `inkSoft`, « #mot ».
- **Bouton principal** : fond `accent`, texte blanc 14–15/700, hauteur 44–52 px, rayon 10–12.
- **Bouton secondaire** : contour `line`, fond `surface`, texte `ink`.
- **Barre d'outils Markdown** (au-dessus du clavier) : fond `surface`, bordure haute `line` ; boutons 44 × 44 transparents : Titre (H), Gras (B), Italique (I), Liste, Case à cocher, Lien vers une note `[[ ]]` ; à droite, bouton principal « Lire » / « Écrire » pour basculer de mode.
- **Bloc « Notes liées »** (bas d'une note, lot 3) : carte `surface`, libellé avec l'icône de pousse, puces cliquables (fond `bg`, bordure `line`, rayon 10, 13 px).
- **Citation** : trait vertical 2 px `#D9CFBB` à gauche (bordure intérieure, pas une carte), texte `inkSoft` en italique.
- **Case à cocher** : 18 px, couleur `accent` ; tâche faite barrée et en `inkMuted`.
- **Barre de navigation** : 4 onglets égaux (Accueil, Pages, Recherche, Insights), icône 22 px + libellé 11 px, actif en `ink` 700, inactifs en `inkMuted`, fond `surface`, bordure haute `line`.

## Écrans du lot 1
1. **Démarrage** : voir « Identité ».
2. **Création du compte** (premier lancement) : logo + « Bienvenue dans Sillon » ; champs identifiant, mot de passe, confirmation ; encadré `surface` qui explique en une phrase qu'un mot de passe oublié ne se récupère pas ; bouton principal « Créer mon compte ». Lien secondaire « Restaurer une sauvegarde » (actif au lot 2).
3. **Activer l'empreinte** : une phrase, bouton principal « Activer », bouton secondaire « Plus tard ».
4. **Déverrouillage** : logo, « Bonjour » suivi de l'identifiant, demande d'empreinte automatique, bouton « Utiliser mon mot de passe ».
5. **Accueil** : date (13 px `inkMuted`) et salutation ; à droite, pastille de sauvegarde (à partir du lot 2) et bouton rond du compte (initiale) ; carte d'insight ; champ de capture ; épinglées ; récentes ; barre de navigation.
6. **Note** : en-tête avec retour, chemin de la page (« Parent › Note », 12 px `inkMuted`), bouton principal « Enregistrer » en mode écriture (enregistre et revient) et menu « … » (épingler, ajouter une sous-note, déplacer, archiver, mettre à la corbeille) ; titre ; tags et date de modification ; corps ; barre d'outils Markdown en mode écriture.
7. **Pages** : arborescence dépliable, bouton « Nouvelle page », archives puis corbeille en bas de liste.
8. **Recherche** : champ en haut, résultats en lignes de note avec le mot trouvé en gras.
9. **Compte** : groupes « Sécurité » (mot de passe, empreinte, délai de verrouillage), « Sauvegarde » (dossier pCloud, dernière sauvegarde, « Sauvegarder maintenant », « Restaurer » ; actif au lot 2), « Données » (exporter en clair, effacer toutes les données).

## États à toujours prévoir
- **Carnet vide** : sur l'accueil, la capture rapide et une phrase d'invitation à la place des récentes ; pas de section « Épinglées ».
- **Pas encore d'insight** : carte d'insight avec le texte d'attente (voir Composants).
- **Sauvegarde jamais configurée** : pastille `warn` « Sauvegarde à configurer », qui ouvre l'écran Compte.
- **Dossier pCloud inaccessible** : pastille `error` et message dans Compte avec « Choisir le dossier à nouveau ».
- **Modèle IA absent** (lot 4) : les écrans d'insight expliquent comment importer le modèle, sans erreur technique.
- **Notes fictives** : uniquement dans les tests et les maquettes, jamais dans l'app livrée.

## Textes

Sillon parle comme un carnet attentif : sobre, une phrase complète, jamais de jargon. Français, tutoiement.

### Règles
1. Une phrase avec un verbe, pas une étiquette. Les étiquettes courtes restent permises pour les titres de section, les onglets et les pastilles.
2. L'IA propose, l'utilisateur décide : « Sillon propose ces tags », jamais « Tags ajoutés » sans validation.
3. Chaque insight dit d'où il vient : « dans 4 notes depuis lundi », avec un lien vers ces notes.
4. Un seul élément en relief par phrase : le mot ou le thème qui compte, ou l'action.
5. Pas de machinerie visible : vrais pluriels (jamais « (s) »), aucun message d'erreur technique, pas de « à définir » mais une invitation.
6. Typographie française : apostrophe ’, guillemets « », espace insécable avant : ; ! ?

### Glossaire (un mot par notion)
| Notion | Mot retenu | À abandonner |
| --- | --- | --- |
| Une note, quelle que soit sa profondeur | note (« page » seulement pour l'onglet Pages et une note qui contient des sous-notes) | document, fiche, bloc |
| Note contenue dans une autre | sous-note | enfant, page fille |
| Ce que l'IA produit | insight sur l'onglet ; dans les phrases, « Sillon a repéré… » | analyse, IA, LLM |
| Note proche par le sens | note liée | similaire, embedding |
| Copie chiffrée dans pCloud | sauvegarde | backup, export chiffré |
| Fichier en clair | export | sauvegarde en clair |
| Corbeille (effacement après 30 jours) | corbeille | — |
| Note retirée de l'accueil, gardée sans limite | archive, archiver | — |

### Relief
- Relief = Satoshi Bold dans la couleur du texte principal. Jamais plus d'un élément en relief par phrase.
- Un même message n'apparaît qu'une fois par écran.

### Exemples avant / après (le relief est entre astérisques)
| Avant | Après |
| --- | --- |
| Thème : sommeil (4) | « *Sommeil* » revient dans 4 notes depuis lundi. |
| Backup OK | Sauvegardé *aujourd’hui*. |
| Erreur SAF : permission revoked | Sillon n’a plus accès à ton dossier pCloud. *Choisis-le à nouveau.* |
| Aucun résultat | Rien ne correspond à « lisbone ». *Vérifie l’orthographe* ou cherche par thème. |
| Modèle non chargé | Pour les insights, Sillon a besoin de son modèle. *Importe-le* depuis Compte. |
| Note supprimée | Note mise à la corbeille. *Annuler* |
