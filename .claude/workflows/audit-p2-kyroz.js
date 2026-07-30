export const meta = {
  name: 'audit-p2-kyroz',
  description: 'Valide la spec P2 (cyclage hebdo, calibration k, P1.3 reporté) contre le code réel de Kyroz, par mesure',
  whenToUse: 'Avant d\'implémenter P2. Même méthode que l\'audit P1, qui avait trouvé la spec fausse trois fois. ~9 agents.',
  phases: [
    { title: 'Mesurer', detail: 'un agent par item : lire la spec, lire le code, EXÉCUTER le moteur' },
    { title: 'Réfuter', detail: 'contre-expertise adverse de chaque verdict' },
    { title: 'Synthétiser', detail: 'plan de livraison ordonné + ce que la spec a faux' },
  ],
}

const REPO = '/Users/kevinberger/Kyroz_Code/kyroz-app'

const CONTEXTE = `
Tu audites le moteur nutritionnel de Kyroz (app React Native / Expo, TypeScript strict, vitest).
Racine du code : ${REPO}

## Règle d'outillage imposée par le dépôt
Un hook exige de lancer \`graphify query "<question>"\` avant de grep. Lance-le une fois pour
la forme, MAIS SACHE QUE LE GRAPHE EST PÉRIMÉ (13/06/2026) : il n'indexe aucun fichier du
moteur (lib/safety.ts, lib/datedGoal.ts, lib/sport.ts n'existaient pas), et il place
calculateTDEE() à une ligne fausse. C'est documenté dans AGENTS.md. Grep et lis les fichiers.

## Documents
- \`docs/archive/2026-07-29-moteur-v2-corrections.md\` (ARCHIVÉ le 2026-07-30, ex-racine
  \`KYROZ_MOTEUR_V2_CORRECTIONS.md\`) — LA SPEC. Section « PR 3 — P2 ». ⚠️ Elle a déjà eu
  TORT trois fois sur P1 (P1.5 faisait mathématiquement l'inverse de ce qu'elle prétendait,
  P1.1 justifiait l'item par un fait faux, P1.3 était une régression de sécurité). Traite-la
  comme une hypothèse à vérifier, jamais comme une vérité.
- \`AGENTS.md\` — état réel du build.
- \`docs/archive/2026-07-28-audit-p1-mesures.md\` (ARCHIVÉ le 2026-07-30, ex-racine
  \`AUDIT-P1-MESURES.md\`) — les mesures qui ont arbitré P1. Même méthode attendue ici.
- \`docs/INVENTAIRE-CODE-2026-07-30.md\` — photo factuelle du code au 2026-07-30
  (duplications de logique, points d'écriture, zones risquées). Mesurée, pas rédigée.
- \`CLAUDE.md\` §6 — les garde-fous, qui sont NON NÉGOCIABLES.

## Ce qui vient d'être livré (2026-07-28, étape 3 de P1) — à intégrer à ton raisonnement
- TDEE = \`BMR × NEAT + dépense sportive nette\`, UNE seule formule (lib/tdee.ts::calculateTDEE).
- MET NET : \`(MET − 1) × 3.5 × poids / 200 × minutes\` (lib/sport.ts).
- NEAT paramétrable : NEAT_PAL = 1,20 / 1,28 / 1,36 / 1,45, défaut \`desk\` = 1,20, question
  dans le Profil et PAS à l'onboarding — donc le DÉFAUT est la valeur servie à la plupart des gens.
- Conséquence mesurée et assumée : le TDEE a baissé, donc le PLANCHER DE SÉCURITÉ MORD BIEN
  PLUS SOUVENT. Le déficit servi en sèche tombe de 300 à ~150-260 kcal/j chez les profils
  entraînés. C'est le contexte dans lequel P2 arrive.

## Méthode EXIGÉE — mesurer, pas relire
Aucune affirmation chiffrée ne vaut si elle n'a pas été obtenue en EXÉCUTANT le code.
Pour mesurer, crée un fichier de test jetable \`${REPO}/lib/__tests__/zz-scratch-<TON_SLUG>.test.ts\`
(slug unique, donné dans ta mission) et lance \`npx vitest run lib/__tests__/zz-scratch-<TON_SLUG>.test.ts\`
depuis ${REPO}.
⚠️ \`console.log\` est AVALÉ par ce setup vitest. Pour faire sortir des valeurs, force un échec :
\`expect(JSON.stringify(resultats)).toBe('')\` → les valeurs apparaissent dans le diff.
Helper de profil : \`import { makeProfile } from './helpers'\`.

## Règles absolues
- NE MODIFIE AUCUN FICHIER SUIVI PAR GIT. Ton fichier scratch est le SEUL que tu écris, et tu
  le SUPPRIMES avant de terminer. Finis par \`git status --short\` et vérifie que c'est propre.
  (Un agent précédent a laissé un scratch et a faussé le décompte de tests d'un audit entier.)
- Tu RENDS UN VERDICT, tu n'implémentes rien.
`

const VERDICT = {
  type: 'object',
  required: ['item', 'verdict', 'resume', 'mesures', 'defauts_de_la_spec', 'interactions', 'cout'],
  properties: {
    item: { type: 'string' },
    verdict: { enum: ['VALIDE', 'VALIDE_AVEC_CORRECTIONS', 'REJETE', 'HORS_PERIMETRE'] },
    resume: { type: 'string', description: '3-5 phrases : le vrai problème, et si la spec le décrit correctement' },
    mesures: {
      type: 'array',
      description: 'Chiffres obtenus en EXÉCUTANT le code. Vide = audit sans valeur.',
      items: {
        type: 'object',
        required: ['quoi', 'valeur', 'comment_obtenu'],
        properties: { quoi: { type: 'string' }, valeur: { type: 'string' }, comment_obtenu: { type: 'string' } },
      },
    },
    defauts_de_la_spec: {
      type: 'array',
      description: 'Chaque endroit où la spec est fausse, dangereuse, ou déjà implémentée. Cite-la.',
      items: {
        type: 'object',
        required: ['citation', 'probleme', 'gravite'],
        properties: { citation: { type: 'string' }, probleme: { type: 'string' }, gravite: { enum: ['bloquant', 'majeur', 'mineur'] } },
      },
    },
    interactions: {
      type: 'array',
      description: 'Collisions avec les garde-fous P0 (plancher EA, registre RED-S, IMC 18,5, plafond 25 %) et avec l\'étape 3',
      items: { type: 'string' },
    },
    deja_fait: { type: 'string', description: 'Ce que le code fait DÉJÀ et que la spec ignore' },
    cout: { type: 'string', description: 'Ampleur : fichiers touchés, migration nécessaire ?, tests à écrire' },
    recommandation: { type: 'string', description: 'Ce qu\'il faut livrer, précisément, et ce qu\'il ne faut PAS livrer' },
  },
}

const REFUTATION = {
  type: 'object',
  required: ['tient', 'attaques'],
  properties: {
    tient: { type: 'boolean', description: 'Le verdict survit-il à la contre-expertise ?' },
    attaques: {
      type: 'array',
      items: {
        type: 'object',
        required: ['cible', 'contre_argument', 'verifie', 'issue'],
        properties: {
          cible: { type: 'string' },
          contre_argument: { type: 'string' },
          verifie: { type: 'string', description: 'Comment tu l\'as VÉRIFIÉ en exécutant du code' },
          issue: { enum: ['réfuté', 'confirmé', 'nuancé'] },
        },
      },
    },
    verdict_corrige: { type: 'string', description: 'Si le verdict tombe, le remplaçant' },
    trous_non_vus: { type: 'array', items: { type: 'string' }, description: 'Ce que NI la spec NI le premier auditeur n\'ont vu' },
  },
}

const ITEMS = [
  {
    slug: 'p21',
    nom: 'P2.1 — cyclage jours repos / jours sport',
    mission: `
Section « P2.1 — Cyclage jours repos / jours sport » de la spec.

La spec propose de répartir un BUDGET HEBDOMADAIRE proportionnellement à la dépense de
chaque jour (\`distributeWeek\`, ALPHA=0.7, MAX_DAY_RATIO=1.35, \`redistributeAfterClamp\`).

⚠️ PIÈGE PRINCIPAL À VÉRIFIER : le moteur fait DÉJÀ du cyclage et DÉJÀ du lissage hebdo.
Va lire \`lib/planEngine.ts\` : \`restDayRatio\` (~L128), \`restDaysForProfile\` (~L161),
\`DAILY_SMOOTH_CAP = 50\` (~L522), \`weekDeficitKcal\` (~L641+), et le champ
\`UserProfile.rest_weekdays\`. Détermine PRÉCISÉMENT ce qui existe déjà et en quoi la
proposition en diffère. Le cyclage actuel est-il isocalorique (mêmes kcal, ratio
glucides/lipides différent) ou non ? La spec le sait-elle ?

Questions à trancher PAR LA MESURE :
1. Quel est l'écart de dépense réel entre un jour de séance et un jour de repos, pour des
   profils Kyroz typiques ? (la dépense sport est lissée par \`exerciseKcalPerDay\` = semaine/7)
   Le moteur SAIT-IL seulement quels jours portent quelles séances ? \`SportSession\` a-t-il
   une date ou un jour de semaine ? Si non, sur quoi la spec propose-t-elle de cycler ?
2. Le plancher de sécurité est QUOTIDIEN (safetyFloorKcal). Un cyclage qui fait descendre
   un jour de repos sous le plancher est interdit. Avec l'étape 3 qui a rapproché la cible
   du plancher, COMBIEN de marge reste-t-il pour cycler ? Mesure-le sur des profils réels :
   \`(target_kcal − floor_kcal) / target_kcal\`. Si la marge est ~0, le cyclage proposé est
   arithmétiquement impossible et \`redistributeAfterClamp\` bouclerait dans le vide.
3. MAX_DAY_RATIO=1.35 et ALPHA=0.7 : que donnent-ils concrètement sur ces profils ?
4. La spec dit « lipides plancher 0,5 g/kg » — or P1.4 a livré 0,8 g/kg de MASSE MAIGRE
   précisément parce que le poids de corps était l'erreur. La spec est-elle à jour ?
5. Bénéfice utilisateur réel vs coût : est-ce que ça sert la North Star (7 jours consécutifs
   d'usage sur 14) ou est-ce de la sophistication invisible ?
`,
  },
  {
    slug: 'p22',
    nom: 'P2.2 — calibration empirique (facteur k)',
    mission: `
Section « P2.2 — Calibration empirique (facteur k) » de la spec.

Le moteur ne mesure jamais son écart à la réalité. La spec propose un coefficient
adimensionnel k ∈ [0.80, 1.20] appris des pesées, avec BETA_UP=0.5 / BETA_DOWN=0.25,
régression linéaire pondérée, ≥ 8 pesées sur ≥ 14 jours dans une fenêtre de 21,
refus de la 3e baisse consécutive, hystérésis d'affichage (|Δ| > 3 % ET ≥ 7 jours).

⚠️ ANGLE LE PLUS IMPORTANT DE TOUT CET AUDIT : l'étape 3 vient de poser le NEAT par
défaut à \`desk\` = 1,20 pour la quasi-totalité des utilisateurs, en assumant que
sous-estimer est l'erreur la moins grave parce qu'elle est VISIBLE sur la balance. P2.2
est exactement le mécanisme qui transformerait cette visibilité en correction automatique.
QUANTIFIE ça : pour un utilisateur dont le vrai NEAT est 1,36 mais qui n'a pas répondu à
la question, en combien de temps et avec quelle précision k rattraperait-il l'erreur ?
Est-ce que k et le NEAT ne se marchent pas dessus (deux boutons pour le même réglage) ?

Questions à trancher PAR LA MESURE :
1. Les données existent-elles ? Lis \`lib/weight.ts\` (WeightEntry, loadWeights, lastDelta)
   et \`hooks/useWeightLog.ts\`. Quelle est la CADENCE réelle de pesée que le produit
   encourage (\`WEIGH_IN_INTERVALS\`, \`weigh_in_frequency\`, défaut) ? Le critère « ≥ 8 pesées
   sur ≥ 14 jours dans une fenêtre de 21 » est-il ATTEIGNABLE avec le défaut du produit,
   ou exclut-il d'emblée la majorité des utilisateurs ? C'est un test de faisabilité, pas
   de goût : si le défaut est hebdomadaire, 8 pesées prennent 8 semaines.
2. L'apport estimé est le plan PRESCRIT, pas l'apport réel. Quantifie la spirale que la
   spec elle-même redoute, et vérifie que BETA_DOWN=0.25 + refus de la 3e baisse suffisent.
3. Collision avec l'objectif daté (lib/datedGoal.ts) : la trajectoire datée pilote déjà la
   cible depuis l'écart au poids visé. k piloterait la cible depuis l'écart au poids OBSERVÉ.
   Deux boucles de rétroaction sur la même grandeur — se stabilisent-elles ou oscillent-elles ?
   MESURE-LE en simulant plusieurs semaines.
4. Collision avec le plancher et le registre RED-S : si k fait baisser le budget d'une
   utilisatrice déjà au plancher, que se passe-t-il ? Le registre \`low_ea_weeks\` s'emballe-t-il ?
5. Sécurité : k borné à 0.80 signifie qu'on peut prescrire 20 % de moins que le TDEE calculé,
   EN PLUS du déficit de l'objectif. Est-ce compatible avec CLAUDE.md §6 ? Le plancher
   protège-t-il vraiment dans tous les cas ? Cherche un contre-exemple en exécutant le code.
6. Migration Supabase nécessaire ? (attention : mode de panne PGRST204 déjà rencontré 3 fois)
`,
  },
  {
    slug: 'p13',
    nom: 'P1.3 — retrait de Katch-McArdle, reporté en P2',
    mission: `
Section « P1.3 — Retrait de Katch-McArdle » de la spec. Cet item a été SORTI de P1 par
décision du fondateur, avec pour consigne : « à reprendre en P2, avec un design propre de
l'interaction plancher/BMR ». Ta mission est de dire s'il est mûr MAINTENANT.

Rappel du motif du report (AGENTS.md) : la correction rouvrait un déficit de −84 kcal/j à
la femme que l'escalade RED-S avait ramenée à la maintenance, et faisait passer au ROUGE le
test « le registre se VIDE une fois ramenée à la maintenance ». Amplitude −358 à +437 kcal/j,
point de bascule ~21 % de MG chez l'homme, ~33 % chez la femme.

⚠️ CE QUI A CHANGÉ DEPUIS : l'étape 3 a fait baisser le TDEE de tout le monde, et le
plancher mord désormais bien plus souvent. Le calcul de report a-t-il encore le même
résultat ? REFAIS-LE en exécutant le code d'aujourd'hui, ne te fie pas au chiffre de l'audit
précédent — il a été mesuré sur le moteur d'AVANT.

Questions à trancher PAR LA MESURE :
1. Le test nommé dans AGENTS.md passe-t-il encore si on retire Katch-McArdle ? Trouve-le
   dans \`lib/__tests__/safety.test.ts\` et vérifie-le concrètement (tu peux simuler le
   retrait DANS TON FICHIER SCRATCH en recalculant à la main, sans modifier le code).
2. Le saut MSJ↔KM à la bascule : combien vaut-il AUJOURD'HUI, après l'étape 3 ?
3. Existe-t-il une troisième voie que ni la spec ni l'audit n'ont considérée — par exemple
   garder KM mais borner son écart à MSJ, ou moyenner les deux ? Chiffre-la.
4. Verdict : mûr pour livraison, ou encore à reporter ? Si à reporter, DIS PRÉCISÉMENT ce
   qui doit être vrai pour qu'il devienne livrable.
`,
  },
]

phase('Mesurer')

const resultats = await pipeline(
  ITEMS,
  (it) => agent(
    `${CONTEXTE}\n\n# TA MISSION — ${it.nom}\n\nTon slug de fichier scratch : \`${it.slug}\`\n${it.mission}\n\nRends un verdict structuré. Sois brutal : si l'item ne mérite pas d'être livré, dis-le.`,
    { label: `mesure:${it.slug}`, phase: 'Mesurer', schema: VERDICT },
  ),
  (v, it) => v ? agent(
    `${CONTEXTE}\n\n# TA MISSION — CONTRE-EXPERTISE ADVERSE de ${it.nom}\n\nTon slug de fichier scratch : \`${it.slug}-refut\`\n\nUn auditeur vient de rendre le verdict ci-dessous. Ton rôle est de le DÉTRUIRE, pas de le confirmer.\nPars du principe qu'il s'est trompé et cherche où. Trois angles obligatoires :\n1. Ses MESURES sont-elles reproductibles ? Refais-en au moins deux toi-même, indépendamment.\n2. A-t-il raté une INTERACTION avec les garde-fous P0 (plancher d'énergie disponible,\n   registre RED-S \`low_ea_weeks\`, blocage sous IMC 18,5, plafond de déficit 25 %) ou avec\n   l'étape 3 (NEAT par défaut, MET nets, plancher qui mord plus souvent) ?\n3. A-t-il pris la spec pour argent comptant quelque part ? Ou au contraire l'a-t-il rejetée\n   sur une lecture rapide alors qu'elle a raison ?\nEt une question de fond : cet item sert-il la North Star (7 jours consécutifs d'usage dans\nles 14 premiers jours) ou est-ce de la sophistication que personne ne verra ?\n\nSi après vérification le verdict tient, dis-le franchement — un « il tient » honnête vaut\nmieux qu'une objection fabriquée.\n\n## VERDICT À ATTAQUER\n${JSON.stringify(v, null, 1)}`,
    { label: `réfute:${it.slug}`, phase: 'Réfuter', schema: REFUTATION },
  ).then((r) => ({ item: it.nom, slug: it.slug, verdict: v, refutation: r })) : null,
)

const valides = resultats.filter(Boolean)
log(`${valides.length}/${ITEMS.length} items audités et contre-expertisés`)

phase('Synthétiser')

const synthese = await agent(
  `${CONTEXTE}\n\n# TA MISSION — SYNTHÈSE ET PLAN DE LIVRAISON P2\n\nTrois items ont été audités puis contre-expertisés. Tu dois produire le document d'arbitrage\nque le fondateur lira pour décider. Il est fondateur solo, non-développeur : français clair,\ndécisions tranchées, pas de « ça dépend » sans proposition.\n\nTon slug de fichier scratch si tu as besoin de vérifier un chiffre : \`synthese\`.\n\nRègles de synthèse :\n- Quand l'auditeur et le contre-expert se contredisent, TRANCHE, et dis sur quelle mesure.\n- Un chiffre non mesuré ne rentre pas dans le document.\n- Donne un ORDRE DE LIVRAISON justifié. Le principe qui a marché pour P1 : ce qui ne déplace\n  aucune calorie d'abord, ce qui déplace le budget en dernier.\n- Dis explicitement ce qu'il NE FAUT PAS livrer, et pourquoi. C'est la partie la plus utile.\n- Si un item ne mérite pas d'exister, dis-le sans détour.\n- Termine par les TROUS : ce que ni la spec, ni les auditeurs, ni les contre-experts n'ont\n  couvert, et que le fondateur devrait savoir.\n\nFormat : markdown, dense, sans remplissage. Pas d'introduction de politesse.\n\n## DOSSIER\n${JSON.stringify(valides, null, 1)}`,
  { label: 'synthèse P2', phase: 'Synthétiser' },
)

return { synthese, detail: valides }
