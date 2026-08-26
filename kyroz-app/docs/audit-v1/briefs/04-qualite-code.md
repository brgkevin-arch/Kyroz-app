# Brief — Étape 4 : Qualité code, dépendances, tests (outillé)

Mission : mesurer, pas relire. Tu lances des outils en lecture seule, tu interprètes leurs rapports, tu n'ouvres du code que pour qualifier un constat — 10 fichiers maximum sur toute la session.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ». Exception de cette étape : les commandes `npx` listées ci-dessous sont autorisées ; toute sortie va dans `/tmp/kyroz-audit/`, jamais dans le repo. `git status` doit être propre (hors `docs/audit-v1`) avant le commit.
2. **Écriture au fil de l'eau.** Avant de lancer la première commande : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec les sections A à K. Après chaque section : écris le chiffre dans le tableau de bord et les constats, coche la ligne.
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si une commande échoue (réseau, outil absent), note la sortie exacte dans « Non couvert » ; ne remplace jamais par une estimation.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 04 qualité code"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 04 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Cadrage

```bash
git rev-parse --short HEAD
mkdir -p /tmp/kyroz-audit
ls package-lock.json yarn.lock pnpm-lock.yaml bun.lock bun.lockb 2>/dev/null   # gestionnaire réel : adapte les commandes npm ci-dessous
node -v
git ls-files | grep -E '\.(ts|tsx)$' | wc -l
```

Fichiers moteur (la seule couverture qui compte) : `planEngine.ts`, `calorieBank.ts`, le fichier contenant `recalcProfile` — `git ls-files | grep -Ei 'planEngine|calorieBank|recalcProfile'`.

## Grille — une commande, un chiffre, des constats

### A. Typage

`npx tsc --noEmit > /tmp/kyroz-audit/tsc.txt 2>&1 ; grep -c 'error TS' /tmp/kyroz-audit/tsc.txt`. Erreurs dans du code de prod = **P1** ; dans les tests = **P2**. Flags `tsconfig` absents parmi `strict`, `noUncheckedIndexedAccess` = **P3**. Comptes : `git ls-files | grep -E '\.(ts|tsx)$' | xargs grep -InE '@ts-ignore|@ts-expect-error|as any|: any' | wc -l`. Tout `any` dans les fichiers moteur = **P1**.

### B. Lint

Config ESLint présente ? `npx expo lint` si configuré, sinon `npx eslint . -f json -o /tmp/kyroz-audit/eslint.json`. Compte errors / warnings par règle (top 10). Absence totale de lint = **P2**. `react-hooks/exhaustive-deps` désactivée = **P2**.

### C. Santé Expo

`npx expo-doctor > /tmp/kyroz-audit/doctor.txt 2>&1`. Chaque check en échec = un constat, sévérité selon son texte (incompatibilité de version native = **P1**).

### D. Vulnérabilités

`npm audit --omit=dev --json > /tmp/kyroz-audit/audit-prod.json` puis `npm audit --json > /tmp/kyroz-audit/audit-all.json`. Ne compte que les dépendances de production pour la sévérité : critical / high avec chemin atteignable à l'exécution RN = **P1** ; sinon **P2** ; devDeps = **P3**. Beaucoup d'advisories RN concernent des outils de build : dis-le explicitement plutôt que d'aligner des chiffres.

### E. Obsolescence

`npm outdated > /tmp/kyroz-audit/outdated.txt`. Focus : `expo`, `react-native`, `@supabase/supabase-js`, `react-native-purchases`, `posthog-react-native`, `expo-updates`. Une majeure de retard sur un SDK sous-traitant (RevenueCat, PostHog) = **P2** (manifestes privacy, Billing Library, host EU). SDK Expo non supporté par les stores = **P1**.

### F. Code mort et dépendances inutiles

`npx knip --reporter json > /tmp/kyroz-audit/knip.json 2>&1` et/ou `npx depcheck --json > /tmp/kyroz-audit/depcheck.json`. Dépendances de prod inutilisées = **P3**, listées (poids du binaire, surface d'attaque). Exception : une dépendance analytics, tracking ou crash inutilisée est **P1** (sous-traitant fantôme pour l'étape 9).

### G. Licences

`npx license-checker --production --summary > /tmp/kyroz-audit/licenses.txt` puis `npx license-checker --production --onlyAllow 'MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;CC0-1.0;Unlicense;MPL-2.0;BlueOak-1.0.0' > /tmp/kyroz-audit/licenses-ko.txt 2>&1`. Tout ce qui sort (GPL, AGPL, LGPL, SSPL, inconnu) = **P1** pour une app fermée ; inconnu = à qualifier.

### H. Tests

Runner détecté. `npx jest --coverage --coverageDirectory=/tmp/kyroz-audit/cov --silent > /tmp/kyroz-audit/jest.txt 2>&1` (ou l'équivalent vitest). Reporte la couverture **des fichiers moteur uniquement** : < 80 % de lignes = **P1**. Couverture globale : chiffre seul, sans sévérité. Tests qui échouent = **P1**. Tests skippés (`.skip`, `xit`, `xdescribe`) listés. Aucun runner = **P1**.

### I. Structure et hotspots

`git ls-files | grep -E '\.(ts|tsx)$' | xargs wc -l | sort -rn | head -15` : fichiers > 500 lignes listés (**P3** ; un fichier moteur > 800 lignes = **P2** testabilité). `git ls-files | xargs grep -InE 'TODO|FIXME|HACK|XXX' | wc -l` : compte + liste ; dans le moteur = **P2**. `WebView` utilisé ? (`originWhitelist`, source locale ou distante).

### J. Hygiène git

`.gitignore` couvre `.env*`, `node_modules`, `ios/build`, `android/build`, `.expo`, `dist`, `coverage`. `git ls-files -z | xargs -0 du -k 2>/dev/null | sort -rn | head -15` : fichiers > 1 Mo (données CIQUAL ?) — note le poids ; la stratégie de chargement est jugée en étape 5. `ios/` / `android/` committés = décision (prebuild), note-la.

### K. Taille du bundle JS

`npx expo export --platform ios --output-dir /tmp/kyroz-audit/export > /tmp/kyroz-audit/export.txt 2>&1` ; taille du bundle JS et des assets. Bundle JS > 5 Mo = **P2** (cold start, cf. étape 5).

## Sortie : `docs/audit-v1/04-qualite-code.md`

```markdown
# Audit V1 — Étape 4 : Qualité code, dépendances, tests
Date : … · Commit audité : … · Gestionnaire : … · Node : …

## Reste à couvrir
- [ ] A … - [ ] K

## Tableau de bord
| Mesure | Valeur | Seuil | Statut |
|---|---|---|---|
| Erreurs tsc (prod / tests) | | 0 | |
| `any` dans le moteur | | 0 | |
| ESLint errors / warnings | | 0 / — | |
| expo-doctor checks KO | | 0 | |
| npm audit prod critical / high | | 0 / 0 | |
| Majeures de retard (expo, RN, supabase-js, RC, PostHog) | | 0 | |
| Deps prod inutilisées | | 0 | |
| Licences hors liste | | 0 | |
| Couverture moteur (lignes) | | ≥ 80 % | |
| Tests KO / skippés | | 0 / 0 | |
| Fichiers > 500 lignes | | — | |
| TODO / FIXME (dont moteur) | | — / 0 | |
| Bundle JS | | < 5 Mo | |

## Constats
### 04-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
(aucune attendue : étape entièrement outillée)

## Hors périmètre / non couvert
(commandes en échec avec leur sortie exacte)
```

## Reprise

Session coupée : lis la sortie existante, repars de la première section non cochée. Les rapports dans `/tmp/kyroz-audit/` ont pu disparaître : relance uniquement les commandes des sections non cochées.
