// ── Jours plus copieux (ex-« banque de calories ») ───────────────────────────
//
// L'utilisateur déclare qu'un JOUR DE LA SEMAINE est plus copieux, et la semaine
// se rééquilibre autour. Gratuit depuis le 2026-08-18 — ce n'est plus un pilier
// Kyroz+ (cf. `lib/premium.ts`), mais ça reste le seul réglage qui touche le moteur.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │ TODO(banque-cle-jour-de-semaine) — DETTE CONNUE, NON CORRIGÉE.            │
// └───────────────────────────────────────────────────────────────────────────┘
// `profiles.calorie_bank` est indexé par `getDay()` (0–6) : **ni date, ni
// expiration**. Trois conséquences, dont une est un bug d'affichage franc.
//
//  1. AUCUN MOYEN D'EXPRIMER UN ÉVÉNEMENT PONCTUEL. Poser « samedi +600 » vaut
//     pour TOUS les samedis, à vie. Ce n'est plus un mensonge depuis que
//     l'éditeur le dit (« c'est un rythme, pas un événement »), mais le besoin
//     d'origine — un resto, un anniversaire — n'a plus AUCUNE réponse dans le
//     produit depuis que « J'ai mangé hors plan » est mis de côté.
//
//  2. 🔴 UN ÉCART ORPHELIN RESTE AFFICHÉ ALORS QUE LE MOTEUR L'IGNORE.
//     `offsetsForPlan` ne lit que les jours PRÉSENTS dans `plan_weekdays` — un
//     écart posé sur un jour retiré du plan est silencieusement ignoré (c'est
//     documenté et volontaire). Mais `profil.tsx::bankResume` lit la banque
//     BRUTE, tous jours confondus : la ligne du Profil continue d'annoncer
//     « Samedi +600 » pendant que le plan n'en tient aucun compte. Pire, les
//     puces de l'éditeur ne montrent que les jours du plan — la valeur ne peut
//     donc plus être ni vue ni effacée depuis l'écran. C'est un « chiffre affiché
//     qui n'est pas celui qui sera servi » (CLAUDE.md §10).
//     ➡️ Reproduction : poser samedi +600, puis retirer samedi de `plan_weekdays`.
//
//  3. LA RÉPARTITION IGNORE LE TEMPS. `bankedDailyTargets` étale l'écart sur tous
//     les autres jours du plan, y compris ceux DÉJÀ PASSÉS dans la semaine en
//     cours. Sans conséquence tant que le réglage est posé à l'avance (c'est son
//     usage prévu) ; bloquant le jour où on voudrait s'en servir après coup.
//
// ⚠️ Aucune de ces trois n'est corrigeable sans DÉCIDER d'abord ce que la donnée
// doit être (un rythme permanent, une date, ou les deux). Cf. le brief
// `../docs/archive/2026-08-18-inventaire-banque-et-hors-plan.md`, question ouverte n°1.
//
// CE QUE CE MODULE FAIT : répartir un écart déclaré sur les autres jours du plan,
// sans jamais descendre sous le plancher de sécurité.
// CE QU'IL NE FAIT PAS : toucher aux protéines. Elles ont un plancher QUOTIDIEN
// (§6) et ne se lissent pas — un jour à +600 kcal ne dispense pas de ses protéines,
// et un jour compensé n'en perd pas.
//
// POURQUOI UN MODULE À PART, ET PUR : `buildLocalPlan` est le cœur du produit
// (CLAUDE.md §5 : core loop avant tout). Le calcul des cibles quotidiennes se teste
// ici, isolément, sans dérouler un plan entier.

/** Écart déclaré sur un jour du plan : index 1-based → kcal (signé). */
export type DayOffsets = Record<number, number>;

export interface BankInput {
  /** Nombre de jours du plan (1–7). */
  days: number;
  /**
   * Cible calorique quotidienne normale, avant banque.
   *
   * Un TABLEAU (index 0 = jour 1) depuis la répartition par volume sportif du
   * 2026-08-06 : les jours n'ont plus tous la même cible avant banque. Un nombre
   * reste accepté et vaut « la même cible partout » — c'est le cas dégénéré, pas
   * un second chemin.
   */
  baseTargetKcal: number | number[];
  /** Écarts déclarés, par index de jour du plan (1-based). */
  offsets: DayOffsets;
  /**
   * Plancher PERSONNALISÉ (`safety.safetyFloorKcal`), pas le filet absolu
   * 1500/1200. Compenser jusqu'au filet absolu servirait 1200 kcal à une femme
   * dont le minimum physiologique est ~1863 — exactement ce que le §6 de
   * CLAUDE.md interdit depuis que le plancher principal a changé.
   */
  floorKcal: number;
}

export interface BankResult {
  /** Cible kcal de chaque jour, index 0 = jour 1. */
  targets: number[];
  /**
   * Ce qui n'a PAS pu être repris sur la semaine parce que les autres jours
   * étaient au plancher. > 0 = la semaine finit au-dessus de sa cible.
   * L'UI doit le dire : un écart avalé en silence est un mensonge.
   */
  uncompensatedKcal: number;
}

/**
 * Traduit les écarts déclarés par JOUR DE SEMAINE (getDay : 0=Dim … 6=Sam) en
 * écarts par INDEX de jour du plan (1-based).
 *
 * Même mécanique que `restDaysForProfile` : l'utilisateur raisonne en « samedi »,
 * le moteur en « jour 6 du plan ». Un écart posé sur un jour hors du plan est
 * simplement ignoré — il ne peut pas être servi.
 */
/**
 * Les jours de la semaine que le plan SERT réellement — **règle unique**.
 *
 * Elle existe parce qu'elle était implicite, et qu'un écran l'avait perdue :
 * `profil.tsx::bankResume` annonçait « Sam +600 » en lisant la banque brute,
 * alors que le moteur ignore un jour absent du plan. Un chiffre affiché doit
 * être celui qui sera servi (CLAUDE.md §10) — donc tout ce qui décide « ce jour
 * compte-t-il ? » passe par ici, moteur comme affichage.
 *
 * ⚠️ La troncature à `days` n'est pas décorative : `plan_weekdays` peut être plus
 * long que `plan_days`, et seuls les `days` PREMIERS jours sont servis.
 */
export function servedWeekdays(planWeekdays: number[] | undefined, days: number): number[] {
  return (planWeekdays ?? []).slice(0, Math.max(0, days));
}

export function offsetsForPlan(
  bank: Record<string, number> | undefined,
  planWeekdays: number[] | undefined,
  days: number,
): DayOffsets {
  const out: DayOffsets = {};
  if (!bank) return out;
  const wd = servedWeekdays(planWeekdays, days);
  for (let i = 0; i < wd.length; i++) {
    const kcal = bank[String(wd[i])];
    if (typeof kcal === 'number' && Number.isFinite(kcal) && kcal !== 0) out[i + 1] = kcal;
  }
  return out;
}

/** Somme des écarts déclarés sur les jours réellement dans le plan. */
export function totalOffset(offsets: DayOffsets, days: number): number {
  let t = 0;
  for (let d = 1; d <= days; d++) t += offsets[d] ?? 0;
  return t;
}

/**
 * Cibles caloriques quotidiennes une fois la banque appliquée.
 *
 * Principe : la SEMAINE garde son total. Un jour à +600 se paie sur les autres
 * jours du plan, à parts égales — jamais sur les protéines, jamais sous le
 * plancher. Si le plancher empêche de tout reprendre, le reste est déclaré et
 * NON avalé (`uncompensatedKcal`).
 *
 * Déterministe : mêmes entrées → mêmes sorties, comme tout le moteur.
 */
export function bankedDailyTargets(input: BankInput): BankResult {
  const { days, baseTargetKcal, offsets, floorKcal } = input;
  if (days <= 0) return { targets: [], uncompensatedKcal: 0 };

  const floor = Math.max(0, floorKcal);
  const baseDu = (d: number) => (
    Array.isArray(baseTargetKcal) ? (baseTargetKcal[d - 1] ?? 0) : baseTargetKcal
  );
  // 1 — cibles brutes : la cible normale DU JOUR, plus l'écart déclaré du jour.
  const targets: number[] = [];
  for (let d = 1; d <= days; d++) targets.push(baseDu(d) + (offsets[d] ?? 0));

  // 2 — ce qu'il faut reprendre (ou rendre) sur le reste de la semaine.
  let àRépartir = -totalOffset(offsets, days);

  // Les jours porteurs d'un écart déclaré ne servent pas d'amortisseur : l'user a
  // dit « samedi je mange plus », pas « samedi je mange plus ET moins ».
  const amortisseurs = new Set<number>();
  for (let d = 1; d <= days; d++) if (!offsets[d]) amortisseurs.add(d);

  // Aucun jour libre (plan d'un seul jour, ou écart déclaré partout) → il n'y a
  // RIEN sur quoi emprunter. On ne compense pas.
  //
  // ⚠️ Le repli naïf — « répartir sur tout le monde, y compris les jours à écart » —
  // est un piège : il reprend sur le jour même ce qu'on vient d'y ajouter et ANNULE
  // le choix de l'utilisateur. Sur un plan d'un seul jour, déclarer +500 donnait +0.
  // Mieux vaut ne rien compenser et le DIRE que faire semblant.

  // 3 — répartition à parts égales, en plusieurs passes : un jour qui bute sur le
  // plancher rend sa part aux autres. Converge (l'ensemble des jours disponibles
  // décroît strictement à chaque passe bloquée), le garde-fou de boucle est là
  // pour l'invariant, pas pour un cas connu.
  let disponibles = [...amortisseurs];
  for (let passe = 0; passe < days + 1 && Math.abs(àRépartir) > 0.5 && disponibles.length; passe++) {
    const part = àRépartir / disponibles.length;
    const encore: number[] = [];
    let repris = 0;
    for (const d of disponibles) {
      const voulu = targets[d - 1] + part;
      const retenu = Math.max(voulu, floor);
      repris += retenu - targets[d - 1];
      targets[d - 1] = retenu;
      if (retenu > floor) encore.push(d); // ce jour peut encore descendre
    }
    àRépartir -= repris;
    disponibles = encore;
  }

  // 4 — un écart NÉGATIF déclaré (« je mange moins mardi ») peut lui aussi passer
  // sous le plancher : il est borné comme les autres.
  for (let i = 0; i < days; i++) targets[i] = Math.max(targets[i], floor);

  return {
    targets: targets.map((t) => Math.round(t)),
    // Reste positif = des calories en trop qu'on n'a pas pu reprendre.
    // `+ 0` normalise le -0 de Math.round(-0), qui échoue un `toBe(0)`.
    uncompensatedKcal: Math.round(-àRépartir) + 0,
  };
}
