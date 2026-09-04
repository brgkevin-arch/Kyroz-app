# Retour sur l'audit UX du 2026-09-01

> **Document autonome.** Il répond à un audit UX de Kyroz réalisé sans accès au dépôt.
> Chaque contradiction ci-dessous est appuyée par le fichier et la ligne où le code dit
> autre chose. État du code mesuré le **2026-09-01**, sur la branche de travail.

## En une phrase

Le verdict de fond est juste — le cœur du produit est solide, les problèmes sont à la
marge. Mais **quatre constats sur huit décrivent des manques qui n'existent pas**, et ils
se trompent tous pour la même raison : l'audit a été fait sur le **preview web**, alors que
le produit livré est le **binaire iOS**.

---

## 1. Ce que je garde sans réserve

L'appréciation des forces est fine et bien vue : la séparation activité quotidienne /
séances, la transparence TDEE 2788 → cible 2638, la liste de courses, l'auto-coche assumée.
Ce sont les bons choix repérés pour les bonnes raisons. Rien à redire.

Et la hiérarchie générale — « rien de structurel, tout est à la marge » — est exacte.

---

## 2. Ce qui est déjà fait

| Point de l'audit | Ce que dit le code |
|---|---|
| **2 — « Le *Continuer* grisé n'explique jamais pourquoi il est bloqué »** | Le bouton est `muted`, **pas `disabled`** : il reste cliquable, et c'est lui qui affiche le motif. `blockReason()` renvoie un message par étape, affiché juste au-dessus. `components/ui.tsx:45` (`opacity: disabled ? 0.3 : muted ? 0.45 : 1`), `app/(auth)/onboarding.tsx:292` et `:645`. Le commentaire au-dessus du bouton énonce mot pour mot la règle réclamée par l'audit. |
| **2 bis — « un utilisateur qui n'a pas coché son sexe tape dans le vide »** | Le scénario est impossible : `sex` est initialisé à `'male'`. `app/(auth)/onboarding.tsx:156`. |
| **3 — « Molettes 1900→2026, un utilisateur né en 1998 défile 28 ans »** | La molette s'ouvre **ancrée à `année courante − 30`**, soit 1996. C'est exactement le correctif proposé (« une molette pré-positionnée sur ~2000 »), déjà en place. `lib/wheelDate.ts:78` (`ancrage`), consommé en `components/BirthDatePicker.tsx:50`. |
| **6 — « pas de retour arrière visible, pas de barre de progression »** | Les deux sont dans le header de l'onboarding : chevron retour (masqué à l'étape 1) + barre remplie en pourcentage. `app/(auth)/onboarding.tsx:435-441`. |

---

## 3. La cause commune : la surface auditée n'est pas la surface vendue

L'indice est dans l'audit lui-même : « sur le web, un rechargement repart à zéro ».

Kyroz est une app **React Native / Expo**. Le web existe comme surface de debug ; ce qui est
livré aux utilisateurs est le binaire iOS. Or trois constats sur quatre viennent d'artefacts
de rendu web :

- **Le point 1 (accessibilité sémantique).** « Tout est en `<div>` sans rôle » décrit le DOM
  produit par `react-native-web`, pas l'app. En natif, VoiceOver lit quand même le libellé
  d'un pressable — il ne l'annonce simplement pas comme « bouton ».
- **Le point 3 (molette de date).** Le composant vu sur le web n'est pas le picker natif.
- **Le point 6 bis (« un rechargement repart à zéro »).** Un rechargement de page n'a pas
  d'équivalent sur iOS ; la vraie question est la mise en arrière-plan et le kill.

**Le constat sous-jacent du point 1 reste vrai, à une échelle réduite.** Le composant
`Presse` — qui porte les ~129 éléments pressables de l'app — ne pose **aucun
`accessibilityRole` par défaut** (`components/Presse.tsx:74`), et les 33 `accessibilityRole`
du dépôt sont dispersés sur 18 fichiers. L'incohérence est réelle. Mais le correctif tient
en **un seul composant**, pas « dans l'app entière », et l'impact en natif est un défaut de
politesse, pas un mur. 🔴 → 🟠.

---

## 4. Ce qui survit, et qui est vrai

- **6 bis — la persistance de l'onboarding.** Posée en question, et la réponse est **non** :
  aucun `AsyncStorage` dans `app/(auth)/onboarding.tsx`, donc aucun brouillon. Un
  utilisateur qui tue l'app à l'étape 6 repart du prénom. **C'est le seul vrai trou de
  cette section** — et c'est le seul point que l'audit a formulé comme une question plutôt
  que comme un constat. Ce n'est pas un hasard.
- **5 — Contrastes.** Crédible et mesurable indépendamment de la surface : les ratios se
  calculent sur les tokens de thème, qui sont partagés entre web et natif. À vérifier.
- **7 — La valeur avant l'email.** Vrai. C'est un arbitrage produit, pas un défaut.
- **8 — Le pool de recettes penche « healthy/hype ».** Le plus intéressant des huit, et le
  mieux formulé : l'audit note lui-même que ce n'est pas un bug. Un catalogue peut être
  juste nutritionnellement et décalé culturellement — ce sont deux mesures différentes.

## 5. Ce que l'audit n'a pas vu, et qui pèse plus que la moitié de sa liste

**Le sexe est présélectionné sur `'male'`** (`app/(auth)/onboarding.tsx:156`). Une femme qui
ne touche pas au segmenté n'est jamais bloquée — elle obtient un plan calculé sur un
métabolisme d'homme. Un défaut silencieux qui produit un résultat faux est plus grave qu'un
état bloqué qui ne s'explique pas : le second se voit, le premier non.

Ironie utile : c'est précisément la présence de ce défaut qui rendait le scénario du point 2
impossible.

---

## 6. Feedback de méthode — ce qui rendrait le prochain audit plus tranchant

**a. Auditer la surface qu'on vend.** Sur une app React Native, un audit web mesure le
compilateur autant que le produit. Si seul le web est accessible, le dire en tête de rapport
et marquer d'un signe les constats qui pourraient être des artefacts de rendu — ça n'aurait
rien coûté et ça aurait sauvé trois points sur quatre.

**b. Distinguer un constat mesuré d'une inférence visuelle.** « Le bouton est à 0,45
d'opacité » est une mesure, et elle est exacte. « Donc il ne réagit pas et n'explique rien »
est une inférence — et elle est fausse. Le geste qui les sépare coûte une seconde :
**appuyer sur le bouton**. La même règle vaut pour la molette (l'ouvrir et regarder où elle
s'ancre) et pour le header (le chercher avant de conclure qu'il n'existe pas).

**c. Le point le plus utile du rapport est celui qui a été posé en question.** « Vérifie sur
iOS : est-ce que l'onboarding survit à une fermeture ? » est le seul constat qui a survécu
intact à la confrontation au code — parce qu'il ne prétendait pas savoir. Quand la surface
observée ne permet pas de trancher, la question vaut mieux que l'affirmation, et elle
transporte la même information.

**d. Un point manque.** La liste saute du 3 au 5. Si le document d'origine avait un point 4,
il n'est pas arrivé.

---

## 7. Le calendrier change l'ordre des priorités

L'app est **soumise à l'App Store**. Rien ne peut partir maintenant, et on ne retire pas une
soumission en cours pour y glisser un correctif. Les 🔴 de l'audit sont donc des priorités
**pour la vague suivante**, pas des urgences.

Et dans cette vague, l'ordre n'est pas celui du rapport :

1. **Le sexe par défaut** — produit un plan faux, en silence. (Absent de l'audit.)
2. **La persistance de l'onboarding** — perte de travail réelle sur un kill d'app.
3. **Les contrastes** — mesurable, correctif localisé aux tokens.
4. **`accessibilityRole` par défaut dans `Presse`** — un composant, ~129 sites servis.
5. **La valeur avant l'email** — arbitrage produit, à trancher.
6. **Le matching des goûts** — le vrai front suivant, et un chantier à lui seul.
