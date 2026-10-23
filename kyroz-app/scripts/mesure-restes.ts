/**
 * LES RESTES DE PAQUETS D'UNE SEMAINE À L'AUTRE (2026-10-23, « niveau 2 des restes »).
 *
 * Question : le plan suivant devrait-il CHOISIR ses premières recettes avec ce qui reste des
 * paquets de la semaine (les 120 g de poulet en trop) ? Avant de toucher au moteur, mesurer
 * (1) combien de FRAIS reste en fin de semaine et (2) combien la semaine suivante en
 * consomme DÉJÀ, par hasard, telle que le moteur la tire aujourd'hui.
 *
 * Le circuit simulé est celui de l'app : liste = besoin − réserve (`buildShoppingList`, seuil
 * par aliment), achat au format vendu (`quantiteRangee`), tous les repas cuisinés
 * (`deductIngredients`), la semaine suivante tirée sur le tirage suivant (`nextPlanSeed`).
 *
 * Lancer : `npx tsx scripts/mesure-restes.ts` (pas de ligne `npm run`, cf. CLAUDE.md §2).
 */
import { RESTES, buildLocalPlan, dayTargetKcal, familyKey, mealIngredients } from '../lib/planEngine';
import { poidsUnitaire } from '../lib/units';
import { recalcProfile } from '../lib/tdee';
import { buildShoppingList } from '../lib/shoppingList';
import { FORMATS, quantiteRangee } from '../lib/formatsVendus';
import { RECIPE_INGREDIENTS } from '../lib/recipeData';
import { sousLeSeuil } from '../lib/seuilAchat';
import { addOrMerge, categorize, conservationDe, deductIngredients, isStaple, type PantryItem } from '../lib/pantry';
import { refDuNom } from '../lib/nomsAliments';
import type { MealPlan, UserProfile } from '../lib/types';

const GABARITS = [
  { sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut' },
  { sex: 'female', weight_kg: 68, height_cm: 168, age: 35, goal: 'maintain' },
  { sex: 'male', weight_kg: 82, height_cm: 180, age: 32, goal: 'cut' },
  { sex: 'male', weight_kg: 95, height_cm: 183, age: 28, goal: 'lean_bulk' },
];
const REGIMES = [[], ['vegetarian'], ['vegan'], ['pescatarian'], ['gluten_free']];
const FORMES: [number, number[]][] = [[7, [1, 2, 3, 4, 5, 6, 0]], [5, [1, 2, 3, 4, 5]], [3, [1, 3, 5]]];
const DEBUTS = [0, 4];

export function profil(g: (typeof GABARITS)[number], r: string[], days: number, wd: number[]): UserProfile {
  return recalcProfile({
    id: 'mesure', ...g, activity_level: 'moderate', training_days_per_week: 3,
    sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }], neat_level: 'desk', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0, plan_days: days, plan_weekdays: wd,
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: r, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

/** Les courses d'une semaine : la liste (réserve déduite, seuil appliqué), achetée au format. */
export function acheter(plan: MealPlan, reserve: PantryItem[]): PantryItem[] {
  let r = reserve;
  for (const it of buildShoppingList(plan, reserve).items) {
    if (sousLeSeuil(it)) continue;
    r = addOrMerge(r, { name: it.name, quantity: quantiteRangee(it), unit: it.unit, category: it.category });
  }
  return r;
}

export function cuisiner(plan: MealPlan, reserve: PantryItem[], jours?: (d: number) => boolean): PantryItem[] {
  let r = reserve;
  for (const m of [...plan.meals].sort((a, b) => a.day - b.day)) {
    if (m.fixed || (jours && !jours(m.day))) continue;
    r = deductIngredients(r, mealIngredients(m));
  }
  return r;
}

const total = (s: PantryItem[]) => s.reduce((t, i) => t + (i.unit === 'pièce' ? 0 : i.quantity), 0);
/** Rangés « au frais » mais vendus SURGELÉS (`docs/2026-10-23-rangement-reserve.md`) : ils ne se perdent pas en une semaine. */
export const SURGELES = new Set(['edamame', 'fruits_rouges', 'legumes_wok', 'petits_pois']);
// Et si le chou-fleur et les haricots verts s'achetaient surgelés (`--si-surgeles`) ?
if (process.argv.includes('--si-surgeles')) for (const r of ['chou_fleur', 'haricots_verts']) SURGELES.add(r);
/** Le périssable : au frais, hors surgelés et fonds de placard. Les pièces (une courgette) sont comptées à part. */
export const perissable = (s: PantryItem[]) => s.filter((i) => {
  const ref = refDuNom(i.name);
  return !isStaple(i.name) && conservationDe(i) === 'frais' && i.unit !== 'pièce' && !(ref && SURGELES.has(ref));
});

/** Ce qu'un stock devient une fois un plan cuisiné : la part reprise, et ce qui reste. */
function reprendre(plan: MealPlan, stock: PantryItem[], jours?: (d: number) => boolean) {
  const reste = cuisiner(plan, stock, jours);
  return { repris: total(stock) - total(reste), reste };
}

export type Tirage = (p: UserProfile, seed: number, restes: PantryItem[]) => MealPlan;
export interface Bilan {
  semaines: number; achete: number; restes: number; repris: number; repris2j: number; jete: number;
  repas: number; drapeaux: number; jours: number; ecart: number; doublons: number;
  /** Repris AVANT de tourner (`DELAI`), et ce qui a tourné, par famille. */
  semainesClone: number;
  aTemps: number; parFamille: Record<string, { restes: number; jete: number }>;
  parAliment: Record<string, { fois: number; g: number; jete: number }>;
}

/** Les restes tels que le moteur les lit : grammes par `ref` (une pièce convertie à son poids). */
export function restesDuMoteur(restes: PantryItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of restes) {
    const ref = refDuNom(it.name);
    if (!ref) continue;
    const g = it.unit === 'pièce' ? it.quantity * (poidsUnitaire(it.name) ?? 0) : it.quantity;
    if (g > 0) m.set(ref, (m.get(ref) ?? 0) + g);
  }
  return m;
}

/**
 * Combien de jours du plan suivant un reste tient encore — HYPOTHÈSE de mesure, prudente, pas une
 * règle d'hygiène : il a été acheté au début de la semaine qui s'achève. Viande et poisson
 * (similis compris) : le 1er jour, et c'est généreux ; tofu, tempeh, seitan : 3 ; fruits et
 * légumes : 4 ; laitages et œufs : la semaine.
 */
export const DELAI: Record<string, number> = { viandes: 1, autres: 3, 'légumes': 4, laitiers: 7, 'féculents': 7 };
const delai = (it: PantryItem) => DELAI[categorize(it.name)] ?? 7;
/** La même hypothèse, lue par le moteur : combien de jours un reste (ou un paquet ouvert) tient encore. */
export const tientRef = (ref: string) => {
  const ing = RECIPE_INGREDIENTS[ref];
  return ing ? DELAI[categorize(ing.name)] ?? 7 : 7;
};

/** Le plus petit paquet d'un aliment PÉRISSABLE (ce qu'on ouvre), ou rien pour le reste. */
export function paquetPerissable(ref: string): number | undefined {
  const regle = FORMATS[ref];
  const ing = RECIPE_INGREDIENTS[ref];
  if (!regle || !ing || SURGELES.has(ref)) return undefined;
  if (perissable([{ name: ing.name, quantity: 1, unit: ing.unit, category: categorize(ing.name) }]).length === 0) return undefined;
  return 'piece' in regle ? regle.piece : Math.min(...regle.formats.map((f) => f.taille));
}

const DRAPEAUX = new Set(['over_target_kcal', 'under_target_kcal', 'protein_below_target']);
/** La qualité du plan, mesurée comme `scripts/mesure-variete.ts` : drapeaux, écart au jour, quasi-doublons. */
function qualite(b: Bilan, p: UserProfile, plan: MealPlan) {
  const kcal: Record<number, number> = {};
  const familles = new Map<string, Set<string>>();
  for (const m of plan.meals) {
    b.repas++;
    kcal[m.day] = (kcal[m.day] ?? 0) + m.macros.kcal;
    for (const f of m.adapt_flags ?? []) if (DRAPEAUX.has(f)) b.drapeaux++;
    const k = familyKey(m.recipe);
    if (!familles.has(k)) familles.set(k, new Set());
    familles.get(k)!.add(m.recipe.id);
  }
  for (const [d, v] of Object.entries(kcal)) {
    b.jours++;
    const cible = dayTargetKcal(p, plan.days, Number(d));
    b.ecart += Math.abs(v - cible) / cible;
  }
  let clone = false;
  for (const ids of familles.values()) { b.doublons += ids.size - 1; if (ids.size > 1) clone = true; }
  if (clone) b.semainesClone++;
}

/**
 * Plusieurs semaines d'affilée, comme dans l'app. Chaque semaine : courses (réserve déduite),
 * tous les repas cuisinés. Un reste PÉRISSABLE que la semaine suivante ne reprend pas est jeté
 * à la fin de celle-ci (une semaine de frigo de plus) — sans ça, la réserve simulée le
 * garderait à vie et le compterait deux fois.
 * ⚠️ L'app, elle, le garde : la réserve ne connaît pas la péremption.
 */
export function simuler(tirer: Tirage, semaines = 5): Bilan {
  const b: Bilan = { semaines: 0, achete: 0, restes: 0, repris: 0, repris2j: 0, jete: 0, repas: 0, drapeaux: 0, jours: 0, ecart: 0, doublons: 0, semainesClone: 0, aTemps: 0, parFamille: {}, parAliment: {} };
  for (const g of GABARITS) for (const r of REGIMES) for (const [days, wd] of FORMES) for (const d0 of DEBUTS) {
    const p = profil(g, r, days, wd);
    let reserve: PantryItem[] = [];
    for (let w = 0; w < semaines; w++) {
      // Les restes de la semaine d'avant, tels qu'on les connaît à « Courses terminées ».
      const restes = perissable(reserve);
      const plan = tirer(p, d0 + w, restes);
      const avant = total(perissable(reserve));
      const pleine = acheter(plan, reserve);
      reserve = cuisiner(plan, pleine);
      // Premier entré, premier sorti : le plan mange d'abord les restes.
      const { repris, reste: perime } = reprendre(plan, restes);
      for (const it of perime) reserve = deductIngredients(reserve, [{ name: it.name, quantity_g: it.quantity, unit: it.unit }]);
      if (w === 0) continue; // réserve vide au départ : pas de restes à reprendre
      b.semaines++;
      qualite(b, p, plan);
      b.achete += total(perissable(pleine)) - avant;
      b.restes += total(restes);
      b.repris += repris;
      b.repris2j += reprendre(plan, restes, (d) => d <= 2).repris; // les jours du plan partent de 1
      b.jete += total(perime);
      for (const it of restes) {
        const repriseATemps = reprendre(plan, [it], (d) => d <= delai(it)).repris;
        b.aTemps += repriseATemps;
        const f = (b.parFamille[categorize(it.name)] ??= { restes: 0, jete: 0 });
        f.restes += it.quantity; f.jete += it.quantity - repriseATemps;
        const e = (b.parAliment[it.name] ??= { fois: 0, g: 0, jete: 0 });
        e.fois++; e.g += it.quantity; e.jete += total(perime.filter((x) => x.name === it.name));
      }
    }
  }
  return b;
}

export const pc = (a: number, b: number) => `${Math.round((100 * a) / b)} %`;
export function resumer(b: Bilan, log: (s: string) => void) {
  const n = b.semaines;
  log(`${n} semaines (${GABARITS.length} gabarits × ${REGIMES.length} régimes × ${FORMES.length} formes × ${DEBUTS.length} tirages × 4)`);
  log(`périssable acheté : ${Math.round(b.achete / n)} g par semaine (hors surgelés, hors pièces)`);
  log(`restes de la semaine d'avant : ${Math.round(b.restes / n)} g`);
  log(`  repris par le plan : ${pc(b.repris, b.restes)} — sur ses 2 premiers jours : ${pc(b.repris2j, b.restes)}`);
  log(`  jetés : ${Math.round(b.jete / n)} g par semaine, soit ${pc(b.jete, b.achete)} du périssable acheté`);
  log(`  repris AVANT de tourner (viande 1 j, tofu 3 j, légumes 4 j, laitages 7 j) : ${pc(b.aTemps, b.restes)} — donc jetés : ${Math.round((b.restes - b.aTemps) / n)} g par semaine, ${pc(b.restes - b.aTemps, b.achete)} du périssable acheté`);
  log(`  par famille (reste → jeté, g par semaine) : ${Object.entries(b.parFamille).sort((a, c) => c[1].jete - a[1].jete).map(([k, v]) => `${k} ${Math.round(v.restes / n)} → ${Math.round(v.jete / n)}`).join(' · ')}`);
  log(`qualité : ${b.drapeaux} drapeaux sur ${b.repas} repas · écart au jour ${(100 * b.ecart / b.jours).toFixed(2)} % · ${b.doublons} quasi-doublons (${(100 * b.doublons / b.repas).toFixed(1)} % des repas, ${pc(b.semainesClone, n)} des semaines)`);
}

if (process.argv[1]?.endsWith('mesure-restes.ts')) {
  const log = console.log;
  console.log = () => {};
  console.warn = () => {};
  const actuel = simuler((p, seed) => buildLocalPlan(p, seed));
  log('— AVANT : la semaine suivante ignore les restes —');
  resumer(actuel, log);
  const balayage = process.argv.includes('--balayage');
  const reglages = balayage
    ? [
      { jours: 7, ouvertJours: 0, famille: 'stricte' as const, duree: false },
      { jours: 7, ouvertJours: 7, famille: 'stricte' as const, duree: false },
      { jours: 7, ouvertJours: 0, famille: 'stricte' as const, duree: true },
      { jours: 7, ouvertJours: 7, famille: 'stricte' as const, duree: true },
      { jours: 7, ouvertJours: 7, famille: 'preferee' as const, duree: true },
    ].map((r) => ({ ...RESTES, ...r }))
    : [{ ...RESTES }];
  for (const r of reglages) {
    Object.assign(RESTES, r);
    const duree = 'duree' in r && r.duree ? tientRef : undefined;
    const b = simuler((p, seed, restes) => buildLocalPlan(p, seed, undefined, restesDuMoteur(restes), r.ouvertJours > 0 ? paquetPerissable : undefined, duree));
    log(`— APRÈS : restes de la semaine d'avant visés ${r.jours} j · paquets ouverts finis dans les ${r.ouvertJours} j · famille ${r.famille}${'duree' in r && r.duree ? ' · durée de vie' : ''} —`);
    resumer(b, log);
    if (!balayage) {
      log('ce qui part encore à la poubelle (fois en reste, reste moyen, jeté moyen ; avant → après) :');
      for (const [nom, v] of Object.entries(actuel.parAliment).sort((a, c) => c[1].jete - a[1].jete).slice(0, 15)) {
        const w = b.parAliment[nom];
        log(`  ${nom} : ${Math.round(v.jete / v.fois)} g → ${w ? Math.round(w.jete / w.fois) : 0} g (${v.fois} → ${w?.fois ?? 0} fois)`);
      }
    }
  }
}
