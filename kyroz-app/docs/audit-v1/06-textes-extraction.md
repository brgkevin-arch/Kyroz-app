# Audit V1 — Étape 6a : Extraction des textes
Date : 2026-08-26 · Commit audité : `e731e80` · Périmètre : les **14 écrans** de `app/`, les **49 composants** de `components/`, `constants/legal.ts`, `lib/notifications.ts`, `lib/reminder.ts`, `lib/methodologie.ts`

> **Aucun i18n dans le dépôt** — tous les textes sont en dur. Le dump est donc extrait du code, mécaniquement, **sans reformulation ni correction**, y compris des fautes éventuelles.
> Sortie 1 : `docs/audit-v1/06-textes-dump.md` (**753 chaînes**, 53 blocs).
> Cette sortie-ci ne contient que des faits mécaniques. **Aucun jugement de sens, de ton ou d'honnêteté** — c'est l'objet de l'étape 6b, sur Claude.ai.

## Reste à couvrir

- [x] existence d'un fichier i18n → **aucun**, textes en dur
- [x] les 14 écrans de `app/`, dans l'ordre de rencontre
- [x] les 49 composants partagés
- [x] alertes, toasts, notifications (`lib/notifications.ts`, `lib/reminder.ts`)
- [x] textes légaux (`constants/legal.ts` ↔ `public/legal.html`)
- [x] `store.config.json` → **absent** (cf. étape 3, constat 03-08)
- [x] compteurs, doublons approximatifs, typographie, anglais résiduel

## Compteurs

| Mesure | Valeur |
|---|---|
| **Chaînes extraites, au total** | **728** |
| dont marquées `⚑` | **93** (12,8 %) |
| Fichier de chaînes (i18n) | **aucun** — 100 % des textes sont en dur |
| Clés inutilisées | *sans objet* (pas d'i18n) |
| Chaînes depuis les **écrans** | 244 |
| Chaînes depuis les **composants partagés** | 260 |
| Chaînes hors écrans (légal, notifications, méthodologie) | 224 |
| Chaînes anglaises résiduelles | **1** |

**Par écran** (dans l'ordre où l'utilisateur les rencontre) :

| Écran | Chaînes | dont `⚑` |
|---|---|---|
| `app/(auth)/login.tsx` | 19 | 3 |
| `app/(auth)/onboarding.tsx` | 28 | 2 |
| `app/(tabs)/plan.tsx` | 22 | 1 |
| `app/(tabs)/recettes.tsx` | 8 | 1 |
| `app/(tabs)/courses.tsx` | 19 | 0 |
| `app/(tabs)/reserve.tsx` | 21 | 1 |
| **`app/(tabs)/profil.tsx`** | **101** | **11** |
| `app/kyroz-plus.tsx` | 11 | 1 |
| `app/avis.tsx` | 8 | 0 |
| `app/methodologie.tsx` | 4 | 0 |
| `app/legal.tsx` | 3 | 0 |

**Par rôle** : corps 406 · aide 91 · bouton 64 · label 53 · titre 48 · vide 24 · placeholder 19 · a11y 17 · erreur 6.

⚠️ `app/(tabs)/profil.tsx` porte **101 chaînes à lui seul**, soit 41 % de tout le texte des écrans — cohérent avec ses 2 066 lignes (constat 04-06). C'est le fichier que l'étape 6b devra lire le plus attentivement.

## Doublons approximatifs

Même action, mots différents. Faits, sans arbitrage.

| Famille | Variantes trouvées (occurrences) |
|---|---|
| **Valider / enregistrer** | **Enregistrer** (2) · **Valider** (1) · **OK** (1) · **Continuer** (1) |
| **Annuler / fermer** | **Annuler** (8) · **Fermer** (2) · **Plus tard** (2) · **Revenir à la connexion** (2) |
| **Supprimer / retirer** | **Retirer** (4) · **Supprimer** (2) · **Vider** (1) · **Effacer ma sélection** (1) · *+ 4 formes longues* |
| **Modifier / changer** | **Changer** (2) · **Modifier** (1) · **Modifier la quantité** (1) · **Changer de recette** (1) |
| **Ajouter** | **Ajouter un article** (3) · **Ajouter** (2) · **Ajouter un aliment** (2) · **Ajouter un repas** (1) · **Ajouter un ingrédient** (1) · **Ajouter un verre d'eau** (1) |
| **Masse grasse** | **Ta masse grasse** · **Masse grasse (optionnel)** · **masse grasse** · **taux de masse grasse** (textes légaux et méthodologie) |

**Lecture mécanique** : quatre verbes coexistent pour l'action de confirmer (`Enregistrer`, `Valider`, `OK`, `Continuer`) et quatre pour celle de retirer (`Retirer`, `Supprimer`, `Effacer`, `Vider`). La famille « Ajouter » est en revanche **régulière** : toujours `Ajouter un <objet>`, jamais `Nouveau`.

## Typographie

Mesurée sur les 753 chaînes du dump.

| Catégorie | Nombre | Exemples |
|---|---|---|
| Apostrophe **droite** `'` | **93** | « Rien reçu ? Regarde dans les indésirables. » · « J'accepte que mes données (poids, taille, … » |
| Apostrophe **typographique** `’` | **71** | « Ce qui ne l’est jamais » · « Les mesures sont rattachées à un identifia… » |
| `...` au lieu de `…` | **0** | — |
| `…` correct | 72 | « Un code à … chiffres vient de partir vers… » |
| Espace **normale** avant `: ; ? !` | **97** | « Mot de passe oublié ? » · « Deux choses, comptées séparément : … » |
| Espace **insécable** avant `: ; ? !` | **0** | — |
| Bouton avec point final | 4 | « Prot. » · « Gluc. » · « Lip. » — **abréviations**, pas des phrases |
| Bouton en minuscule initiale | 4 | « kcal » · « séances / sem. » — **unités**, pas des libellés d'action |

**Deux constats mécaniques, un non-constat :**
- L'apostrophe est **mélangée** : 93 droites contre 71 typographiques, souvent dans le même écran.
- L'espace insécable avant `: ; ? !` est **absente partout** (0 sur 97 occurrences).
- Les points finaux et minuscules sur boutons sont des **faux positifs** de la sonde : ce sont des abréviations (`Prot.`) et des unités (`kcal`), pas des libellés d'action. **Aucune incohérence réelle de casse ou de ponctuation sur les boutons.**

## Constats

### 06-01 L'apostrophe et l'espace fine sont irrégulières dans toute l'app
- **Sévérité : P3** (à corriger en lot, comme le prescrit le brief)
- **Preuve** : 93 apostrophes droites `'` contre 71 typographiques `’` sur 753 chaînes ; **0** espace insécable avant `: ; ? !` sur **97** occurrences concernées.
- **Reco** : un seul passage, mécanique, puis un test qui compte — le dépôt sait déjà faire ce genre de garde-fou (`fichesOta.test.ts`). Sans test, la dérive reviendra au prochain texte écrit.
- **Effort : S**

### 06-02 Quatre verbes pour confirmer, quatre pour retirer
- **Sévérité : P2**
- **Preuve** : tableau ci-dessus. `Enregistrer` / `Valider` / `OK` / `Continuer` d'un côté ; `Retirer` / `Supprimer` / `Effacer` / `Vider` de l'autre.
- **À nuancer honnêtement** : les volumes sont faibles (1 à 8 occurrences) et certaines distinctions sont **légitimes** — `Retirer` un article d'une liste n'est pas `Supprimer` un compte. Le vrai doublon est `Enregistrer` vs `Valider`, qui désignent le même geste.
- **Reco** : fixer un verbe par action dans un mémo de style, et le faire trancher à l'étape 6b, qui verra les textes en contexte.
- **Effort : S**

### 06-03 Une seule chaîne anglaise résiduelle
- **Sévérité : P2** (par la règle du brief ; l'ampleur réelle est d'une occurrence)
- **Preuve** : `components/HydrationBar.tsx:201` → `OK`. C'est la **seule** correspondance de `\b(Save|Cancel|Loading|Error|Next|Back|Submit|OK|Done|Close|Delete|Edit|Add)\b` dans les 753 chaînes.
- **Reco** : la remplacer par le verbe retenu en 06-02.
- **Effort : S**

### 06-04 Les textes légaux ont bien UNE source — et la copie versionnée est à jour
- **Sévérité : aucune — le défaut attendu par le brief n'existe pas**
- **Le brief prévoit** : « `constants/legal.ts` et `public/legal.html` — même source ou deux copies ? Deux copies = **P1** ».
- **Mesuré** : `public/legal.html` est **généré** depuis `constants/legal.ts` par `scripts/gen-legal.ts` (`npm run gen:legal`), et porte un en-tête « ⚠️ FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN ». Le script raconte lui-même pourquoi il existe : le même texte a vécu **en six exemplaires recopiés à la main**, dont deux mentaient en production (une politique à 10 sections contre 11, et une page publique annonçant 16 ans quand l'app en bloque 18).
- **Et la copie versionnée n'a pas dérivé** : régénération dans un bac à sable, puis `git diff public/legal.html` → **aucune différence**. L'arbre est resté propre.
- **Ce qui reste pour l'étape 9** : le *contenu* — la confrontation politique ↔ `RGPD-REGISTRE.md` ↔ comportement du code. Ce constat ne dit que ceci : il n'y a **qu'un seul texte à confronter**, pas deux à réconcilier d'abord.

## Checklist humaine

- [ ] **Ajouter au dump avant 6b les textes qui ne vivent pas dans le dépôt** :
  - les **fiches store** (App Store Connect / Play Console) — il n'y a pas de `store.config.json`, donc rien n'est versionné (cf. 03-08) ;
  - les **templates d'e-mails Supabase** — `supabase/emails/confirmation.html` et `reinitialisation.html` sont dans le dépôt, mais **ce qui est réellement servi** est configuré dans le dashboard : à confronter ;
  - le **paywall RevenueCat**, si un paywall distant est configuré côté tableau de bord ;
  - les **textes du système** (permissions iOS) — ils sont dans `app.json`, déjà relevés à l'étape 3, section B.

## Hors périmètre / non couvert

**La couverture de l'extraction, mesurée plutôt qu'affirmée** : `app/` et `components/` contiennent **560** éléments `<Text>` ; le dump en tire **504 chaînes** depuis ces fichiers, soit **~90 %**. Le manque vient de trois formes que l'extraction mécanique ne prend pas :
- les textes composés de plusieurs `<Text>` imbriqués (un mot en gras au milieu d'une phrase) — la phrase est capturée, l'imbrication apparaît en clair dans le texte ;
- les textes assemblés par des fonctions (`copy.title`, `pickCitation(index)`) — le dump contient la **table de copie** (`lib/reminder.ts`, `lib/notifications.ts`), pas chaque combinaison ;
- les interpolations, remplacées par `…` — `Il te reste {n} kcal` apparaît comme `Il te reste … kcal`.

⚠️ **Deux corrections apportées à l'extracteur avant de livrer**, parce que la première version mentait :
1. Le motif `>texte<` capturait les **opérateurs de comparaison** : `wN >= WEIGHT_BOUNDS[0] && wN <= …` produisait de faux « textes » comme `= WEIGHT_BOUNDS[0] && wN`. 19 fausses chaînes retirées.
2. La première version ne lisait que les nœuds `<Text>` tenant sur **une seule ligne** — elle manquait **140 ouvertures** de `<Text>` en fin de ligne, c'est-à-dire précisément les textes **longs**, ceux que l'étape 6b doit juger pour la charge mentale et l'honnêteté. La couverture est passée de 395 à 504 chaînes.

**Non couvert, à assumer :**
- **Aucun jugement** n'est porté ici : ni sur le ton, ni sur l'honnêteté, ni sur la charge mentale. Le flag `⚑` est **mécanique** (un chiffre, ou un mot de la liste du brief) et ne signifie rien d'autre que « à regarder en 6b ».
- **Les 3 348 lignes de `lib/foods.generated.ts` et les 512 recettes** ne sont pas dans le dump : ce sont des **données**, pas de la copie d'interface. Leurs noms d'aliments seraient 4 000 lignes de bruit pour 6b.
- **Les messages d'erreur de Supabase** traduits par `translate()` (`app/(auth)/login.tsx:80`) : la table de traduction est dans le dump, les messages d'origine sont côté serveur.
