/**
 * Contrôle anti-doublons du catalogue de recettes.
 *
 *   npx tsx scripts/check-doublons.ts                    → audite le catalogue live
 *   npx tsx scripts/check-doublons.ts <drop.json> [...]  → audite un lot AVANT merge
 *
 * En mode « drop », le script vérifie le lot contre le catalogue live ET les recettes
 * du lot entre elles (c'est l'absence de ce second contrôle qui a produit les 8 groupes
 * de doublons stricts actuels : des vagues successives qui ne se voyaient pas). Il sort
 * en code 1 dès qu'une règle est violée par une nouvelle recette.
 *
 * Sur le catalogue live seul, le script REPORTE sans échouer : les violations existantes
 * sont connues et figées par lib/__tests__/doublons.test.ts, qui interdit d'en ajouter.
 *
 * Règles (cf. Recette/BRIEF-GENERATION-RECETTES.md §6) :
 *   R1 Jaccard sur le set de `ref` ≥ 0,60 entre deux recettes de même catégorie
 *   R2 ≥ 4 `ref` en commun entre deux recettes de même catégorie
 *   R4 plus de 2 recettes pour un même triplet (catégorie, refs protéine, refs glucide)
 *   R5 nom exact dupliqué, ou 3 premiers mots significatifs partagés dans une catégorie
 *   R7 même set de refs dans une catégorie mais `tags.objectif` divergents
 */
import { readFileSync } from 'node:fs';
import live from '../Recette/recettes-kyroz.json';

export interface CheckRecipe {
  id: string;
  name: string;
  category: string;
  tags: { objectif: string[] };
  ingredients: { ref: string; macro_role: string }[];
}

export interface Violation {
  rule: 'R1' | 'R2' | 'R4' | 'R5' | 'R7';
  ids: string[];
  detail: string;
}

export const JACCARD_MAX = 0.6;
export const COMMON_REFS_MAX = 3;
export const TRIPLET_MAX = 2;

const refsOf = (r: CheckRecipe) => new Set(r.ingredients.map((i) => i.ref));
const rolesOf = (r: CheckRecipe, role: string) =>
  r.ingredients.filter((i) => i.macro_role === role).map((i) => i.ref).sort().join('+') || '∅';

/** Normalisation FR : minuscules, accents et ligatures aplatis (œ→oe), ponctuation → espace. */
export const norm = (s: string) =>
  s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

const STOPWORDS = new Set(['a', 'au', 'aux', 'de', 'des', 'du', 'et', 'en', 'la', 'le', 'les', 'sans', 'un', 'une']);
/** Les 3 premiers mots porteurs de sens du nom (articles et liaisons retirés). */
export const nameKey = (name: string) =>
  norm(name).split(' ').filter((w) => w && !STOPWORDS.has(w)).slice(0, 3).join(' ');

const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};
const commonRefs = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x));

/**
 * Confronte `incoming` à `existing` (paires croisées) puis `incoming` à lui-même.
 * Passer `existing = []` et `incoming = catalogue` audite un catalogue entier.
 */
export function findViolations(incoming: CheckRecipe[], existing: CheckRecipe[] = []): Violation[] {
  const out: Violation[] = [];
  const all = [...existing, ...incoming];
  const isNew = new Set(incoming.map((r) => r.id));

  // R1 / R2 / R7 — paires impliquant au moins une nouvelle recette, même catégorie.
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.category !== b.category) continue;
      if (!isNew.has(a.id) && !isNew.has(b.id)) continue;
      const ra = refsOf(a), rb = refsOf(b);
      const j2 = jaccard(ra, rb);
      const common = commonRefs(ra, rb);
      if (j2 >= JACCARD_MAX) {
        out.push({ rule: 'R1', ids: [a.id, b.id], detail: `Jaccard ${j2.toFixed(2)} ≥ ${JACCARD_MAX} — communs : ${common.join(', ')}` });
      }
      if (common.length > COMMON_REFS_MAX) {
        out.push({ rule: 'R2', ids: [a.id, b.id], detail: `${common.length} refs communs > ${COMMON_REFS_MAX} — ${common.join(', ')}` });
      }
      if (j2 === 1 && [...a.tags.objectif].sort().join(',') !== [...b.tags.objectif].sort().join(',')) {
        out.push({ rule: 'R7', ids: [a.id, b.id], detail: `même set de refs mais objectif [${a.tags.objectif}] vs [${b.tags.objectif}]` });
      }
    }
  }

  // R4 — au plus 2 recettes par triplet (catégorie, refs protéine, refs glucide).
  const triplets = new Map<string, string[]>();
  for (const r of all) {
    const k = `${r.category} | prot=${rolesOf(r, 'protein')} | carb=${rolesOf(r, 'carb')}`;
    triplets.set(k, [...(triplets.get(k) ?? []), r.id]);
  }
  for (const [k, ids] of triplets) {
    if (ids.length > TRIPLET_MAX && ids.some((id) => isNew.has(id))) {
      out.push({ rule: 'R4', ids, detail: `${ids.length} recettes > ${TRIPLET_MAX} pour le triplet ${k}` });
    }
  }

  // R5 — noms exacts dupliqués (toutes catégories) et amorces de 3 mots (même catégorie).
  const exact = new Map<string, string[]>();
  const starts = new Map<string, string[]>();
  for (const r of all) {
    exact.set(norm(r.name), [...(exact.get(norm(r.name)) ?? []), r.id]);
    const k = `${r.category}|${nameKey(r.name)}`;
    starts.set(k, [...(starts.get(k) ?? []), r.id]);
  }
  for (const [n, ids] of exact) {
    if (ids.length > 1 && ids.some((id) => isNew.has(id))) out.push({ rule: 'R5', ids, detail: `nom identique : « ${n} »` });
  }
  for (const [k, ids] of starts) {
    if (ids.length > 1 && ids.some((id) => isNew.has(id))) {
      const [cat, key] = k.split('|');
      if (!exact.has(key) || (exact.get(key) ?? []).length <= 1) {
        out.push({ rule: 'R5', ids, detail: `3 premiers mots partagés en ${cat} : « ${key} »` });
      }
    }
  }
  return out;
}

const readDrop = (path: string): CheckRecipe[] => {
  const parsed = JSON.parse(readFileSync(path, 'utf-8'));
  const recipes = Array.isArray(parsed) ? parsed : parsed.recipes;
  if (!Array.isArray(recipes)) throw new Error(`${path} : ni un tableau de recettes, ni un objet { recipes: [...] }`);
  return recipes as CheckRecipe[];
};

const report = (violations: Violation[]) => {
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) byRule.set(v.rule, [...(byRule.get(v.rule) ?? []), v]);
  for (const rule of ['R1', 'R2', 'R4', 'R5', 'R7'] as const) {
    const list = byRule.get(rule) ?? [];
    console.log(`\n${rule} — ${list.length} violation(s)`);
    for (const v of list.slice(0, 40)) console.log(`   ${v.ids.join(' / ')} : ${v.detail}`);
    if (list.length > 40) console.log(`   … et ${list.length - 40} autres`);
  }
};

// ── CLI ──────────────────────────────────────────────────────────────────────
// Gardé derrière un test d'exécution DIRECTE : le fichier est aussi importé par
// lib/__tests__/doublons.test.ts, où `process.argv` porte les arguments de vitest
// (« run », un chemin de test…) — sans ce garde, l'import tenterait de lire ces
// arguments comme des fichiers de lot et ferait échouer la suite.
function main(argv: string[]) {
  const LIVE = (live as { recipes: unknown[] }).recipes as CheckRecipe[];
  if (argv.length === 0) {
    console.log(`Audit du catalogue live — ${LIVE.length} recettes (report seul, sans échec).`);
    report(findViolations(LIVE));
    console.log('\nCes violations sont l’état ACTUEL du catalogue. Elles sont figées par');
    console.log('lib/__tests__/doublons.test.ts : le test échoue si le total augmente.');
    return;
  }
  const incoming = argv.flatMap(readDrop);
  console.log(`Audit de ${incoming.length} nouvelle(s) recette(s) contre ${LIVE.length} existantes + entre elles.`);
  const violations = findViolations(incoming, LIVE);
  report(violations);
  if (violations.length > 0) {
    console.log(`\n✗ ${violations.length} violation(s). Les recettes concernées sont à RÉÉCRIRE, pas à retoucher :`);
    console.log('  une correction locale déplace le clone au lieu de le supprimer (cf. brief §6).');
    process.exit(1);
  }
  console.log('\n✓ Aucune violation. Le lot peut être mergé (suite de la checklist : Recette/README.md).');
}

const lance = process.argv[1] ?? '';
if (lance.endsWith('check-doublons.ts') || lance.endsWith('check-doublons.js')) main(process.argv.slice(2));
