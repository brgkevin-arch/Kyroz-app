// Les migrations Supabase sont-elles VRAIMENT jouées en prod ?
//
// Pourquoi ce script existe : le dépôt ne sait rien de la prod. Un fichier dans
// `supabase/migrations/` prouve seulement que quelqu'un a écrit du SQL — pas
// qu'il a été exécuté. Deux entrées d'AGENTS.md sont restées à « MIGRATION À
// JOUER » alors que les colonnes étaient en base depuis des jours, et une
// session l'a répété au fondateur comme un blocage. La vérification tenait en
// une requête HTTP : elle tient désormais en une commande.
//
//   npm run check:migrations
//
// Lecture seule, clé anonyme, aucun compte créé, aucune écriture.
// Méthode (cf. supabase/JOURNAL-MIGRATIONS.md) : PostgREST répond 400 pour une
// colonne absente, 200 pour une colonne présente.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLES = ['profiles', 'streaks', 'favorites', 'pantry', 'weight_logs', 'recipe_overrides'];

// ── Environnement ────────────────────────────────────────────────────────────
function env() {
  const out = { ...process.env };
  for (const f of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(join(ROOT, f), 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !out[m[1]]) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
  return out;
}

const E = env();
const URL_ = E.EXPO_PUBLIC_SUPABASE_URL;
const KEY = E.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error('✖ EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY introuvables (.env.local).');
  process.exit(2);
}

// ── PROFILE_COLS, la source unique des colonnes synchronisées ────────────────
// Extrait de lib/sync.ts. `profileCols.test.ts` verrouille déjà cette liste
// contre le SQL ; ici on la confronte à la PROD.
const src = readFileSync(join(ROOT, 'lib', 'sync.ts'), 'utf8');
const block = src.match(/PROFILE_COLS\s*(?::[^=]*)?=\s*\[(.*?)\]/s);
const COLS = block ? [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : [];
if (COLS.length < 20) {
  // Garde-fou : si le format de `PROFILE_COLS` change, on ÉCHOUE bruyamment
  // plutôt que de valider une liste vide et d'annoncer « tout va bien ».
  console.error(`✖ PROFILE_COLS illisible dans lib/sync.ts (${COLS.length} colonnes trouvées).`);
  process.exit(2);
}

const head = async (path) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY } });
  return r.status;
};

let ko = 0;
const line = (label, status, attendu) => {
  const ok = status === attendu;
  if (!ok) ko++;
  console.log(`  ${ok ? '✓' : '✖'} ${label.padEnd(34)} HTTP ${status}${ok ? '' : `  (attendu ${attendu})`}`);
};

console.log(`\nProd : ${URL_.replace(/https:\/\/([a-z0-9]{4}).*/, 'https://$1…')}\n`);

// ── 1. Témoin NÉGATIF, en premier ────────────────────────────────────────────
// Sans lui, un 200 obtenu pour une autre raison (URL mal formée, filtre ignoré)
// se lirait comme une preuve. On vérifie d'abord que la mesure sait dire NON.
console.log('Témoin — la mesure sait-elle discriminer ?');
line('colonne inexistante → doit être 400', await head('profiles?select=zzz_colonne_bidon&limit=1'), 400);
if (ko) {
  console.error('\n✖ Le témoin négatif a échoué : la mesure ne prouve RIEN. Arrêt.\n');
  process.exit(2);
}

// ── 2. Les 6 tables ──────────────────────────────────────────────────────────
console.log('\nTables');
for (const t of TABLES) line(t, await head(`${t}?select=*&limit=1`), 200);

// ── 3. Toutes les colonnes synchronisées, EN UNE REQUÊTE ─────────────────────
// En une seule : c'est exactement ce que fait `pushProfile`. Une seule colonne
// manquante fait échouer le push du profil ENTIER, pas de ce champ.
console.log(`\nColonnes de PROFILE_COLS (${COLS.length}, en une requête — comme pushProfile)`);
const all = await head(`profiles?select=id,${COLS.join(',')}&limit=1`);
line('toutes en une fois', all, 200);

// Si le lot échoue, on isole la ou les fautives pour donner un diagnostic utile
// plutôt qu'un « ça casse ».
if (all !== 200) {
  console.log('\n  Colonnes fautives :');
  for (const c of COLS) {
    const s = await head(`profiles?select=${c}&limit=1`);
    if (s !== 200) console.log(`    ✖ ${c} → HTTP ${s}  — migration non jouée`);
  }
}

if (ko) {
  console.error(`\n✖ ${ko} contrôle(s) en échec → une migration manque en PROD.`);
  console.error('  Jouer le SQL manquant : Supabase → SQL Editor → New query → Run.');
  console.error('  Puis consigner l\'état dans supabase/JOURNAL-MIGRATIONS.md.\n');
  process.exit(1);
}

console.log('\n✅ Toutes les migrations sont reflétées en prod.');
console.log('   ⚠️ Ce résultat périme : le schéma se pilote hors du dépôt. Re-mesurer,');
console.log('      ne jamais se fier à une note écrite.\n');
