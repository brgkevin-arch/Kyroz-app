import { localStamp } from './weight';
import { Goal, GoalTarget } from './types';
import { BodyInput, clamp, deficitBlocked, resolvedBodyFatPct } from './safety';

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
  directionMismatch: boolean; // true = poids cible incohérent avec l'objectif → pas de pilotage
  underweightBlocked: boolean; // true = IMC < 18,5 → aucune perte pilotée (cf. safety.deficitBlocked)
  projectedDate: string;     // date réelle d'atteinte AU RYTHME RÉELLEMENT APPLIQUÉ
  reachableByDate: boolean;  // false = tu y arrives après ta date
  dailyKcalDelta: number;    // signé, alimente le cerveau macro (recalcProfile)
}

/** Profil minimal requis pour piloter un objectif daté. `UserProfile` le satisfait. */
export type GoalBody = BodyInput & { goal: Goal };

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
      directionMismatch: false,
      underweightBlocked: false,
      projectedDate: target.target_date,
      reachableByDate: true,
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
      directionMismatch: false,
      underweightBlocked: true,
      projectedDate: target.target_date,
      reachableByDate: false,
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
      directionMismatch: true,
      underweightBlocked: false,
      projectedDate: target.target_date,
      reachableByDate: false,
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

  // Rythme RÉELLEMENT appliqué après tous les plafonds → c'est lui qui doit dater
  // la projection, sinon l'UI affiche deux chiffres qui se contredisent.
  const appliedWeeklyKg = (dailyKcalDelta * 7) / kcalPerKg;
  // `!== 0` laissait passer `-0` (produit par un TDEE nul) et faisait retomber sur
  // `weeksRemaining`, donc « atteignable » alors que le rythme servi était nul.
  const weeksNeeded = Math.abs(appliedWeeklyKg) > 1e-9 ? diff / appliedWeeklyKg : Infinity;
  const projectedDate = Number.isFinite(weeksNeeded)
    ? addDaysStamp(today, weeksNeeded * 7)
    : target.target_date;
  // Rien n'a été bridé pour raison de sécurité ⇒ la date tient, quelle que soit la
  // dilution interne du dernier septième de semaine.
  const reachableByDate = !clamped || weeksNeeded <= weeksRemaining + 1e-6;

  return {
    ...base,
    active: true,
    requiredWeeklyKg: round1(requiredWeeklyKg),
    safeWeeklyKg: round1(appliedWeeklyKg),
    clamped,
    deficitCapped,
    directionMismatch: false,
    underweightBlocked: false,
    projectedDate,
    reachableByDate,
    dailyKcalDelta,
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

export type TrackState = 'ahead' | 'on_track' | 'behind';

export interface TrackStatus {
  idealNowKg: number;  // où tu devrais être aujourd'hui
  deltaKg: number;     // actuel − idéal (signé)
  state: TrackState;
}

// Demi-largeur de la ZONE « sur la pente ». Volontairement LARGE (±1 kg) : le poids
// fluctue de 1-2 kg/jour (eau, sel, glycogène) — une tolérance étroite transformerait
// du bruit de balance en « échec » et créerait de la charge mentale (anti-North Star).
// On préfère rassurer : tant qu'on est dans le couloir, c'est bon.
export const TRACK_TOLERANCE_KG = 1.0;

/**
 * Verdict d'avancement vs la trajectoire idéale. `behind` dépend du SENS de
 * l'objectif : en sèche, être au-dessus de l'idéal = en retard ; en prise, c'est
 * l'inverse. Renvoie null sans objectif.
 */
export function trackStatus(
  target: GoalTarget | undefined | null,
  currentWeightKg: number,
  today: string,
): TrackStatus | null {
  if (!target) return null;
  const idealNow = idealWeightAt(target, today);
  const delta = currentWeightKg - idealNow;
  const losing = target.target_weight_kg < target.start_weight_kg;
  let state: TrackState = 'on_track';
  if (Math.abs(delta) > TRACK_TOLERANCE_KG) {
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
  const s = datedGoalStatus(target, p, today, tdee);
  return s && s.active ? s.dailyKcalDelta : null;
}
