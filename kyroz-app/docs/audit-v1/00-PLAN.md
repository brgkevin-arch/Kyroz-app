# Audit V1 Kyroz — Plan

Auditer la V1 telle qu'elle existe avant soumission App Store / Google Play, en sessions courtes et indépendantes, sans perdre le travail si une session est coupée.

## Principes

1. **Une étape = une session = un fichier.** Chaque étape écrit ses constats dans `docs/audit-v1/NN-<theme>.md` au fil de l'eau, avec une section « Reste à couvrir » cochée fichier par fichier. Une session coupée se reprend à la première ligne non cochée. Commit après chaque session.
2. **Chaque brief est autonome.** Une étape ne dépend jamais du contexte d'une autre session, seulement de fichiers. Rien n'est réexpliqué dans le chat.
3. **Audit ≠ fix.** On constate, on ne corrige pas. Les corrections sortent du backlog final (étape 11), en sessions séparées, une par lot.
4. **Stable avant mouvant.** Les étapes 7 (monétisation) et 8 (analytics) ne se lancent qu'une fois l'implémentation terminée. Avant, elles ne produisent qu'un écart vs stratégie.
5. **Outil avant modèle.** Ce qu'un outil mesure, Claude ne le relit pas : il interprète le rapport.
6. **Pas de vérification fictive.** Ce qui ne peut pas être vérifié depuis le repo va dans une « Checklist humaine » avec la procédure exacte. Jamais dans les constats.

## Arborescence

```
docs/audit-v1/
├── 00-PLAN.md                    ce fichier
├── briefs/
│   ├── 01-securite-donnees.md    briefs Claude Code, un par étape (1 à 8)
│   └── …
├── 01-securite-donnees.md        sorties, une par étape
├── …
├── 06-textes-dump.md             dump verbatim des chaînes UI (input de 6b)
└── 11-SYNTHESE.md                backlog final priorisé
```

## Étapes

| # | Étape | Où | Sortie | Condition de lancement |
|---|---|---|---|---|
| 1 | Sécurité & données | Claude Code | `01-securite-donnees.md` | — |
| 2 | Moteur : implémentation vs règles validées | Claude Code | `02-moteur.md` | — |
| 3 | Store readiness technique | Claude Code | `03-store-readiness.md` | — |
| 4 | Qualité code, dépendances, tests (outillé) | Claude Code | `04-qualite-code.md` | — |
| 5 | Performance, accessibilité, robustesse | Claude Code | `05-perf-a11y.md` | — |
| 6a | Extraction des textes utilisateur | Claude Code | `06-textes-dump.md` + `06-textes-extraction.md` | — |
| 6b | Audit des textes (zéro charge mentale / zéro malhonnêteté) | Claude.ai | `06-textes-audit.md` | 6a terminée |
| 7 | Monétisation & entitlement | Claude Code | `07-monetisation.md` | entitlement 3 états implémenté |
| 8 | Analytics & consentement | Claude Code | `08-analytics.md` | §4.1 tranché + instrumentation PostHog en place |
| 9 | Conformité & cohérence documentaire | Claude.ai | `09-conformite.md` | sorties 1, 3, 7, 8 |
| 10 | Listing, ASO, business, ops | Claude.ai | `10-listing-business-ops.md` | — |
| 11 | Synthèse & backlog | Claude.ai | `11-SYNTHESE.md` | sorties 01 à 10 |

Ordre conseillé : 1 → 2 → 3 → 4 → 5 → 6a → 6b → 10, puis 7 et 8 dès qu'elles sont éligibles, puis 9, puis 11. Les étapes 4 et 5 sont fusionnables en une session si le repo est petit (moins d'environ 150 fichiers TS/TSX).

## Sévérités

| Niveau | Définition | Exemples |
|---|---|---|
| P0 | Bloque la soumission, expose légalement, ou produit un plan faux / dangereux | table sans RLS, secret dans le bundle, pas de suppression de compte, floor calorique contournable, `parseFloat("72,5")`, paywall sans prix |
| P1 | À corriger avant le lancement public | spinner infini hors ligne, permission déclarée sans usage, texte qui contredit le comportement réel |
| P2 | Post-lancement | export de données manuel, couverture de tests, dette de config |
| P3 | Dette technique | code mort, typographie, dépendances inutilisées |

En cas de doute entre deux niveaux : le supérieur si le risque touche la santé de l'utilisateur, ses données ou le légal ; l'inférieur sinon.

## Squelette d'un fichier de sortie

```markdown
# Audit V1 — Étape NN : <thème>
Date : <AAAA-MM-JJ> · Commit audité : <sha court> · Périmètre : <dossiers / fichiers>

## Reste à couvrir
- [ ] <fichier ou section>   ← coché au fur et à mesure ; point de reprise si la session coupe

## <Tableaux d'inventaire propres à l'étape>

## Constats
### NN-01 <titre court>
- Sévérité : P0 / P1 / P2 / P3
- Preuve : `fichier:ligne` ou `commande → sortie`
- Risque : rejet store / légal / santé utilisateur / données / UX
- Reco : <une phrase, sans implémenter>
- Effort : S (< 1 h) / M (½ journée) / L (> 1 jour)

## Checklist humaine
- [ ] <ce que Claude n'a pas pu vérifier, avec la procédure exacte>

## Hors périmètre / non couvert
```

## Lancer une session (Claude Code)

Session fraîche, un seul message, rien d'autre :

```
Lis docs/audit-v1/briefs/01-securite-donnees.md et exécute-le intégralement. N'ouvre aucun autre fichier avant d'avoir lu le brief en entier.
```

Reprise après coupure :

```
Reprise d'audit. Lis docs/audit-v1/briefs/01-securite-donnees.md, puis docs/audit-v1/01-securite-donnees.md section « Reste à couvrir ». Continue à partir de la première ligne non cochée, mêmes règles, sans relire ce qui est coché.
```

Fin de session : la dernière ligne du chat donne les compteurs et le fichier est commité. Reporte les compteurs dans le tableau de suivi ci-dessous.

Après l'audit : corrections par lot (un lot = une sévérité × un thème), une session par lot, puis re-vérification ciblée en relançant uniquement la section concernée du brief.

## Sobriété d'usage

- Le périmètre de chaque brief est une liste explicite. « Lis tout le repo » n'existe pas.
- Ce qu'un outil mesure (`tsc`, `eslint`, `npm audit`, coverage, `expo-doctor`), Claude ne le relit pas.
- Sortie dans le fichier, pas dans le chat.
- Les étapes lourdes (1, 2, 5) se lancent en début de fenêtre d'usage, jamais en fin.
- L'étape 4 est candidate pour un modèle plus léger : c'est de l'interprétation de rapports, pas du jugement produit.
- En Claude.ai (6b, 9, 10, 11) : attacher uniquement les fichiers listés ci-dessous, jamais le repo.

## Étapes Claude.ai — quoi attacher

| Étape | Fichiers à attacher |
|---|---|
| 6b | `06-textes-dump.md`, `06-textes-extraction.md` |
| 9 | `01-securite-donnees.md`, `03-store-readiness.md`, `07-monetisation.md`, `08-analytics.md`, `RGPD-REGISTRE.md`, politique de confidentialité, CGU, sections légal / paywall / consentement de `06-textes-dump.md`, captures des formulaires App Privacy et Data Safety |
| 10 | fiches store (ou `store.config.json`), `07-monetisation.md`, hypothèses de coûts fixes |
| 11 | toutes les sorties `01` à `10` |

Les briefs de ces étapes sont fournis dans Claude.ai au moment de les lancer.

## Arbitrage du plan (2026-08-26, avant l'étape 1)

Le plan est appliqué tel quel, à quatre réserves **mesurées** :

1. **Chemin des sorties** — les briefs écrivent dans `docs/audit-v1/`, le dossier était à la racine du dépôt. Déplacé dans `kyroz-app/docs/audit-v1/`, les briefs n'ont pas été touchés.
2. **La condition de l'étape 8 est périmée.** Elle exige « instrumentation PostHog en place » ; la mesure d'usage a été **éteinte le 2026-08-26** (24ᵉ OTA, `STATISTIQUES_USAGE_ACTIVES = false`, clé retirée des trois environnements EAS). Le « Contexte produit » du brief 01 la décrit encore vivante. L'étape 8 doit être réécrite pour auditer **l'extinction et ce que les textes promettent encore**, pas l'instrumentation.
3. **Les étapes 4 et 5 ne fusionnent pas.** Le seuil du plan est 150 fichiers TS/TSX ; il y en a **168** hors tests (`find app components lib constants hooks scripts -name '*.ts*' | grep -v __tests__ | wc -l`), pour 37 059 lignes.
4. **L'étape 7 est éligible dès maintenant.** `AccessReason` est implémenté (`lib/premium.ts:53`) avec quatre états — `not_launched`, `grandfathered`, `entitled`, `locked`. `PAYWALL_LAUNCH = null` est un **interrupteur**, pas une implémentation manquante.

5. **Le cadrage de l'étape 2 manque un fichier du moteur.** Son motif (`planEngine|calorieBank|recalcProfile|engine|bmr|tdee|macro`) ne trouve pas `lib/datedGoal.ts` (723 lignes), qui porte pourtant trois des dix règles. Ajouté au périmètre.
6. **Deux règles du brief 02 sont périmées ou fausses**, mesurées contre le code ET contre `AGENTS.md:145` : la règle 5 annonce un seuil de 20 % de MG là où le code et la référence disent **30 % / 40 %** ; la règle 8 décrit des paliers par kg/durée qui n'existent pas, remplacés par une **pause à la maintenance toutes les 8 semaines de déficit consécutives** — un mécanisme qui déclenche plus tôt et couvre plus large. Auditer contre la lettre du brief aurait produit deux faux P0.

⚠️ Rappel mesuré à l'étape 1 : le dépôt porte déjà **25 scripts de contrôle** (`check:*`, `mesure:*`, `qa:*`) et **1 835 tests**. La règle 5 du plan (« outil avant modèle ») doit se lire au pied de la lettre — plusieurs recouvrent directement le périmètre des étapes 1, 4 et 7.

## Suivi

| Étape | Statut | Date | Commit | P0 | P1 | P2 | P3 | Reste à couvrir |
|---|---|---|---|---|---|---|---|---|
| 1 | ✅ terminée | 2026-08-26 | `c17e667` | **1** | 4 | 4 | 3 | 0 |
| 2 | ✅ terminée | 2026-08-26 | `39385dd` | **2** | 1 | 2 | 3 | 0 |
| 3 | ✅ terminée | 2026-08-26 | `6cb1c5c` | 0 | **4** | 3 | 2 | 0 |
| 4 | ✅ terminée | 2026-08-26 | `abf39cf` | 0 | **1** | 5 | 5 | 0 |
| 5 | ✅ terminée | 2026-08-26 | `ad4bf0b` | 0 | **4** | 1 | 2 | 0 |
| 6a | ✅ terminée | 2026-08-26 | `e731e80` | 0 | 0 | 2 | 1 | 0 |
| 6b | | | | | | | | |
| 7 | ✅ terminée | 2026-08-26 | `d095397` | 0 | **1** | 2 | 2 | 0 |
| 8 | | | | | | | | |
| 9 | | | | | | | | |
| 10 | | | | | | | | |
| 11 | | | | | | | | |
