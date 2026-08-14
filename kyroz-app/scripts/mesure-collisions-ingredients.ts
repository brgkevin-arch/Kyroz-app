// ── Quels ingrédients du catalogue se confondent ? ───────────────────────────
//
// `matches()` (lib/pantry.ts) apparie deux noms par INCLUSION, dans les deux
// sens : c'est ce qui permet à un « oeufs » saisi à la main de retrouver les
// « Œufs entiers » d'une recette. Le prix, c'est qu'un nom COMPOSÉ avale le nom
// simple qu'il contient — « Mélange wok (poivron/brocoli/carotte) » reconnaît
// « Carotte », et mange son stock dans le frigo.
//
// Ce script compte les couples concernés, et vérifie que `memeAliment()` — le
// prédicat qui tranche par `ref` — les a tous séparés.
//
// Usage : npm run mesure:collisions
import { matches, memeAliment } from '../lib/pantry';
import { RECIPE_INGREDIENTS } from '../lib/recipeData';

const noms = Object.entries(RECIPE_INGREDIENTS).map(([ref, def]) => ({ ref, name: def.name }));

const couples = (predicat: (a: string, b: string) => boolean): string[] => {
  const vus = new Set<string>();
  for (const a of noms) {
    for (const b of noms) {
      if (a.ref === b.ref) continue;
      if (predicat(a.name, b.name)) vus.add([a.name, b.name].sort().join('  <->  '));
    }
  }
  return [...vus].sort();
};

const parNom = couples(matches);
const parRef = couples(memeAliment);

console.log(`ingrédients du catalogue : ${noms.length}`);
console.log(`\ncouples que le NOM confond    : ${parNom.length}`);
for (const c of parNom) console.log('   ' + c);
console.log(`\ncouples que la REF confond    : ${parRef.length}`);
for (const c of parRef) console.log('   ' + c);

if (parRef.length > 0) {
  console.log('\n⚠️ Deux ingrédients de refs différentes se confondent encore.');
  process.exit(1);
}
console.log('\n✅ Deux refs différentes sont bien deux aliments différents.');
