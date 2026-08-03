import { localStamp } from './weight';
import { Goal, GoalTarget, LowEaRegistryStored } from './types';
import {
  BodyInput, clamp, countsAsLowEaWeek, deficitBlocked, readLowEaRegistry,
  resolvedBodyFatPct, weekStartStamp, LOW_EA_WINDOW_DAYS,
} from './safety';

// ── Objectif daté (feature premium « Kyroz+ ») ───────────────────────────────
// « Les clés ET le coffre » : le core gratuit donne un bon plan ; l'objectif daté
// pilote la CIBLE CALORIQUE dans le temps pour amener l'utilisateur à un poids
// précis à une date précise — au rythme le plus rapide MAIS SÛR.
//
// Principe : ce module ne fait QUE de la trajectoire (math pure, testable). Il
// produit un `dailyKcalDelta` (signé) qui remplace le delta figé de l'objectif
// (`GOAL_CONFIG[goal].kcalDelta`) dans `recalcProfile` → un seul cerveau macro,
// et le plancher de sécurité (MIN_KCAL, §6) reste appliqué en aval.

// Coût énergétique d'1 kg de masse corporelle. ASYMÉTRIQUE À DESSEIN :
//  • 7700 kcal/kg vaut pour le TISSU ADIPEUX, donc pour la PERTE.
//  • En PRISE, le tissu gagné est mixte et le muscle très hydraté : appliquer 7700
//    symétriquement sur-prescrit le surplus et rend les projections de prise
//    faussement pessimistes (« objectif non atteignable » à tort).
export const KCAL_PER_KG_FAT = 7700;
export const KCAL_PER_KG_GAIN = 5000;

// Rythmes SÛRS (garde-fou santé), en % du poids de corps par semaine.
export const MAX_GAIN_RATE_PCT = 0.5;

/**
 * Rythme de perte maximal (%/semaine), MODULÉ PAR L'ADIPOSITÉ : 1 %/semaine chez
 * un sujet déjà mince entame la masse maigre, alors qu'une réserve adipeuse
 * importante soutient un rythme plus soutenu sans le même coût musculaire.
 */
export function maxWeeklyLossPct(b: BodyInput): number {
  const bf = resolvedBodyFatPct(b);
  const isLean = b.sex === 'male' ? bf < 12 : bf < 20;
  const isHigh = b.sex === 'male' ? bf > 30 : bf > 40;
  if (isLean) return 0.5;
  if (isHigh) return 1.25;
  return 0.75;
}

// Plafond DUR du déficit, en fraction du TDEE. Le plafond en kg/semaine ne suffit
// pas : chez un homme de 120 kg à TDEE 2800, 1 %/sem = 1,2 kg = 1320 kcal/jour,
// soit 47 % du TDEE. Le plancher de sécurité rattrapait en aval, mais la contrainte
// doit exister EN AMONT — sinon la trajectoire annoncée est une fiction.
export const MAX_DEFICIT_TDEE_RATIO = 0.25;

// En-deçà de cet écart au poids cible, on considère l'objectif « atteint » → maintien.
export const MAINTAIN_EPS_KG = 0.3;

/**
 * Le poids cible contredit-il la famille de l'objectif ? (ex. un `bulk` dont la
 * cible est SOUS le poids actuel). On ne bascule alors pas silencieusement en
 * déficit : on le signale et on ne pilote plus (delta 0).
 */
export function goalDirectionMismatch(goal: Goal, diffKg: number): boolean {
  if (Math.abs(diffKg) < MAINTAIN_EPS_KG) return false;
  if (goal === 'cut' || goal === 'cut_aggressive') return diffKg > 0;
  if (goal === 'bulk' || goal === 'lean_bulk') return diffKg < 0;
  return false; // maintain / recomp : les deux sens sont légitimes
}

export interface DatedGoalStatus {
  active: boolean;            // false = pas d'objectif OU échéance passée (plus de pilotage)
  direction: 'lose' | 'gain' | 'maintain';
  currentWeightKg: number;
  targetWeightKg: number;
  targetDate: string;        // 'YYYY-MM-DD'
  weeksRemaining: number;    // arrondi 0,1
  requiredWeeklyKg: number;  // signé (négatif = perdre) — pour tenir la DATE
  safeWeeklyKg: number;      // signé, plafonné au rythme sûr ET au plafond de déficit
  clamped: boolean;          // true = objectif trop rapide pour la date (rythme bridé)
  deficitCapped: boolean;    // true = le plafond des 25 % du TDEE a mordu
  floorCapped: boolean;      // true = le plancher de sécurité rogne le déficit (P1.6)
  directionMismatch: boolean; // true = poids cible incohérent avec l'objectif → pas de pilotage
  underweightBlocked: boolean; // true = IMC < 18,5 → aucune perte pilotée (cf. safety.deficitBlocked)
  projectable: boolean;      // false = aucune date d'atteinte crédible (rythme nul, inversé ou > 5 ans)
  projectedDate: string;     // date réelle d'atteinte AU RYTHME RÉELLEMENT SERVI (cf. projectable)
  reachableByDate: boolean;  // false = tu y arrives après ta date
  /**
   * true = la date choisie ne tient pas, alors Kyroz sert le rythme sûr MAXIMAL au
   * lieu du rythme « juste requis » (A15). La date projetée est alors un POINT FIXE :
   * l'adopter ne la déplace plus. Distinct de `clamped`, qui dit seulement qu'un
   * plafond a mordu — l'UI doit dire « Kyroz creuse au maximum sûr », pas « Kyroz
   * garde le rythme sûr », qui se lirait comme un frein alors que c'est l'inverse.
   */
  maxRateApplied: boolean;
  dailyKcalDelta: number;    // signé, alimente le cerveau macro (recalcProfile)
}

/**
 * Au-delà de cet horizon, une date d'atteinte n'est plus une information mais un
 * artefact : un rythme servi de 0,04 kg/semaine projette poliment une date en 2048.
 * On préfère dire « pas atteignable au rythme sûr » que d'afficher un chiffre faux
 * avec l'aplomb d'un chiffre juste.
 */
export const MAX_PROJECTION_WEEKS = 260; // 5 ans

/** Profil minimal requis pour piloter un objectif daté. `UserProfile` le satisfait. */
export type GoalBody = BodyInput & { goal: Goal; low_ea_weeks?: LowEaRegistryStored };

/** Ce que le moteur SERVIRAIT à un corps donné, une date donnée. Cf. `WeeklyProjector`. */
export interface WeekPoint {
  tdeeKcal: number;
  targetKcal: number;
  sportKcalPerDay: number;
}

/**
 * Projecteur de trajectoire — fourni par `tdee.ts::makeWeeklyProjector`.
 *
 * ⚠️ POURQUOI UNE INJECTION plutôt qu'un import : `tdee.ts` importe déjà ce module
 * (il lui demande le delta calorique). L'import inverse ferait un cycle. Le
 * projecteur est donc passé en paramètre, et son implémentation appelle
 * `datedGoalStatus` avec `project = null` — sans récursion possible, puisque c'est
 * la présence d'un projecteur qui déclenche la simulation.
 */
export type WeeklyProjector = (
  weightKg: number, stamp: string, lowEaWeeks: number,
  /**
   * Delta calorique IMPOSÉ pour cette semaine, au lieu de celui que la politique
   * déduirait de l'échéance. Sert à simuler une trajectoire « rythme sûr maximal »
   * (A15) sans que le simulateur ait à connaître la politique : il exécute le delta
   * qu'on lui donne, le plancher s'applique par-dessus comme d'habitude.
   * Absent = comportement d'origine (le projecteur déduit le delta de l'objectif).
   */
  kcalDeltaOverride?: number,
) => WeekPoint;

// Différence en jours entre deux stamps 'YYYY-MM-DD' (heure LOCALE, cf. weight.ts).
export function daysBetween(a: string, b: string): number {
  const da = Date.parse(a + 'T00:00:00');
  const db = Date.parse(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}
export function addDaysStamp(stamp: string, days: number): string {
  const d = new Date(Date.parse(stamp + 'T00:00:00'));
  d.setDate(d.getDate() + Math.round(days));
  return localStamp(d);
}
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Rythme hebdo (kg, signé) impliqué par une cible servie. Sens → coût du kg. */
function weeklyKgFor(point: WeekPoint): number {
  const daily = point.targetKcal - point.tdeeKcal; // < 0 = déficit
  return (daily * 7) / (daily >= 0 ? KCAL_PER_KG_GAIN : KCAL_PER_KG_FAT);
}

/** Sous ce rythme, la trajectoire est à l'arrêt (1,4 kcal/j) : pas de date. */
const STALLED_KG_PER_WEEK = 0.0005;

/**
 * Semaines réellement nécessaires pour atteindre le poids cible — PAR SIMULATION.
 *
 * ⚠️ Remplace une division par un rythme CONSTANT, qui mentait. Mesuré le
 * 2026-07-31 par simulation sur le moteur, en suivi parfait :
 *
 *   H 80 → 74 : annoncé J+206, réel J+203   (−3 j)
 *   H 95 → 85 : annoncé J+397, réel J+392   (−5 j)
 *   F 65 → 58 : annoncé J+189, réel J+371   (+182 j)
 *   F 80 → 70 : annoncé J+263, réel J+1295  (+1032 j — soit 2030 au lieu de 2027)
 *
 * Deux mécanismes que la division ignorait, tous deux GARANTIS par construction :
 *  1. le TDEE baisse avec le poids → le déficit servi rétrécit à mesure qu'on perd ;
 *  2. l'escalade de zone basse (`safety.effectiveEaPerKgFfm`) relève le plancher à
 *     partir de la 13ᵉ semaine chez la femme non ménopausée. Chez la F 80, le
 *     déficit servi tombe de 285 à 34 kcal/j entre la semaine 13 et la 26 : la
 *     trajectoire s'aplatit, et la carte continuait d'annoncer la pente initiale.
 *
 * On rejoue donc le moteur semaine par semaine (`project`), en tenant le registre
 * de zone basse comme il le sera vraiment — semaines STOCKÉES qui sortent de la
 * fenêtre glissante comprises. Coût : au pire 260 tours d'arithmétique pure.
 *
 * Renvoie `Infinity` si la trajectoire s'arrête, s'inverse, ou dépasse l'horizon.
 */
/**
 * Delta calorique du RYTHME SÛR MAXIMAL à un poids donné — le plus vite que les
 * garde-fous autorisent, sans les franchir. Les deux plafonds d'amont s'appliquent
 * (rythme %/semaine modulé par l'adiposité, puis 25 % du TDEE) ; le plancher
 * d'énergie disponible, lui, mord en aval comme pour n'importe quel delta.
 */
function maxSafeDeltaAt(
  p: GoalBody, weightKg: number, tdee: number, sens: number,
): { delta: number; deficitCapped: boolean } {
  const body = { ...p, weight_kg: weightKg };
  const rate = sens < 0
    ? -(maxWeeklyLossPct(body) / 100) * weightKg
    : (MAX_GAIN_RATE_PCT / 100) * weightKg;
  const raw = Math.round((rate * (rate > 0 ? KCAL_PER_KG_GAIN : KCAL_PER_KG_FAT)) / 7);
  const cap = Number.isFinite(tdee) && tdee > 0 ? -Math.round(MAX_DEFICIT_TDEE_RATIO * tdee) : -Infinity;
  return { delta: raw < cap ? cap : raw, deficitCapped: raw < cap };
}

function weeksToTargetSimulated(
  p: GoalBody, target: GoalTarget, today: string, project: WeeklyProjector,
  /**
   * Simuler au RYTHME SÛR MAXIMAL au lieu de celui que l'échéance déduirait (A15).
   * Sert à répondre à « et si Kyroz creusait autant qu'il en a le droit ? » — la
   * réponse date la trajectoire réellement servie quand la date choisie ne tient pas.
   */
  forceMaxRate = false,
  /**
   * Reçoit, semaine par semaine, le poids que la trajectoire SERVIE fait atteindre.
   * Paramètre de SORTIE, sans effet sur le calcul : il existe pour que le couloir de
   * progression puisse être tracé sur ce que le moteur fera vraiment, au lieu d'une
   * ligne droite vers la date saisie (cf. `simulatedTrajectory`).
   */
  journal?: { stamp: string; weightKg: number }[],
): number {
  // Semaines de zone basse DÉJÀ vécues, avec leur date : elles sortent de la
  // fenêtre de 12 mois au fil de la simulation, comme dans la vraie vie.
  // Un SET, pas deux listes concaténées : la semaine en cours figure déjà dans le
  // registre stocké (le dernier recalcul l'y a écrite), et la simulation la
  // réinscrit — la compter deux fois avançait l'escalade d'une semaine.
  const semaines = new Set(readLowEaRegistry(p.low_ea_weeks).weeks);
  const compteur = (stamp: string) => {
    let n = 0;
    for (const w of semaines) {
      const age = daysBetween(w, stamp);
      if (age >= 0 && age <= LOW_EA_WINDOW_DAYS) n++;
    }
    return n;
  };

  let poids = p.weight_kg;
  for (let semaine = 0; semaine < MAX_PROJECTION_WEEKS; semaine++) {
    const stamp = addDaysStamp(today, semaine * 7);
    journal?.push({ stamp, weightKg: poids });
    // La semaine COURANTE ne compte pas dans son propre plancher (idempotence,
    // cf. safety.lowEaWeeksBefore) : on mesure sur les semaines antérieures.
    const reste = target.target_weight_kg - poids;
    // ARRIVÉ. Le moteur lui-même considère l'objectif atteint à MAINTAIN_EPS_KG
    // près et bascule en maintien (delta 0) : viser le poids au gramme faisait donc
    // caler la simulation sur les 300 derniers grammes — rythme nul, « pas de date »
    // annoncée sur des objectifs parfaitement tenables (mesuré : H 80 → 77 kg).
    if (Math.abs(reste) <= MAINTAIN_EPS_KG) return semaine;

    // Au rythme maximal, deux passes : la première ne sert qu'à connaître le TDEE de
    // la semaine (le plafond des 25 % s'y adosse), la seconde exécute le delta imposé.
    const brut = project(poids, stamp, compteur(stamp));
    const point = forceMaxRate
      ? project(poids, stamp, compteur(stamp), maxSafeDeltaAt(p, poids, brut.tdeeKcal, Math.sign(reste)).delta)
      : brut;
    const rythme = weeklyKgFor(point);

    if (Math.abs(rythme) < STALLED_KG_PER_WEEK) return Infinity;   // à l'arrêt
    if (Math.sign(rythme) !== Math.sign(reste)) return Infinity;   // s'éloigne
    // Franchi DANS la semaine → date exacte par interpolation. La cible utile est
    // le bord de la zone de maintien, cohérente avec le test d'arrivée ci-dessus.
    const utile = reste - Math.sign(reste) * MAINTAIN_EPS_KG;
    if (Math.abs(rythme) >= Math.abs(utile)) return semaine + utile / rythme;

    if (countsAsLowEaWeek({ ...p, weight_kg: poids }, point.targetKcal, point.tdeeKcal, point.sportKcalPerDay)) {
      semaines.add(weekStartStamp(stamp));
    }
    poids += rythme;
  }
  return Infinity; // au-delà de l'horizon : on ne donne pas de date
}

/**
 * La trajectoire que le moteur SERVIRA réellement, semaine par semaine.
 *
 * ⚠️ À employer partout où l'on dessine « où tu devrais en être ». `idealWeightAt`
 * trace une LIGNE DROITE du poids de départ au poids cible sur la date SAISIE — le
 * même raccourci que A15 vient de retirer du moteur. Quand la date n'est pas tenable,
 * cette ligne descend beaucoup plus vite que ce que Kyroz sert, donc l'utilisateur
 * sort de son couloir en quelques jours **en ayant parfaitement suivi le plan**.
 * Reprocher un retard qu'on a soi-même imposé est exactement la charge mentale que
 * CLAUDE.md §10 refuse — le principe était déjà écrit ici pour le cas « déficit
 * bloqué », il manquait pour le cas « date hors de portée ».
 */
export function simulatedTrajectory(
  p: GoalBody, target: GoalTarget, today: string, project: WeeklyProjector,
): { stamp: string; weightKg: number }[] {
  const journal: { stamp: string; weightKg: number }[] = [];
  weeksToTargetSimulated(p, target, today, project, false, journal);
  return journal;
}

/**
 * Trajectoire d'un objectif daté à partir du poids ACTUEL et de la date du jour.
 * Renvoie null s'il n'y a pas d'objectif. `active=false` si l'échéance est passée
 * (on ne pilote plus les calories : retour au delta d'objectif normal en aval).
 */
export function datedGoalStatus(
  target: GoalTarget | undefined | null,
  p: GoalBody,
  today: string,
  tdee: number,
  /**
   * Plancher de sécurité du plan (cf. safety.safetyFloorKcal), OBLIGATOIRE — P1.6.
   *
   * `null` signifie explicitement « aucune correction de plancher applicable ici » :
   * c'est le cas du mode `manual` (la cible y vient des grammes saisis, pas de
   * `tdee + delta`, donc la formule donnerait le signe inverse) et des appelants qui
   * ne veulent que le delta calorique (`datedGoalKcalDelta`, insensible au plancher).
   *
   * Ce paramètre n'est PAS optionnel à dessein : quand il l'était, `DatedGoalCard`
   * compilait sans lui et continuait d'annoncer une date fausse de 32 jours en
   * médiane, jusqu'à 724 au pire. Un oubli devait devenir une erreur de compilation.
   */
  floorKcal: number | null,
  /**
   * Projecteur de trajectoire (cf. `WeeklyProjector`), OBLIGATOIRE — 2026-07-31.
   *
   * `null` signifie explicitement « je ne veux QUE le delta calorique, pas la
   * date » : c'est le cas de `computePlan` et de `datedGoalKcalDelta`, et c'est ce
   * que passe le projecteur lui-même (ce qui exclut toute récursion). Avec `null`,
   * les champs de projection retombent sur l'ancien calcul linéaire — donc trop
   * optimiste chez la femme : AUCUN écran ne doit lire une date obtenue ainsi.
   *
   * Paramètre NON optionnel à dessein, comme `floorKcal` avant lui : quand
   * `floorKcal` l'était, `DatedGoalCard` compilait sans lui et annonçait une date
   * fausse de 32 jours en médiane pendant des semaines. Un oubli doit être une
   * erreur de compilation.
   */
  project: WeeklyProjector | null,
): DatedGoalStatus | null {
  if (!target) return null;

  const currentWeightKg = p.weight_kg;
  const daysLeft = daysBetween(today, target.target_date);
  const weeksRemaining = daysLeft / 7;
  const diff = target.target_weight_kg - currentWeightKg; // signé (négatif = perdre)
  const direction: DatedGoalStatus['direction'] =
    Math.abs(diff) < MAINTAIN_EPS_KG ? 'maintain' : diff < 0 ? 'lose' : 'gain';

  const base = {
    currentWeightKg,
    targetWeightKg: target.target_weight_kg,
    targetDate: target.target_date,
    weeksRemaining: round1(Math.max(weeksRemaining, 0)),
    direction,
  };

  // Échéance passée/nulle → inactif. Objectif déjà atteint → maintien (delta 0, actif).
  if (daysLeft <= 0 || direction === 'maintain') {
    return {
      ...base,
      active: direction === 'maintain' && daysLeft > 0,
      requiredWeeklyKg: 0,
      safeWeeklyKg: 0,
      clamped: false,
      deficitCapped: false,
      floorCapped: false,
      directionMismatch: false,
      underweightBlocked: false,
      projectable: true,
      projectedDate: target.target_date,
      reachableByDate: true,
      maxRateApplied: false,
      dailyKcalDelta: 0,
    };
  }

  const requiredWeeklyKg = diff / weeksRemaining; // signé — le rythme qu'il FAUDRAIT

  // Insuffisance pondérale ATTEINTE EN COURS DE ROUTE : on ne pilote plus aucune
  // perte, quelle que soit la date visée. Le refus à la création de l'objectif
  // (checkEligibility) ne protège que l'instant de la saisie ; ici c'est le poids
  // d'AUJOURD'HUI qui décide, à chaque recalcul. Cohérent avec le moteur, qui
  // remonte le plancher à la maintenance dans le même cas (cf. tdee.floorAndFlags) :
  // sans ce garde-fou, la carte annonçait « 0,5 kg/sem, atteignable le 12 sept. »
  // au-dessus d'un plan qui ne creusait plus du tout.
  if (direction === 'lose' && deficitBlocked(p)) {
    return {
      ...base,
      active: true,
      requiredWeeklyKg: round1(requiredWeeklyKg),
      safeWeeklyKg: 0,
      clamped: false,
      deficitCapped: false,
      floorCapped: false,
      directionMismatch: false,
      underweightBlocked: true,
      projectable: false,
      projectedDate: target.target_date,
      reachableByDate: false,
      maxRateApplied: false,
      dailyKcalDelta: 0,
    };
  }

  // Cohérence signe/objectif : un `bulk` dont la cible est sous le poids actuel ne
  // doit pas basculer silencieusement en déficit. On signale et on ne pilote plus.
  if (goalDirectionMismatch(p.goal, diff)) {
    return {
      ...base,
      active: true,
      requiredWeeklyKg: round1(requiredWeeklyKg),
      safeWeeklyKg: 0,
      clamped: false,
      deficitCapped: false,
      floorCapped: false,
      directionMismatch: true,
      underweightBlocked: false,
      projectable: false,
      projectedDate: target.target_date,
      reachableByDate: false,
      maxRateApplied: false,
      dailyKcalDelta: 0,
    };
  }

  // Garde-fou de division : sous une semaine restante, `diff / weeksRemaining`
  // explose et un écart de 0,5 kg à 2 jours de l'échéance déclencherait un déficit
  // au plafond. On raisonne alors sur une semaine pleine — plus honnête, plus doux.
  const pacedWeeklyKg = diff / Math.max(1, weeksRemaining);
  const maxLoss = -(maxWeeklyLossPct(p) / 100) * currentWeightKg;
  const maxGain = (MAX_GAIN_RATE_PCT / 100) * currentWeightKg;
  const safeWeeklyKg = clamp(pacedWeeklyKg, maxLoss, maxGain);

  // Coût énergétique du kg selon le SENS (cf. KCAL_PER_KG_FAT / _GAIN).
  const kcalPerKg = safeWeeklyKg > 0 ? KCAL_PER_KG_GAIN : KCAL_PER_KG_FAT;
  const rawDelta = Math.round((safeWeeklyKg * kcalPerKg) / 7);

  // Plafond DUR : jamais plus de 25 % du TDEE en déficit.
  //
  // Le TDEE doit être EXPLOITABLE. `tdee_kcal` vaut littéralement 0 sur un profil
  // fraîchement construit (onboarding) et les écrans passent la valeur STOCKÉE :
  // avec 0, `-Math.round(0.25 * 0)` donne `-0`, ce qui annulait la TOTALITÉ du
  // déficit tout en déclarant l'objectif atteignable (car `-0 === 0` en JS).
  // Avec NaN, la comparaison était toujours fausse et le plafond disparaissait
  // en silence. Sans TDEE fiable, on s'en remet au seul plafond de rythme.
  const tdeeUsable = Number.isFinite(tdee) && tdee > 0;
  const maxDeficit = tdeeUsable ? -Math.round(MAX_DEFICIT_TDEE_RATIO * tdee) : -Infinity;
  const deficitCapped = rawDelta < maxDeficit;
  const dailyKcalDelta = deficitCapped ? maxDeficit : rawDelta;

  // « Bridé » = un plafond de SÉCURITÉ a mordu. On compare au rythme LISSÉ, pas au
  // rythme requis brut : sinon le garde-fou de division de la dernière semaine
  // (`Math.max(1, weeksRemaining)`) suffisait à déclarer « objectif ambitieux, tu y
  // arriveras après ta date » un objectif parfaitement sûr — à J-6 pour 0,31 kg
  // restants, alors que le même écart huit jours plus tôt passait « dans les clous ».
  // Et l'arrondi au kcal près ne doit pas suffire à lever le drapeau.
  const rateCapped = Math.abs(safeWeeklyKg - pacedWeeklyKg) > 1e-6;
  const clamped = rateCapped || deficitCapped;

  // ── Plancher de sécurité (P1.6) ───────────────────────────────────────────
  //
  // `dailyKcalDelta` est le delta DEMANDÉ. La cible réellement servie, elle, est
  // relevée au plancher d'énergie disponible en aval (cf. tdee.floorAndFlags) —
  // et jusqu'ici personne ne le disait à la projection. Résultat mesuré sur une
  // grille de 1344 objectifs : écart médian de 32 jours entre la date annoncée et
  // la date réelle, 89 au 90ᵉ centile, 724 au pire, et 655 objectifs déclarés
  // « atteignable » à tort. Les plus touchés ne sont pas une niche : ce sont les
  // hommes sédentaires, dont le plancher (BMR) est proche de leur maintenance.
  //
  // Le plancher ne dépend PAS de la cible (il se calcule sur le corps, le BMR, la
  // dépense sportive et le TDEE) : aucune circularité, il peut donc être calculé
  // avant d'entrer ici. Ce bloc ne change AUCUNE calorie servie — il aligne
  // seulement ce qu'on annonce sur ce qu'on sert.
  const floorUsable = floorKcal != null && Number.isFinite(floorKcal) && tdeeUsable;

  /**
   * D'un delta DEMANDÉ vers tout ce qui en découle. Isolé en fonction parce que A15
   * l'évalue DEUX fois : une fois au rythme requis, une fois au rythme sûr maximal.
   *
   * Trois gardes sur la projection, chacun pour un mode d'échec observé :
   *  1. rythme nul — `!== 0` laissait passer `-0` (produit par un TDEE nul) et
   *     faisait retomber sur `weeksRemaining`, donc « atteignable » à rythme zéro ;
   *  2. rythme INVERSÉ — un plancher au-dessus de la maintenance (BMR mal estimé,
   *     filet absolu sur un très petit gabarit) prescrit un surplus à quelqu'un qui
   *     veut perdre : `diff / applied` redevient positif et la date paraît crédible ;
   *  3. horizon — 0,04 kg/semaine passe les deux gardes précédents et projette une
   *     date en 2048, positive et finie.
   */
  const derive = (demande: number, auMax: boolean) => {
    const served = floorUsable ? Math.max(tdee + demande, floorKcal!) - tdee : demande;
    const applied = (served * 7) / kcalPerKg;
    const avance = Math.abs(applied) > 1e-9 && Math.sign(applied) === Math.sign(diff);
    // Avec un projecteur : la trajectoire est SIMULÉE semaine par semaine (le TDEE
    // baisse, l'escalade de zone basse mord — cf. weeksToTargetSimulated). Sans lui,
    // repli linéaire, réservé aux appelants qui n'utilisent pas la date.
    const weeks = project
      ? weeksToTargetSimulated(p, target, today, project, auMax)
      : (avance ? diff / applied : Infinity);
    const projetable = Number.isFinite(weeks) && weeks <= MAX_PROJECTION_WEEKS;
    return {
      demande, served, applied, weeks, projetable,
      floorCapped: served > demande + 1e-6,
      // Avec projecteur : SEULE la simulation décide. Le raccourci « rien n'a été bridé
      // AUJOURD'HUI ⇒ la date tient » était précisément le mensonge — chez la femme,
      // l'escalade de zone basse ne mord qu'à la 13ᵉ semaine, donc rien n'est bridé le
      // jour où l'on promet la date. Tolérance d'un jour : la simulation avance par pas
      // d'une semaine, on ne va pas refuser une date pour un arrondi de discrétisation.
      reachable: project
        ? projetable && weeks <= weeksRemaining + 1 / 7
        : (!clamped && served <= demande + 1e-6) || (projetable && weeks <= weeksRemaining + 1e-6),
    };
  };

  let etat = derive(dailyKcalDelta, false);

  // ── A15 — quand la date ne tient pas, on creuse autant qu'on en a le DROIT ──
  //
  // Le rythme requis se calcule en LIGNE DROITE (`écart ÷ semaines`) alors que
  // l'arrivée est SIMULÉE. Repousser sa date réduisait donc le déficit demandé, le
  // plancher cessait de mordre, le rythme SERVI tombait — et l'arrivée reculait.
  // Mesuré avant correctif (`npm run mesure:objectif`) : la date de repli affichée
  // glissait de +96 jours dès qu'on l'adoptait, sur 3 corps de référence sur 8.
  //
  // La règle : servir juste ce qu'il faut TANT QUE ça suffit ; dès que ça ne suffit
  // plus, servir le maximum SÛR et dater la trajectoire là-dessus. La date affichée
  // devient alors un point fixe — l'adopter ne la déplace plus, puisque le rythme ne
  // dépend plus de l'échéance.
  //
  // ⚠️ Aucun garde-fou n'est franchi : `maxSafeDeltaAt` applique le plafond de rythme
  // (modulé par l'adiposité) ET les 25 % du TDEE, et le plancher d'énergie disponible
  // mord en aval comme pour n'importe quel delta. On ne va pas plus vite que ce que la
  // sécurité autorisait déjà à quelqu'un ayant choisi une date proche.
  //
  // ⚠️ Réservé aux appelants QUI ONT UN PROJECTEUR : sans simulation, « la date ne
  // tient pas » n'est pas connaissable (le repli linéaire est trop optimiste, de 182 à
  // 1032 jours chez la femme). C'est pourquoi `computePlan` en passe un depuis A15.
  let maxRateApplied = false;
  let deficitCappedFinal = deficitCapped;
  if (project && !etat.reachable) {
    const max = maxSafeDeltaAt(p, currentWeightKg, tdee, Math.sign(diff));
    if (Math.abs(max.delta) > Math.abs(dailyKcalDelta) + 1e-6) {
      const candidat = derive(max.delta, true);
      // On ne bascule que si ça RAPPROCHE vraiment l'arrivée : chez la femme non
      // ménopausée, l'escalade de zone basse peut annuler le gain, et servir plus de
      // déficit pour arriver au même moment serait un coût sans contrepartie.
      if (candidat.projetable && candidat.weeks < etat.weeks - 1 / 7) {
        etat = candidat;
        maxRateApplied = true;
        deficitCappedFinal = max.deficitCapped;
      }
    }
  }

  const dailyKcalDeltaFinal = etat.demande;
  const floorCapped = etat.floorCapped;
  // Rythme RÉELLEMENT servi, après tous les plafonds ET le plancher → c'est lui qui
  // doit dater la projection, sinon l'UI affiche deux chiffres qui se contredisent.
  const appliedWeeklyKg = etat.applied;
  const projectable = etat.projetable;
  const projectedDate = projectable ? addDaysStamp(today, etat.weeks * 7) : target.target_date;
  const reachableByDate = etat.reachable;

  return {
    ...base,
    active: true,
    requiredWeeklyKg: round1(requiredWeeklyKg),
    safeWeeklyKg: round1(appliedWeeklyKg),
    // Servir le maximum sûr, c'est par définition être au plafond de rythme : le
    // signal « un garde-fou a mordu » doit le dire, sinon la carte plancher/plafond
    // disparaît chez ceux qui sont justement bridés.
    clamped: clamped || maxRateApplied,
    deficitCapped: deficitCappedFinal,
    floorCapped,
    directionMismatch: false,
    underweightBlocked: false,
    projectable,
    projectedDate,
    reachableByDate,
    maxRateApplied,
    dailyKcalDelta: dailyKcalDeltaFinal,
  };
}

// ── « Suis-je sur la bonne pente ? » (module Transformation) ─────────────────

/**
 * Poids « idéal » à une date donnée, sur la trajectoire LINÉAIRE départ → cible.
 * Borné aux deux extrémités (avant le départ = poids de départ ; après l'échéance
 * = poids cible). Sert de référence à la courbe et au verdict d'avancement.
 */
export function idealWeightAt(target: GoalTarget, stamp: string): number {
  const total = daysBetween(target.start_date, target.target_date);
  if (total <= 0) return target.target_weight_kg;
  const elapsed = Math.min(Math.max(daysBetween(target.start_date, stamp), 0), total);
  return target.start_weight_kg + (target.target_weight_kg - target.start_weight_kg) * (elapsed / total);
}

export type TrackState = 'ahead' | 'on_track' | 'behind' | 'paused';

export interface TrackStatus {
  idealNowKg: number;  // où tu devrais être aujourd'hui
  deltaKg: number;     // actuel − idéal (signé)
  state: TrackState;
}

// Demi-largeur PLANCHER de la ZONE « sur la pente ». Volontairement LARGE (±1 kg) :
// le poids fluctue de 1-2 kg/jour (eau, sel, glycogène) — une tolérance étroite
// transformerait du bruit de balance en « échec » et créerait de la charge mentale
// (anti-North Star). On préfère rassurer : tant qu'on est dans le couloir, c'est bon.
export const TRACK_TOLERANCE_KG = 1.0;

// Part du poids de corps servant de demi-largeur au-dessus du plancher (P1.5).
export const TRACK_TOLERANCE_PCT = 1.5;

/**
 * Demi-largeur de la zone, PROPORTIONNELLE au gabarit.
 *
 * ±1 kg fixe ne veut pas dire la même chose selon le corps : c'est 2 % du poids à
 * 50 kg et 0,8 % à 120 kg. C'est donc le gabarit **LOURD** qui était jugé le plus
 * strictement en relatif — et c'est lui que ce correctif desserre.
 *
 * ⚠️ Le commentaire précédent affirmait l'inverse (« la personne la plus légère […]
 * se voyait juger avec la tolérance la plus stricte ») en citant ces mêmes nombres,
 * qui le contredisent. Corrigé le 2026-07-29. Ce qui est VRAI et mesuré :
 *   45 kg → 1,000 kg (2,22 %)  ·  66,6 kg → 1,000 kg (1,50 %)
 *   90 kg → 1,350 kg (1,50 %)  ·   120 kg → 1,800 kg (1,50 %)
 * La demi-largeur est PLATE jusqu'à ~67 kg : sous ce poids, la personne garde
 * exactement l'ancienne tolérance, ce correctif ne change rien pour elle.
 *
 * On garde 1 kg comme PLANCHER parce que le bruit de balance (eau, glycogène,
 * contenu digestif) ne diminue PAS proportionnellement au poids : un corps de 45 kg
 * fluctue presque autant en absolu qu'un corps de 65 kg. C'est ça, la vraie raison
 * du plancher — pas une correction d'iniquité envers les gabarits légers.
 */
export function zoneHalfWidthKg(weightKg: number): number {
  const w = Number.isFinite(weightKg) ? weightKg : 0;
  return Math.max(TRACK_TOLERANCE_KG, (TRACK_TOLERANCE_PCT / 100) * w);
}

/**
 * Verdict d'avancement vs la trajectoire idéale. `behind` dépend du SENS de
 * l'objectif : en sèche, être au-dessus de l'idéal = en retard ; en prise, c'est
 * l'inverse. Renvoie null sans objectif.
 *
 * `paused` : le moteur ne pilote PLUS la trajectoire (insuffisance pondérale, ou
 * poids cible qui contredit l'objectif). Sans cet état, `idealWeightAt` continuait
 * de descendre pendant que le plan, lui, était bloqué à la maintenance — on
 * affichait « en retard, +5 kg » à quelqu'un à qui l'app venait précisément
 * d'interdire tout déficit. Reprocher un retard qu'on a soi-même imposé est la
 * définition exacte de la charge mentale qu'on refuse.
 */
export function trackStatus(
  target: GoalTarget | undefined | null,
  currentWeightKg: number,
  today: string,
  /** Le pilotage est-il suspendu ? (cf. DatedGoalStatus.underweightBlocked / directionMismatch) */
  paused: boolean = false,
): TrackStatus | null {
  if (!target) return null;
  const idealNow = idealWeightAt(target, today);
  const delta = currentWeightKg - idealNow;
  if (paused) return { idealNowKg: round1(idealNow), deltaKg: round1(delta), state: 'paused' };
  const losing = target.target_weight_kg < target.start_weight_kg;
  let state: TrackState = 'on_track';
  if (Math.abs(delta) > zoneHalfWidthKg(currentWeightKg)) {
    state = (losing ? delta > 0 : delta < 0) ? 'behind' : 'ahead';
  }
  return { idealNowKg: round1(idealNow), deltaKg: round1(delta), state };
}

/**
 * Delta calorique quotidien (signé) à injecter dans le cerveau macro, ou null si
 * pas d'objectif daté actif (→ le calcul retombe sur le delta d'objectif normal).
 */
export function datedGoalKcalDelta(
  target: GoalTarget | undefined | null,
  p: GoalBody,
  today: string,
  tdee: number,
): number | null {
  // `null` : le delta DEMANDÉ est par construction insensible au plancher (qui
  // s'applique en aval, dans floorAndFlags). Passer un plancher ici ne changerait
  // rien à la valeur renvoyée — seulement la projection, dont cet appelant se moque.
  const s = datedGoalStatus(target, p, today, tdee, null, null);
  return s && s.active ? s.dailyKcalDelta : null;
}
