/**
 * MESURE 02-02 — qu'arrive-t-il quand une colonne du profil est NULL ?
 *
 * L'audit dit « les quatre champs du BMR sont requis ou le plan n'est pas calculé ».
 * Cette mesure regarde CHAQUE colonne synchronisée, une par une, sur le moteur RÉEL —
 * et elle distingue quatre issues, pas deux :
 *
 *   NaN                — l'échec se VOIT (c'est le meilleur des mauvais cas) ;
 *   ABSURDE            — un nombre fini hors de tout sens (plancher absolu, 0 g de protéines) ;
 *   PLAUSIBLE mais FAUX — le pire : rien ne signale que la valeur est inventée ;
 *   aucun effet        — la colonne ne participe pas au calcul, ou son repli est correct.
 *
 * ⚠️ Deux formes de profil sont balayées, et elles ne donnent PAS le même verdict :
 *   · « cibles pré-remplies » = un profil local existant à qui il manque une colonne ;
 *   · « cibles à zéro »       = une ligne cloud partielle, où TOUT est NULL sauf ce champ.
 * C'est la seconde qui décrit le constat.
 *
 *   npx tsx scripts/mesure-profil-incomplet.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePlan } from '../lib/tdee';
import { UserProfile } from '../lib/types';

/**
 * ⚠️ La liste des colonnes est LUE dans `lib/sync.ts`, jamais recopiée : `sync.ts`
 * importe AsyncStorage, donc il n'est pas importable depuis un script Node. Une
 * copie manuelle aurait vieilli en silence à la première migration — exactement le
 * défaut que ce dépôt paie en boucle.
 */
const PROFILE_COLS: string[] = (() => {
  const src = readFileSync(join(__dirname, '..', 'lib', 'sync.ts'), 'utf8');
  const bloc = src.match(/export const PROFILE_COLS = \[([\s\S]*?)\] as const;/);
  if (!bloc) throw new Error('PROFILE_COLS INTROUVABLE dans lib/sync.ts — l instrument est cassé, pas la mesure');
  const cols = [...bloc[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  if (cols.length < 10) throw new Error(`PROFILE_COLS n a rendu que ${cols.length} colonnes — instrument suspect`);
  return cols;
})();

const REF = (cibles: 'remplies' | 'zero'): UserProfile => ({
  id: 'm', sex: 'male', age: 40, weight_kg: 90, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4, goal: 'cut', macro_mode: 'auto',
  ...(cibles === 'remplies'
    ? { tdee_kcal: 2914, target_kcal: 2614, target_protein_g: 198, target_carbs_g: 291, target_fat_g: 73 }
    : { tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0 }),
  plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even',
  variety: 'balanced', dietary_restrictions: [], disliked_foods: [],
  preferred_proteins: [], max_prep_time_min: 30,
} as UserProfile);

const nan = (v: unknown) => typeof v !== 'number' || Number.isNaN(v);
const n = (v: unknown) => (typeof v === 'number' && Number.isNaN(v) ? 'NaN' : String(v));

for (const forme of ['remplies', 'zero'] as const) {
  const ref = REF(forme);
  const t = computePlan(ref);
  console.log(`\n══ Profil de référence, cibles ${forme === 'remplies' ? 'PRÉ-REMPLIES (profil local existant)' : 'À ZÉRO (ligne cloud partielle)'} ══`);
  console.log(`   témoin : cible ${t.profile.target_kcal} · plancher ${t.floor_kcal} · prot ${t.profile.target_protein_g} · ${JSON.stringify(t.flags)}\n`);
  console.log('   champ à null            | cible | plancher | prot | issue');
  console.log('   ------------------------|-------|----------|------|------------------------------------');
  for (const c of PROFILE_COLS) {
    const p = { ...ref, [c]: null } as unknown as UserProfile;
    let cible = '—', plancher = '—', prot = '—', issue: string;
    try {
      const r = computePlan(p);
      cible = n(r.profile.target_kcal); plancher = n(r.floor_kcal); prot = n(r.profile.target_protein_g);
      const cn = r.profile.target_kcal as number, pn = r.profile.target_protein_g as number;
      if (r.flags.includes('PROFIL_INCOMPLET')) issue = '✅ REFUSÉ — le moteur ne conclut pas';
      else if (nan(cn) || nan(pn) || nan(r.floor_kcal)) issue = '🔴 NaN — se voit';
      else if (cn === t.profile.target_kcal && pn === t.profile.target_protein_g) issue = '   aucun effet';
      else if (pn === 0 || cn <= 1500) issue = `🔴 ABSURDE (fini) — prot ${pn} g`;
      // ⚠️ Une INTENTION repliée n'est pas un défaut : `goal` et `macro_mode` disent ce
      // que la personne VEUT, et un repli documenté (maintain / auto) est un choix
      // honnête. Un CORPS replié n'existe pas — d'où la colonne « refusé » ci-dessus.
      else if (c === 'goal' || c === 'macro_mode') issue = `   repli d'INTENTION (Δ ${cn - (t.profile.target_kcal as number) > 0 ? '+' : ''}${cn - (t.profile.target_kcal as number)} kcal)`;
      else issue = `⚠️  PLAUSIBLE mais faux (Δ ${cn - (t.profile.target_kcal as number) > 0 ? '+' : ''}${cn - (t.profile.target_kcal as number)} kcal)`;
    } catch (e) { issue = `🔴 LÈVE : ${String(e).slice(0, 45)}`; }
    console.log(`   ${c.padEnd(23)} | ${cible.padStart(5)} | ${plancher.padStart(8)} | ${prot.padStart(4)} | ${issue}`);
  }
}

console.log('\n══ Le cas du constat : ligne cloud où SEUL `sex` est posé ══');
console.log('   (avant le 2026-08-27 : NaN partout, ET un `LOW_EA_WARNING` — un échec');
console.log('    total habillé en diagnostic de sécurité)');
const partiel = { id: 'x', sex: 'male' } as unknown as UserProfile;
try {
  const r = computePlan(partiel);
  console.log(`   tdee ${n(r.profile.tdee_kcal)} · cible ${n(r.profile.target_kcal)} · plancher ${n(r.floor_kcal)}`);
  console.log(`   P/G/L ${n(r.profile.target_protein_g)}/${n(r.profile.target_carbs_g)}/${n(r.profile.target_fat_g)}`);
  console.log(`   drapeaux ${JSON.stringify(r.flags)}\n`);
} catch (e) { console.log(`   LÈVE : ${e}\n`); }
