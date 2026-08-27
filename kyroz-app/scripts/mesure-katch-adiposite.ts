/**
 * MESURE 02-01 — que coûte la fermeture du chemin « %MG mesuré → Katch » ?
 *
 * Deux règles candidates :
 *   (a) SEUIL — `highAdiposity(b)` → Mifflin. C'est ce que la reco publiée demande.
 *   (b) SIGNE — `katchRaw ≤ mifflinRaw` → Mifflin. C'est l'asymétrie que le chemin
 *       « estimé » applique DÉJÀ (`melangeVersKatch` : `d ≤ 0` → `w = 0`), et c'est
 *       ce que la PREMIÈRE phrase de la reco demande (« la même asymétrie »).
 *
 * 🔴 Les deux phrases de la reco ne décrivent pas la même règle, et la seconde est
 * fausse — cf. section 2 : couper à un seuil FIXE introduit une marche allant
 * jusqu'à 571 kcal/j de BMR, **vers le bas**, chez les gabarits lourds. Elle ferait
 * MANGER MOINS des gens que le constat voulait protéger, et rouvrirait exactement la
 * discontinuité que `CA-2-01` a fermée trois jours plus tôt.
 *
 *   npx tsx scripts/mesure-katch-adiposite.ts                    # sections 1-2 + parc
 *   npx tsx scripts/mesure-katch-adiposite.ts --dump <fichier>   # fige l'état courant
 *   npx tsx scripts/mesure-katch-adiposite.ts --diff <fichier>   # compare à cet état
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { computePlan, katchRaw, mifflinRaw, calculateBMR } from '../lib/tdee';
import { highAdiposity } from '../lib/safety';
import { Goal, NeatLevel, Sex, UserProfile } from '../lib/types';

const base = (over: Partial<UserProfile>): UserProfile => ({
  id: 'm', sex: 'male', age: 30, weight_kg: 90, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4, goal: 'cut',
  macro_mode: 'auto', tdee_kcal: 0, target_kcal: 0, target_protein_g: 0,
  target_carbs_g: 0, target_fat_g: 0, plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even',
  variety: 'balanced', dietary_restrictions: [], disliked_foods: [],
  preferred_proteins: [], max_prep_time_min: 30, ...over,
});

const SEXES: Sex[] = ['male', 'female'];
const AGES = [18, 25, 35, 45, 55, 65];
const POIDS = [50, 60, 70, 80, 90, 100, 110, 120, 140, 160];
const TAILLES = [150, 160, 170, 180, 190, 200];
const GOALS: Goal[] = ['cut', 'recomp', 'maintain', 'lean_bulk'];
const NEATS: NeatLevel[] = ['desk', 'light', 'active', 'physical'];
const MG: number[] = []; for (let p = 5; p <= 60; p += 1) MG.push(p);

const args = process.argv.slice(2);
const iDump = args.indexOf('--dump'), iDiff = args.indexOf('--diff');

// ── LE PARC : uniquement le chemin concerné, `body_fat_source: 'measured'` ───
function* parc(): Generator<{ cle: string; p: UserProfile }> {
  for (const sex of SEXES) for (const age of AGES) for (const w of POIDS) for (const h of TAILLES)
    for (const bf of MG) for (const goal of GOALS) for (const neat of NEATS) {
      yield {
        cle: `${sex}|${age}|${w}|${h}|${bf}|${goal}|${neat}`,
        p: base({ sex, age, weight_kg: w, height_cm: h, body_fat_pct: bf,
          body_fat_source: 'measured', goal, neat_level: neat }),
      };
    }
}

function releve(): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {};
  for (const { cle, p } of parc()) {
    const r = computePlan(p);
    out[cle] = [r.profile.target_kcal as number, r.floor_kcal, r.profile.target_protein_g as number];
  }
  return out;
}

if (iDump >= 0) {
  const f = args[iDump + 1];
  const r = releve();
  writeFileSync(f, JSON.stringify(r));
  console.log(`\n  ✅ ${Object.keys(r).length.toLocaleString('fr')} profils figés dans ${f}\n`);
  process.exit(0);
}

if (iDiff >= 0) {
  const avant: Record<string, [number, number, number]> = JSON.parse(readFileSync(args[iDiff + 1], 'utf8'));
  const apres = releve();
  let n = 0, bougent = 0, hausse = 0, baisse = 0, sup100 = 0, max = 0, pire = '';
  let somme = 0;
  for (const cle of Object.keys(apres)) {
    n++;
    const a = avant[cle]?.[0], b = apres[cle][0];
    if (a === undefined) continue;
    const d = b - a;
    if (d === 0) continue;
    bougent++; somme += Math.abs(d);
    if (d > 0) hausse++; else baisse++;
    if (Math.abs(d) >= 100) sup100++;
    if (Math.abs(d) > max) { max = Math.abs(d); pire = `${cle} : ${a} → ${b}`; }
  }
  console.log('\n── Coût sur le parc « %MG mesuré », en CIBLE SERVIE ────────────────');
  console.log(`  profils : ${n.toLocaleString('fr')}   bougent : ${bougent.toLocaleString('fr')} (${(100 * bougent / n).toFixed(1)} %)`);
  console.log(`  cible qui MONTE : ${hausse.toLocaleString('fr')}   cible qui BAISSE : ${baisse.toLocaleString('fr')}`);
  console.log(`  écart moyen (sur ceux qui bougent) : ${(somme / Math.max(1, bougent)).toFixed(0)} kcal/j   max : ${max}`);
  console.log(`  au-dessus du seuil d'avertissement (100 kcal/j) : ${sup100.toLocaleString('fr')}`);
  console.log(`  pire cas : ${pire}`);

  // ⚠️ Les 53 % ci-dessus décrivent une GRILLE UNIFORME de 5 à 60 % de MG, pas le parc :
  // elle sur-représente massivement les fortes adiposités. La ventilation par tranche
  // dit où le changement mord réellement.
  const bandes: [string, number, number][] = [
    ['   5–15 % (sec)', 5, 15], ['  16–25 % (moyen)', 16, 25],
    ['  26–35 % (haut)', 26, 35], ['  36–60 % (très haut)', 36, 60],
  ];
  console.log('\n  Ventilation par tranche de %MG :');
  console.log('  tranche              | profils | bougent |   %  | écart moyen | max');
  for (const [nom, lo, hi] of bandes) {
    let nb = 0, bg = 0, sm = 0, mx = 0;
    for (const cle of Object.keys(apres)) {
      const bf = Number(cle.split('|')[4]);
      if (bf < lo || bf > hi) continue;
      nb++;
      const d = apres[cle][0] - (avant[cle]?.[0] ?? apres[cle][0]);
      if (d !== 0) { bg++; sm += Math.abs(d); mx = Math.max(mx, Math.abs(d)); }
    }
    console.log(`  ${nom.padEnd(20)} | ${String(nb).padStart(7)} | ${String(bg).padStart(7)} | ${(100 * bg / nb).toFixed(0).padStart(3)} % | ${(sm / Math.max(1, bg)).toFixed(0).padStart(11)} | ${String(mx).padStart(4)}`);
  }
  console.log('');
  process.exit(0);
}

// ── 1. Où les deux formules se croisent-elles VRAIMENT ? ────────────────────
let total = 0, hauteAd = 0, sousMifflin = 0;
const croisements: number[] = [];
for (const sex of SEXES) for (const age of AGES) for (const w of POIDS) for (const h of TAILLES) {
  let prec: number | null = null;
  for (const bf of MG) {
    const p = base({ sex, age, weight_kg: w, height_cm: h, body_fat_pct: bf, body_fat_source: 'measured' });
    const s = Math.sign(katchRaw(p) - mifflinRaw(p));
    total++; if (highAdiposity(p)) hauteAd++; if (s <= 0) sousMifflin++;
    if (prec === 1 && s <= 0) croisements.push(bf);
    prec = s;
  }
}
const tri = croisements.slice().sort((a, b) => a - b);
console.log('\n── 1. Le croisement Katch = Mifflin n’est PAS le seuil d’adiposité ──');
console.log(`  corps balayés : ${total.toLocaleString('fr')}   au-dessus du seuil highAdiposity : ${(100 * hauteAd / total).toFixed(1)} %`);
console.log(`  Katch sert MOINS que Mifflin : ${(100 * sousMifflin / total).toFixed(1)} %`);
console.log(`  %MG de croisement : min ${tri[0]} · médiane ${tri[Math.floor(tri.length / 2)]} · max ${tri[tri.length - 1]} (n=${tri.length})`);
console.log('  ➡️ Le seuil est FIXE (30 / 40 %), le croisement ne l’est pas : couper au seuil');
console.log('     coupe au mauvais endroit dans les deux sens.');

// ── 2. La marche que chaque règle introduit ─────────────────────────────────
let marche = 0, pireM = '';
for (const sex of SEXES) for (const age of AGES) for (const w of POIDS) for (const h of TAILLES) {
  const seuil = sex === 'male' ? 30 : 40;
  const p = base({ sex, age, weight_kg: w, height_cm: h, body_fat_pct: seuil + 0.01, body_fat_source: 'measured' });
  const d = katchRaw(p) - mifflinRaw(p);
  if (d > marche) { marche = d; pireM = `${sex} ${w} kg / ${h} cm / ${age} a`; }
}
console.log('\n── 2. La marche introduite AU POINT DE BASCULE (BMR, kcal/j) ───────');
console.log(`  (a) SEUIL : ${marche.toFixed(0)} kcal/j au maximum, VERS LE BAS — pire cas ${pireM}`);
console.log('             (à 30,01 %MG ce corps passerait de Katch à Mifflin, donc mangerait MOINS)');
console.log('  (b) SIGNE : 0 par construction — au point de bascule les deux formules sont ÉGALES');

// ── 3. Le sens du changement, règle (b) ─────────────────────────────────────
let h3 = 0, b3 = 0;
for (const sex of SEXES) for (const age of AGES) for (const w of POIDS) for (const h of TAILLES) for (const bf of MG) {
  const p = base({ sex, age, weight_kg: w, height_cm: h, body_fat_pct: bf, body_fat_source: 'measured' });
  const servi = calculateBMR(p);
  const attendu = Math.max(Math.round(katchRaw(p)), Math.round(mifflinRaw(p)));
  if (attendu > servi) h3++; else if (attendu < servi) b3++;
}
console.log('\n── 3. Sens du changement sous (b) — personne ne doit manger MOINS ───');
console.log(`  BMR qui MONTE : ${h3.toLocaleString('fr')}   BMR qui BAISSE : ${b3.toLocaleString('fr')}`);

// ── 4. Le cas de l’audit ────────────────────────────────────────────────────
console.log('\n── 4. Le cas de l’audit (H 120 kg / 178 cm / 40 a) ──────────────────');
console.log('  %MG | Mifflin | Katch | servi AUJOURD’HUI | (a) SEUIL | (b) SIGNE');
for (const bf of [20, 25, 30, 31, 32, 33, 35, 40, 45, 50]) {
  const p = base({ sex: 'male', age: 40, weight_kg: 120, height_cm: 178, body_fat_pct: bf, body_fat_source: 'measured' });
  const k = Math.round(katchRaw(p)), m = Math.round(mifflinRaw(p));
  console.log(`  ${String(bf).padStart(3)} | ${String(m).padStart(7)} | ${String(k).padStart(5)} | ${String(calculateBMR(p)).padStart(17)}`
    + ` | ${String(highAdiposity(p) ? m : k).padStart(9)} | ${String(Math.max(k, m)).padStart(9)}`);
}
console.log('');
