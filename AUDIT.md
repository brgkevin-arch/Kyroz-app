# Kyroz — Audit code & application

> Audit réalisé sur l'état courant (Phase 2). Méthode : `tsc --strict`, balayage
> automatique (couleurs en dur, code mort, `any`, catch vides, tailles), revue
> manuelle des fichiers clés, vérifs runtime de la logique pure (`lib/`).
> Conclusion : **base saine, aucun bug critique**. Détails ci-dessous.

## 🟢 Sain / vérifié

- **TypeScript strict** : `tsc --noEmit` → **0 erreur**. Bundle web build proprement (0 erreur Metro).
- **Garde-fous nutrition (CLAUDE.md §6)** : plancher kcal 1500♂/1200♀ appliqué (`Math.max(..., MIN_KCAL)`) dans les 3 chemins de macros (auto, percent, manuel) ; âge ≥16 (`validateProfile` + onboarding) ; %MG borné 3–60 ; protéines bornées.
- **Disclaimer** présent onboarding + profil + plan + login (désormais **centralisé** dans `constants/legal.ts`).
- **RGPD / sécurité** :
  - RLS stricte par utilisateur sur **toutes** les tables (`schema.sql`).
  - Droit à l'effacement : Edge Function `delete-account` + repli `deleteCloudData`.
  - **Photos de progression LOCAL-ONLY** (clé `@kyroz:weightPhotos`, jamais poussées au cloud).
  - Stockage EU (réglage projet Supabase).
- **Offline-first** : le local est la copie de travail, le cloud un miroir best-effort ; une panne réseau ne casse jamais l'usage.
- **Dates en heure locale** (`localStamp`) — bug de fuseau corrigé (était `toISOString`/UTC).
- **Pas de course** sur le streak (écritures sérialisées) ni double-comptage.
- **Déterminisme** : le plan se régénère depuis `profileSignature` (inclut les macros cibles) → poids/macros/objectif modifiés ⇒ plan à jour.
- **Propreté** : aucun `TODO`/`FIXME`, pas de `console.log` de debug (un seul `console.error` volontaire sur le fallback IA).

## 🟡 Dette technique mineure

| # | Constat | Statut |
|---|---|---|
| 1 | `DISCLAIMER` dupliqué 4× | ✅ **corrigé** (centralisé `constants/legal.ts`) |
| 2 | Imports morts `MacroMode` (profil, onboarding) | ✅ **corrigé** |
| 3 | `kcalFromMacros` exporté mais plus utilisé | ✅ ré-utilisé par les tests (cohérence 4/4/9) |
| 4 | Table `meal_plans` : présente au schéma + supprimée à l'effacement, mais **jamais écrite** (plan déterministe, non synchronisé) | dead table — à documenter ou retirer |
| 5 | Couleurs en dur `rgba(0,0,0,x)` sur les scrims de modale (Sheet/ActionSheet/StreakCelebration) | acceptable (scrim), pourrait devenir un token thème |
| 6 | `MenuRow` icône typée `any` | pourrait être `keyof typeof Ionicons.glyphMap` |
| 7 | `noUnusedLocals` non activé | n'attrape pas le code mort auto |
| 8 | `catch {}` ×13 dans `sync.ts` | volontaire (best-effort), mais avale les erreurs sans télémétrie |
| 9 | Gros fichiers : `plan.tsx` 478, `profil.tsx` 439, `planEngine.ts` 433 | gérable, surveiller la croissance |

## 🟡 Recommandations (pas des bugs)

- ~~**Aucun test automatisé.**~~ ✅ **FAIT post-audit** : vitest, 53 tests sur `lib/` (`npm test`) — garde-fous §6, masse maigre, mode percent, fuseau, déterminisme du plan, filtres régime, intégrité des 50 recettes.
- ~~**Pas d'Error Boundary global.**~~ ✅ **FAIT post-audit** : `components/ErrorBoundary.tsx` branché au sommet de `_layout.tsx` (fallback thémé + Réessayer).
- **Recettes `validated_by_dietitian: false`** (50/50) : validation contenu toujours en attente (cf. `VALIDATION-RECETTES.md`).

## ⚠️ Risque produit à surveiller (pas technique)

- **Masse grasse obligatoire à l'onboarding** : ajoute de la friction au tout début (North Star = activation J1). Atténué par les silhouettes (1 tap), mais à **mesurer** : si le taux d'abandon onboarding monte, envisager « fortement conseillé » plutôt que bloquant. Décision fondateur assumée.
- Les **silhouettes** actuelles sont des SVG « maison » sommaires ; comme le %MG est maintenant requis, des **vraies illustrations** gagnent en priorité (déjà en roadmap).

## Verdict

Code propre, typé strict, garde-fous et RGPD en place, aucun bug critique. Les
items 🟡 sont du polissage. Prochaines priorités conseillées : **tests unitaires
sur `lib/`** + **Error Boundary**, puis reprise de la roadmap produit.
