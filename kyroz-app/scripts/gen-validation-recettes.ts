// Génère VALIDATION-RECETTES.md (dossier pour la diététicienne) DEPUIS le code.
//
// Pourquoi un script : la version précédente était écrite À LA MAIN et décrivait
// encore les 50 recettes placeholder (r001…) supprimées depuis — on aurait fait
// valider (et payer) des recettes qui n'existent plus. Un doc de validation ne
// doit JAMAIS être une copie manuelle de la base : il se régénère.
//
//   npm run gen:validation
//
import * as fs from 'fs';
import * as path from 'path';
import { RECIPES } from '../lib/recipeMap';
import { RECIPE_INGREDIENTS } from '../lib/recipeData';
import { DietaryRestriction, Recipe } from '../lib/types';

const CAT = (r: Recipe) =>
  r.tags.includes('breakfast') ? 'Petit-déj' : r.tags.includes('snack') ? 'Collation' : 'Repas';

const OBJ_FR: Record<string, string> = { cut: 'perte de gras', maintain: 'maintien', bulk: 'prise de masse' };
const DIET_FR: Record<DietaryRestriction, string> = {
  vegetarian: 'végétarien', pescatarian: 'pescétarien', no_pork: 'sans porc',
  lactose_free: 'sans lactose', gluten_free: 'sans gluten', vegan: 'végétalien',
  halal: 'halal',
};

// Écart entre les kcal (Ciqual) et le recalcul Atwater 4/4/9. Un écart POSITIF est
// attendu sur les recettes riches en FIBRES : Ciqual compte l'énergie des fibres
// (~2 kcal/g) alors que `carbs_g` les exclut. Ce n'est donc pas une erreur en soi.
const atwater = (r: Recipe) => r.macros_per_portion.protein_g * 4 + r.macros_per_portion.carbs_g * 4 + r.macros_per_portion.fat_g * 9;

const L: string[] = [];
const p = (s = '') => L.push(s);

p('# Kyroz — Dossier de validation diététicienne');
p();
p('> ⚠️ **Fichier GÉNÉRÉ** — ne pas éditer à la main. Régénérer : `npm run gen:validation`.');
p('> Source de vérité = `lib/data/recettes-kyroz-100.json` → `lib/recipeMap.ts`.');
p('>');
p('> **But** : faire valider les recettes par une diététicienne-nutritionniste diplômée avant');
p("> mise en production (CLAUDE.md §6). Tant que la validation n'est pas faite, le champ");
p('> `validated_by_dietitian` reste à `false`.');
p('>');
p('> **Comment l’utiliser** : cocher chaque recette (colonne *OK ?*), noter les remarques, puis');
p('> basculer `validated_by_dietitian` à `true` recette par recette.');
p();
p(`**Nombre de recettes : ${RECIPES.length}**`);
p();

// ── Ce que la diététicienne DOIT savoir pour ne pas mal juger ────────────────
p('## À lire avant de juger les quantités');
p();
p('- **Les portions affichées sont une BASE, pas une portion figée.** Le moteur ajuste ensuite');
p("  chaque ingrédient à la cible calorique de l'utilisateur, dans ces bornes : protéines ×1,0→1,7");
p('  (jamais en dessous de la base), glucides ×0,5→1,8, lipides ×0,5→1,5, laitiers ×0,6→1,6,');
p('  fruits ×0,5→1,6. Légumes et aromates ne sont jamais ajustés.');
p('- **Les féculents et légumineuses sont pesés SECS/CRUS** (comme le riz ou les pâtes) : 70 g de');
p('  riz sec ≈ 200 g cuit. Les viandes et poissons sont pesés **CRUS**. C’est indiqué par recette.');
p('- **Les macros viennent de la table Ciqual (ANSES)**, pas d’estimations maison.');
p('- **Public visé** : adultes en bonne santé, 18–35 ans, sportifs. Pas de pathologie, pas de');
p('  grossesse/allaitement, pas de mineurs (bloqué à l’inscription). Plancher : 1500 kcal/j');
p('  (homme) / 1200 kcal/j (femme).');
p();

// ── Contrôle automatique ────────────────────────────────────────────────────
p('## Contrôle automatique de cohérence énergétique');
p();
p('kcal (Ciqual) vs recalcul Atwater (protéines ×4 + glucides ×4 + lipides ×9).');
p('Un écart **positif** est normal sur les recettes riches en fibres (Ciqual compte l’énergie des');
p('fibres, pas le recalcul). On ne signale que les écarts > 10 %.');
p();
const ecarts = RECIPES
  .map((r) => ({ r, e: r.macros_per_portion.kcal ? (r.macros_per_portion.kcal - atwater(r)) / r.macros_per_portion.kcal : 0 }))
  .filter((x) => Math.abs(x.e) > 0.1)
  .sort((a, b) => Math.abs(b.e) - Math.abs(a.e));
if (!ecarts.length) {
  p('✅ Aucun écart > 10 %.');
} else {
  p(`${ecarts.length} recette(s) avec un écart > 10 % — à confirmer par la diététicienne :`);
  p();
  p('| ID | Recette | kcal (Ciqual) | kcal (Atwater) | Écart | Cause probable |');
  p('|---|---|---|---|---|---|');
  for (const { r, e } of ecarts) {
    const cause = e > 0 ? 'fibres (légumineuses / céréales complètes)' : 'à vérifier';
    p(`| ${r.id} | ${r.name_fr} | ${r.macros_per_portion.kcal} | ${Math.round(atwater(r))} | ${(e * 100).toFixed(0)} % | ${cause} |`);
  }
}
p();

// ── Couverture ──────────────────────────────────────────────────────────────
p('## Couverture par régime');
p();
p('| Régime | Petit-déj | Collations | Repas |');
p('|---|---|---|---|');
const nb = (diet: DietaryRestriction | null, cat: string) =>
  RECIPES.filter((r) => CAT(r) === cat && (diet === null || r.restrictions_ok?.includes(diet))).length;
p(`| *(sans restriction)* | ${nb(null, 'Petit-déj')} | ${nb(null, 'Collation')} | ${nb(null, 'Repas')} |`);
for (const d of Object.keys(DIET_FR) as DietaryRestriction[]) {
  p(`| ${DIET_FR[d]} | ${nb(d, 'Petit-déj')} | ${nb(d, 'Collation')} | ${nb(d, 'Repas')} |`);
}
p();

// ── Synthèse ────────────────────────────────────────────────────────────────
p('## Tableau de synthèse');
p();
p('| ID | Recette | Type | Prép. | kcal | P (g) | G (g) | L (g) | Objectif | OK ? | Remarques |');
p('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of RECIPES) {
  const m = r.macros_per_portion;
  const obj = (r.objectives ?? []).map((o) => OBJ_FR[o]).join(', ');
  p(`| ${r.id} | ${r.name_fr} | ${CAT(r)} | ${r.prep_time_min}’ | ${m.kcal} | ${m.protein_g} | ${m.carbs_g} | ${m.fat_g} | ${obj} | ☐ | |`);
}
p();

// ── Détail ──────────────────────────────────────────────────────────────────
p('## Détail des recettes');
p();
for (const r of RECIPES) {
  const m = r.macros_per_portion;
  p(`### ${r.id} — ${r.name_fr}`);
  p();
  p(`- **Type** : ${CAT(r)} · **Préparation** : ${r.prep_time_min} min`);
  p(`- **Objectif** : ${(r.objectives ?? []).map((o) => OBJ_FR[o]).join(', ') || '—'} · **Sport** : ${(r.sports ?? []).join(', ') || '—'}${r.rest_day_ok ? ' · adaptée jour de repos' : ''}`);
  p(`- **Régimes compatibles** : ${(r.restrictions_ok ?? []).map((d) => DIET_FR[d]).join(', ') || 'aucun (omnivore)'}`);
  p(`- **Macros / portion (base)** : ${m.kcal} kcal · ${m.protein_g} g protéines · ${m.carbs_g} g glucides · ${m.fat_g} g lipides`);
  p('- **Ingrédients** :');
  for (const i of r.ingredients) {
    const ref = i.ref ? RECIPE_INGREDIENTS[i.ref] : undefined;
    const basis = ref?.basis === 'dry' ? ' *(pesé sec)*' : ref?.basis === 'raw' ? ' *(pesé cru)*' : '';
    const fixe = i.scalable === false ? ' — quantité fixe' : '';
    p(`  - ${i.name} — ${i.quantity_g} ${ref?.unit ?? 'g'}${basis}${fixe}`);
  }
  p('- **Préparation** :');
  r.steps.forEach((s, k) => p(`  ${k + 1}. ${s}`));
  if (r.why_fr) p(`- **Pourquoi** : ${r.why_fr}`);
  p('- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________');
  p();
}

const out = path.join(__dirname, '..', 'VALIDATION-RECETTES.md');
fs.writeFileSync(out, L.join('\n') + '\n');
console.log(`✓ VALIDATION-RECETTES.md régénéré — ${RECIPES.length} recettes, ${ecarts.length} écart(s) énergétique(s) > 10 %`);
