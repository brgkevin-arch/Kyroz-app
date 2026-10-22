/**
 * L'ARRONDI DE PAQUET, ALIMENT PAR ALIMENT (2026-10-22, point 3 du fondateur : « le thon,
 * d'autres aliments avaient-ils le même défaut ? »).
 *
 * Compare, sur de vraies listes (réserve vide), l'ancienne règle (tolérance de 5 % sur UN
 * paquet) à la règle actuelle (5 % sur l'achat entier, `formatsVendus.ts::achatPour`), et
 * cherche les arrondis voisins : achat sous 95 % du besoin, mélange de tailles, pièces.
 *
 * Lancer : `npx tsx scripts/mesure-arrondi-paquets.ts` (pas de ligne `npm run`, cf. CLAUDE.md §2).
 *
 * Mesuré le 2026-10-22 (240 listes, 9 352 lignes en paquet, 2 276 à la pièce) : l'ancienne
 * règle prenait un paquet de trop à 19 lignes / 9 aliments (épinards 7, poulet végétal 3,
 * jambon végétal 2, thon 2, seitan, myrtilles, maïs, pois chiches, nouilles de riz) ; la
 * règle actuelle : 0, et 0 achat sous 95 %. Mélange de tailles : 26 lignes à moins de
 * paquets pour le même poids, 2 à quelques grammes de moins ; pièce : 1 tomate de trop.
 */
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { buildShoppingList } from '../lib/shoppingList';
import { FORMATS, achatPour } from '../lib/formatsVendus';
import { refDuNom } from '../lib/pantry';
import { RECIPE_INGREDIENTS } from '../lib/recipeData';
import type { UserProfile } from '../lib/types';

const GABARITS = [
  { sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut' },
  { sex: 'female', weight_kg: 68, height_cm: 168, age: 35, goal: 'maintain' },
  { sex: 'male', weight_kg: 82, height_cm: 180, age: 32, goal: 'cut' },
  { sex: 'male', weight_kg: 95, height_cm: 183, age: 28, goal: 'lean_bulk' },
];
const REGIMES = [[], ['vegetarian'], ['vegan'], ['pescatarian'], ['gluten_free']];
const FORMES: [number, number[]][] = [[7, [1, 2, 3, 4, 5, 6, 0]], [5, [1, 2, 3, 4, 5]], [3, [1, 3, 5]]];
const T = 0.05;

type F = { taille: number };
function choix(besoin: number, formats: F[], regle: 'avant' | 'apres') {
  let r: { f: F; n: number; total: number } | null = null;
  for (const f of formats) {
    const n = regle === 'avant'
      ? Math.max(1, Math.ceil((besoin - T * f.taille) / f.taille))
      : Math.max(1, Math.ceil(besoin / (f.taille * (1 + T)) - 1e-9));
    const total = n * f.taille;
    if (!r || total < r.total || (total === r.total && n < r.n)) r = { f, n, total };
  }
  return r!;
}
/** Le meilleur MÉLANGE de tailles : total minimal ≥ besoin / 1,05, puis le moins de paquets. */
function melange(besoin: number, formats: F[]) {
  const cible = besoin / (1 + T) - 1e-9;
  let best: { total: number; n: number } | null = null;
  const rec = (i: number, tot: number, n: number) => {
    if (tot >= cible) { if (!best || tot < best.total || (tot === best.total && n < best.n)) best = { total: tot, n }; return; }
    if (i >= formats.length) return;
    for (let k = 0; k <= 12; k++) { rec(i + 1, tot + k * formats[i].taille, n + k); if (tot + k * formats[i].taille >= cible) break; }
  };
  rec(0, 0, 0);
  return best as { total: number; n: number } | null;
}

const log = console.log;
console.log = () => {};
console.warn = () => {};
let lignes = 0, aLaPiece = 0, sous95 = 0, melGrammes = 0, melPaquets = 0, pieceDeTrop = 0;
const parAliment: Record<string, { cas: number; trop: number; ex: string }> = {};
for (const g of GABARITS) for (const r of REGIMES) for (const [days, wd] of FORMES) for (let seed = 0; seed < 4; seed++) {
  const p = recalcProfile({
    id: 'mesure', ...g, activity_level: 'moderate', training_days_per_week: 3,
    sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }], neat_level: 'desk', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0, plan_days: days, plan_weekdays: wd,
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: r, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
  for (const it of buildShoppingList(buildLocalPlan(p, seed), []).items) {
    const ref = refDuNom(it.name);
    const regle = ref ? FORMATS[ref] : undefined;
    if (!ref || !regle || RECIPE_INGREDIENTS[ref]?.unit !== it.unit) continue;
    if ('piece' in regle) {
      aLaPiece++;
      const n = Math.max(1, Math.ceil((it.quantity - 0.25 * regle.piece) / regle.piece));
      const n5 = Math.max(1, Math.ceil(it.quantity / (regle.piece * (1 + T)) - 1e-9));
      if (n > n5 && n5 * regle.piece >= it.quantity * 0.95) pieceDeTrop++;
      continue;
    }
    lignes++;
    const av = choix(it.quantity, regle.formats, 'avant'), ap = choix(it.quantity, regle.formats, 'apres');
    if (av.total !== ap.total) {
      const e = (parAliment[it.name] ??= { cas: 0, trop: 0, ex: '' });
      e.cas++; e.trop += av.total - ap.total;
      e.ex ||= `${Math.round(it.quantity)} ${it.unit} : ${av.n} × ${av.f.taille} → ${ap.n} × ${ap.f.taille}`;
    }
    const m = melange(it.quantity, regle.formats);
    if (m && m.total < ap.total) melGrammes++;
    else if (m && m.total === ap.total && m.n < ap.n) melPaquets++;
    const achat = achatPour(it);
    if (achat && achat.total < it.quantity * 0.95 - 1e-6) sous95++;
  }
}
const liste = Object.entries(parAliment).sort((a, b) => b[1].cas - a[1].cas);
log(`lignes en paquet : ${lignes} · à la pièce : ${aLaPiece}`);
log(`ancienne règle, un paquet de trop : ${liste.reduce((s, [, v]) => s + v.cas, 0)} lignes, ${liste.length} aliments`);
for (const [nom, v] of liste) log(`  ${nom} : ${v.cas} cas, ${Math.round(v.trop)} de trop au total — ex. ${v.ex}`);
log(`règle actuelle, achat sous 95 % du besoin : ${sous95}`);
log(`mélange de tailles : ${melGrammes} lignes à moins de grammes, ${melPaquets} à moins de paquets pour le même poids`);
log(`à la pièce, une pièce de plus que 5 % ne l'exigerait : ${pieceDeTrop}`);
