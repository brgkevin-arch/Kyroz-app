// ── Répartition du budget calorique sur les jours de la semaine ──────────────
//
// LE DÉFAUT QUE CE MODULE CORRIGE (mesuré le 2026-07-29, corrigé le 2026-08-06).
// Deux lissages se superposaient : `exerciseKcalPerDay` étalait la dépense sportive
// sur 7 jours, et le plan servait le MÊME nombre de calories chaque jour. Trois
// sorties de 45 min et une sortie de 3 h paraissaient donc identiques au moteur, et
// le jour de la sortie longue recevait le budget d'un jour de repos.
//
// Mesuré (F 60 kg, 25 %MG, sèche, NEAT desk) : l'énergie disponible LISSÉE vaut
// 32,1 quel que soit le volume — le plancher l'y ramène toujours — alors que celle
// du jour VÉCU tombe à 18,9 (2×90), 11,0 (1×120) et 0,4 (1×180). L'app conseillait
// 1683 kcal à une coureuse le jour où elle court trois heures. Ce n'est pas une
// urgence RED-S (l'énergie disponible est une moyenne HEBDOMADAIRE, décision
// fondateur du 2026-07-29) : c'est un problème de QUALITÉ de plan, et il abîme la
// confiance avant d'abîmer le corps.
//
// CE QUE CE MODULE FAIT : répartir le budget de la SEMAINE sur ses jours au prorata
// de la dépense RÉELLE de chacun. Le déficit du jour reste le même partout — c'est
// la dépense qui change, donc l'assiette suit.
// CE QU'IL NE FAIT PAS : changer le total de la semaine. La cible quotidienne du
// profil, le déficit hebdomadaire et donc la trajectoire datée sont INCHANGÉS. Ce
// module déplace des calories, il n'en crée ni n'en retire.
//
// ⚠️ POURQUOI LE PLANCHER N'EST PAS CELUI DE L'ÉNERGIE DISPONIBLE. C'est le point
// qui avait fait rejeter la spec P2.1 le 2026-07-29 : « le ratio des planchers seuls
// vaut déjà 2,30 sur volume concentré », donc aucun cyclage n'y survivait. Ce calcul
// appliquait le plancher d'énergie disponible JOUR PAR JOUR — or il n'est pas
// quotidien. Le raisonnement est déjà écrit et déjà tranché, pour la banque de
// calories (`tdee.ts::bankFloorKcal`) : un mécanisme qui CONSERVE le total de la
// semaine laisse l'exposition hebdomadaire à l'énergie disponible strictement
// inchangée, donc ce qui doit rester infranchissable au jour le jour est le
// métabolisme de base et le filet absolu — rien d'autre. Le même argument, le même
// plancher, ici. Ce qui avait été rejeté (`MAX_DAY_RATIO = 1,35`, un plafond
// arbitraire) ne revient pas : le rapport entre les jours n'est pas un réglage, il
// est celui des dépenses réelles.
//
// POURQUOI UN MODULE À PART, ET PUR : même raison que `calorieBank.ts`, dont il est
// le voisin direct — le calcul des cibles quotidiennes se teste isolément, sans
// dérouler un plan entier.

export interface DailyBudgetInput {
  /** Nombre de jours du plan (1–7). */
  days: number;
  /** Cible calorique quotidienne du profil (la moyenne servie aujourd'hui). */
  baseTargetKcal: number;
  /**
   * Dépense énergétique RÉELLE de chaque jour du plan (index 0 = jour 1), sport
   * du jour compris.
   * ⚠️ L'écart se mesure contre la moyenne de CE TABLEAU, pas contre le TDEE du
   * profil. C'est ce qui garantit `Σ cibles = days × baseTargetKcal` même quand
   * le plan ne couvre pas la semaine entière (`plan_days` < 7) — sur un plan de
   * 3 jours tous à l'entraînement, la répartition redevient plate, ce qui est la
   * bonne réponse : ces trois jours-là se valent.
   */
  dayExpenditureKcal: number[];
  /**
   * Plancher quotidien DUR — `max(BMR, filet absolu)`, cf. `tdee.ts::bankFloorKcal`.
   * Volontairement PAS le plancher d'énergie disponible (voir l'encadré ci-dessus).
   */
  floorKcal: number;
}

export interface DailyBudgetResult {
  /** Cible kcal de chaque jour, index 0 = jour 1. */
  targets: number[];
  /**
   * Ce que les planchers ont empêché de reprendre. > 0 = la semaine finit
   * au-dessus de son budget. Reste à 0 dans tous les cas mesurés ; existe pour
   * que la saturation soit VISIBLE le jour où elle arrive, au lieu d'être avalée.
   */
  uncompensatedKcal: number;
}

/**
 * Cibles caloriques quotidiennes au prorata de la dépense de chaque jour.
 *
 * Principe : `cible du jour = dépense du jour + le MÊME écart qu'aujourd'hui`.
 * L'écart (`baseTargetKcal − dépense moyenne`) est ce que le moteur a déjà décidé
 * de creuser ou d'ajouter — objectif, planchers et plafonds compris. On ne le
 * recalcule pas ici, on se contente de le poser sur la bonne dépense.
 *
 * Conséquence directe et vérifiable : l'énergie disponible du jour VÉCU redevient
 * égale à celle que le moteur annonce, tous les jours. C'est exactement ce qui
 * manquait.
 *
 * Déterministe : mêmes entrées → mêmes sorties, comme tout le moteur.
 */
export function dailyBudgets(input: DailyBudgetInput): DailyBudgetResult {
  const { days, baseTargetKcal, dayExpenditureKcal, floorKcal } = input;
  if (days <= 0) return { targets: [], uncompensatedKcal: 0 };

  // Repli STRICT sur le comportement d'avant : sans dépense par jour utilisable,
  // on rend la cible plate. Un module de répartition qui invente une répartition
  // à partir de rien serait pire que celui qui n'en fait aucune.
  const dep = dayExpenditureKcal.slice(0, days);
  if (dep.length !== days || dep.some((x) => !Number.isFinite(x) || x <= 0)) {
    return { targets: Array.from({ length: days }, () => Math.round(baseTargetKcal)), uncompensatedKcal: 0 };
  }

  const floor = Math.max(0, floorKcal);
  const moyenne = dep.reduce((s, x) => s + x, 0) / days;
  const ecart = baseTargetKcal - moyenne;

  // 1 — cibles brutes : la dépense du jour, plus l'écart commun.
  const targets = dep.map((d) => d + ecart);

  // 2 — les jours sous le plancher y sont relevés ; ce qu'on leur ajoute doit être
  // repris sur ceux qui ont encore de la marge, sinon la semaine gagne des calories
  // que personne n'a décidé de lui donner.
  let àRépartir = 0;
  for (let i = 0; i < days; i++) {
    if (targets[i] < floor) { àRépartir -= floor - targets[i]; targets[i] = floor; }
  }

  // 3 — reprise à parts égales, en plusieurs passes : un jour qui bute à son tour
  // sur le plancher rend sa part aux autres. Converge (l'ensemble des jours
  // disponibles décroît strictement à chaque passe bloquée) ; même mécanique que
  // `calorieBank.ts`, et pour la même raison.
  let disponibles = targets.map((t, i) => (t > floor ? i : -1)).filter((i) => i >= 0);
  for (let passe = 0; passe < days + 1 && Math.abs(àRépartir) > 0.5 && disponibles.length; passe++) {
    const part = àRépartir / disponibles.length;
    const encore: number[] = [];
    let repris = 0;
    for (const i of disponibles) {
      const retenu = Math.max(targets[i] + part, floor);
      repris += retenu - targets[i];
      targets[i] = retenu;
      if (retenu > floor) encore.push(i);
    }
    àRépartir -= repris;
    disponibles = encore;
  }

  return {
    targets: targets.map((t) => Math.round(t)),
    // `+ 0` normalise le -0 de Math.round(-0), qui échoue un `toBe(0)`.
    uncompensatedKcal: Math.round(-àRépartir) + 0,
  };
}
