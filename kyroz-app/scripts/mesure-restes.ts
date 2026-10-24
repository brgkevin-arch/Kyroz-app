/**
 * LES RESTES DE PAQUETS D'UNE SEMAINE À L'AUTRE (« niveau 2 », 2026-10-23 et 24).
 *
 * Fondateur : *« je veux que l'user ne jette rien »* — *« il congèle ce qu'il peut »*. Mesure ce
 * que devient le périssable acheté sur la liste de Kyroz : repris à temps par la semaine
 * suivante, à congeler, ou jeté — AVANT (la semaine suivante ignore les restes) et APRÈS (elle
 * les reprend tant qu'ils tiennent, `lib/restesSemaine.ts`).
 *
 * Le circuit est celui de l'app, jour par jour et daté : courses la veille du premier jour
 * (liste = besoin − réserve, seuil par aliment, format vendu), tous les repas cuisinés. Ce qui
 * tient se lit dans `lib/dureeDeVie.ts` (borne basse des sources). Un reste pas repris à temps
 * part au congélateur s'il se congèle, sinon à la poubelle ; dans les deux cas il quitte le frigo.
 * ⚠️ La réserve de l'app, elle, ne connaît pas la péremption : elle garderait le reste.
 *
 * Lancer : `npx tsx scripts/mesure-restes.ts` (pas de ligne `npm run`, cf. CLAUDE.md §2).
 */
import { buildLocalPlan, dayTargetKcal, familyKey, mealIngredients, type Reste } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { buildShoppingList } from '../lib/shoppingList';
import { quantiteRangee } from '../lib/formatsVendus';
import { sousLeSeuil } from '../lib/seuilAchat';
import { addOrMerge, categorize, deductIngredients, type PantryItem } from '../lib/pantry';
import { refDuNom } from '../lib/nomsAliments';
import { datesDuPlan, joursEcoules } from '../lib/semainePlan';
import { dureeDe, tientJusquau } from '../lib/dureeDeVie';
import { restesAReprendre } from '../lib/restesSemaine';
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
const SEMAINES = 5;
/** Un lundi : la semaine w commence 7 × w jours plus tard, les courses se font la veille. */
const LUNDI = new Date(2026, 10, 2);

export function profil(g: (typeof GABARITS)[number], r: string[], days: number, wd: number[]): UserProfile {
  return recalcProfile({
    id: 'mesure', ...g, activity_level: 'moderate', training_days_per_week: 3,
    sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }], neat_level: 'desk', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0, plan_days: days, plan_weekdays: wd,
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: r, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

const date = (decalage: number) => {
  const d = new Date(LUNDI);
  d.setDate(d.getDate() + decalage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
/** Le périssable : ce que `lib/dureeDeVie.ts` connaît (ni sec, ni surgelé, ni fond de placard). Les pièces à part. */
export const perissable = (s: PantryItem[]) => s.filter((i) => {
  const ref = refDuNom(i.name);
  return !!ref && !!dureeDe(ref) && i.unit !== 'pièce';
});

const DRAPEAUX = new Set(['over_target_kcal', 'under_target_kcal', 'protein_below_target']);

export interface Bilan {
  semaines: number; achete: number; restes: number; repris: number; congeler: number; jete: number;
  /** Cuisiné APRÈS sa durée de vie (emballage fermé) : à congeler dès les courses. */
  tropTard: number; tropTardCongelable: number; parTropTard: Record<string, number>;
  repas: number; drapeaux: number; jours: number; ecart: number; doublons: number; semainesClone: number;
  parFamille: Record<string, { restes: number; congeler: number; jete: number }>;
  parAliment: Record<string, { fois: number; g: number; congeler: number; jete: number }>;
}

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

/** Le jour (depuis les courses) où un plan entame un aliment. */
function premierUsage(plan: MealPlan, wd: number[], achat: string, ref: string): number {
  const dates = datesDuPlan(plan, wd)!;
  let premier = Infinity;
  for (const m of plan.meals) {
    const age = joursEcoules(achat, dates[m.day - 1]) ?? Infinity;
    if (age < premier && mealIngredients(m).some((i) => (i.ref ?? refDuNom(i.name)) === ref)) premier = age;
  }
  return premier;
}

/**
 * Plusieurs semaines d'affilée. `viserRestes` : la semaine suivante reçoit-elle les restes ?
 * Le sort de chaque reste est mesuré INDÉPENDAMMENT du moteur : repris seulement les jours où il
 * tient encore (même table), le reste congelé s'il se congèle, sinon jeté.
 */
export function simuler(viserRestes: boolean): Bilan {
  const b: Bilan = {
    semaines: 0, achete: 0, restes: 0, repris: 0, congeler: 0, jete: 0, tropTard: 0, tropTardCongelable: 0, parTropTard: {},
    repas: 0, drapeaux: 0, jours: 0, ecart: 0, doublons: 0, semainesClone: 0, parFamille: {}, parAliment: {},
  };
  for (const g of GABARITS) for (const r of REGIMES) for (const [days, wd] of FORMES) for (const d0 of DEBUTS) {
    const p = profil(g, r, days, wd);
    let reserve: PantryItem[] = [];
    let precedent: { plan: MealPlan; achat: string } | null = null;
    let viser: Map<string, Reste> | undefined;
    for (let w = 0; w < SEMAINES; w++) {
      const achat = date(7 * w - 1);
      const plan = { ...buildLocalPlan(p, d0 + w, undefined, viserRestes ? viser : undefined), week_start_date: date(7 * w) };
      const dates = datesDuPlan(plan, wd)!;
      // Les restes de la semaine d'avant, et jusqu'à quel jour de CE plan chacun tient.
      const restes = precedent ? perissable(reserve).map((it) => {
        const ref = refDuNom(it.name)!;
        const duree = dureeDe(ref)!;
        const limite = tientJusquau(duree, premierUsage(precedent!.plan, wd, precedent!.achat, ref));
        let jusquAu = 0;
        dates.forEach((dt, i) => { if ((joursEcoules(precedent!.achat, dt) ?? Infinity) <= limite) jusquAu = i + 1; });
        return { it, jusquAu, congelable: duree.congeler === true };
      }) : [];
      const avant = total(perissable(reserve));
      const pleine = acheter(plan, reserve);
      // À « Courses terminées » : la semaine suivante se prépare avec ce qui restera de celle-ci.
      viser = restesAReprendre(pleine, plan, plan.meals, achat, { week_start_date: date(7 * (w + 1)), days }, wd);
      reserve = cuisiner(plan, pleine);
      // Le sort des restes d'avant : repris les jours où ils tiennent (premier entré, premier sorti).
      for (const { it, jusquAu, congelable } of restes) {
        const reste = total(cuisiner(plan, [it], (d) => d <= jusquAu));
        reserve = deductIngredients(reserve, [{ name: it.name, quantity_g: reste, unit: it.unit }]);
        const f = (b.parFamille[categorize(it.name)] ??= { restes: 0, congeler: 0, jete: 0 });
        const a = (b.parAliment[it.name] ??= { fois: 0, g: 0, congeler: 0, jete: 0 });
        f.restes += it.quantity; a.fois++; a.g += it.quantity;
        b.restes += it.quantity; b.repris += it.quantity - reste;
        if (congelable) { b.congeler += reste; f.congeler += reste; a.congeler += reste; }
        else { b.jete += reste; f.jete += reste; a.jete += reste; }
      }
      precedent = { plan, achat };
      if (w === 0) continue; // réserve vide au départ : pas de restes à reprendre
      b.semaines++;
      for (const m of plan.meals) {
        const age = joursEcoules(achat, dates[m.day - 1]) ?? 0;
        for (const i of mealIngredients(m)) {
          const duree = dureeDe(i.ref ?? refDuNom(i.name) ?? '');
          if (!duree || age <= tientJusquau(duree, Infinity) || i.unit === 'pièce') continue;
          b.tropTard += i.quantity_g;
          if (duree.congeler === true) b.tropTardCongelable += i.quantity_g;
          b.parTropTard[i.name] = (b.parTropTard[i.name] ?? 0) + i.quantity_g;
        }
      }
      b.achete += total(perissable(pleine)) - avant;
      qualite(b, p, plan);
    }
  }
  return b;
}

export const pc = (a: number, b: number) => `${Math.round((100 * a) / b)} %`;
export function resumer(b: Bilan, log: (s: string) => void) {
  const n = b.semaines;
  log(`${n} semaines (${GABARITS.length} gabarits × ${REGIMES.length} régimes × ${FORMES.length} formes × ${DEBUTS.length} tirages × ${SEMAINES - 1})`);
  log(`périssable acheté : ${Math.round(b.achete / n)} g par semaine (hors surgelés, hors pièces)`);
  log(`restes de la semaine d'avant : ${Math.round(b.restes / n)} g — repris à temps ${pc(b.repris, b.restes)}`);
  log(`  à congeler : ${Math.round(b.congeler / n)} g par semaine · JETÉS : ${Math.round(b.jete / n)} g, soit ${pc(b.jete, b.achete)} du périssable acheté`);
  log(`  par famille (reste → à congeler / jeté, g par semaine) : ${Object.entries(b.parFamille).sort((a, c) => c[1].jete - a[1].jete).map(([k, v]) => `${k} ${Math.round(v.restes / n)} → ${Math.round(v.congeler / n)} / ${Math.round(v.jete / n)}`).join(' · ')}`);
  log(`  cuisiné APRÈS sa durée de vie (fermé, depuis les courses) : ${Math.round(b.tropTard / n)} g par semaine, dont ${pc(b.tropTardCongelable, b.tropTard)} congelable — en tête : ${Object.entries(b.parTropTard).sort((a, c) => c[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${Math.round(v / n)} g`).join(', ')}`);
  log(`qualité : ${b.drapeaux} drapeaux sur ${b.repas} repas · écart au jour ${(100 * b.ecart / b.jours).toFixed(2)} % · quasi-doublons ${(100 * b.doublons / b.repas).toFixed(1)} % des repas, ${pc(b.semainesClone, n)} des semaines`);
}

if (process.argv[1]?.endsWith('mesure-restes.ts')) {
  const log = console.log;
  console.log = () => {};
  console.warn = () => {};
  const avant = simuler(false);
  const apres = simuler(true);
  log('— AVANT : la semaine suivante ignore les restes —');
  resumer(avant, log);
  log('— APRÈS (niveau 2) : la semaine suivante les reprend tant qu\'ils tiennent —');
  resumer(apres, log);

  log('ce qui part encore à la poubelle ou au congélateur, par aliment (g par fois ; avant → après) :');
  const cle = (v: { congeler: number; jete: number }) => v.congeler + v.jete;
  for (const [nom, v] of Object.entries(avant.parAliment).sort((a, c) => cle(c[1]) - cle(a[1])).slice(0, 20)) {
    const w = apres.parAliment[nom];
    const f = (x?: { fois: number; congeler: number; jete: number }) => x ? `${Math.round(x.jete / x.fois)} jeté + ${Math.round(x.congeler / x.fois)} congelé` : '—';
    log(`  ${nom} : ${f(v)} → ${f(w)}`);
  }
}
