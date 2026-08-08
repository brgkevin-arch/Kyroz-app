// L'état RÉEL de l'authentification en prod — mesuré, pas supposé.
//
// Pourquoi ce script existe : les réglages d'auth vivent dans le dashboard, hors
// du dépôt, et **ils bougent sans laisser de trace**. Trois mesures contradictoires
// sur le provider anonyme en deux jours (AGENTS.md E3), et la confirmation e-mail
// coupée sans que rien ne le dise — le seul indice était une ligne d'AGENTS.md
// écrite un autre jour. Toute note du dépôt sur ces réglages est PÉRIMABLE : la
// mesure prend deux secondes.
//
//   npm run check:auth
//
// Lecture seule, clé anonyme, aucun compte créé, aucune écriture.
// Même famille que `check:migrations` : le dépôt ne sait rien de la prod.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

console.log(`\nProd : ${URL_.replace(/https:\/\/([a-z0-9]{4}).*/, 'https://$1…')}\n`);

// ── Témoin NÉGATIF, en premier ───────────────────────────────────────────────
// Sans lui, un 200 obtenu pour une mauvaise raison se lirait comme une preuve.
// On vérifie d'abord que l'endpoint sait dire NON : une clé invalide doit être
// refusée. S'il répondait 200 à tout, la mesure qui suit ne vaudrait rien.
console.log('Témoin — la mesure sait-elle discriminer ?');
const refus = await fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: 'sb_publishable_bidon' } });
console.log(`  ${refus.status === 401 ? '✓' : '✖'} clé invalide → doit être 401       HTTP ${refus.status}`);
if (refus.status !== 401) {
  console.error('\n✖ Le témoin a échoué : la mesure ne prouve RIEN. Arrêt.\n');
  process.exit(2);
}

const r = await fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: KEY } });
if (!r.ok) {
  console.error(`\n✖ /auth/v1/settings → HTTP ${r.status}\n`);
  process.exit(2);
}
const s = await r.json();

// ── Ce qui pilote le parcours d'inscription ──────────────────────────────────
// ⚠️ `mailer_autoconfirm` est l'INVERSE de la case du dashboard : `true` veut dire
// « aucune confirmation demandée » — donc la case « Confirm email » est DÉCOCHÉE.
// C'est le piège de lecture de ce réglage, et il fait conclure l'exact contraire.
const confirmation = s.mailer_autoconfirm === false;

console.log('\nInscription');
console.log(`  ${s.external?.email ? '✓' : '✖'} provider e-mail                    ${s.external?.email ? 'ouvert' : 'FERMÉ'}`);
console.log(`  ${s.disable_signup === false ? '✓' : '✖'} création de compte                 ${s.disable_signup ? 'FERMÉE' : 'ouverte'}`);
console.log(`  ${confirmation ? '✓' : '✖'} confirmation e-mail                ${confirmation ? 'EXIGÉE' : 'désactivée (mailer_autoconfirm: true)'}`);
console.log(`  · connexion invité (anonyme)        ${s.external?.anonymous_users ? 'ouverte' : 'fermée'}`);

if (!confirmation) {
  console.error('\n✖ La confirmation e-mail est DÉSACTIVÉE : aucun e-mail n\'est envoyé,');
  console.error('  et tout compte créé est actif immédiatement.');
  console.error('  → Dashboard → Authentication → Sign In / Providers → Email → cocher');
  console.error('    « Confirm email ». Procédure complète :');
  console.error('    supabase/PROCEDURE-2026-08-07-confirmation-email.md\n');
  process.exit(1);
}

console.log('\n✅ La confirmation e-mail est active.');
console.log('   ⚠️ Ce résultat périme : ces réglages se pilotent hors du dépôt.');
console.log('      Re-mesurer, ne jamais se fier à une note écrite.\n');
