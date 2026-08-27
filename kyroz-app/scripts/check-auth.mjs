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

// 🔴 UN ✖ QUI NE FAIT PAS ÉCHOUER EST UN ✖ DÉCORATIF — corrigé le 2026-08-27
// (contre-audit CA-7-04). Ce bloc imprimait quatre lignes et n'avait qu'UN chemin
// d'échec : la confirmation e-mail. Mesuré contre un endpoint de test rendant
// `external.email: false` et `disable_signup: true` — c'est-à-dire PERSONNE NE PEUT
// CRÉER DE COMPTE, l'état qui bloque net un relecteur Apple — le script imprimait
// deux ✖, puis « ✅ La confirmation e-mail est active. », et sortait en CODE 0.
// Le lecteur pressé lit la dernière ligne.
const echecs = [];
const ligne = (ok, libelle, etat, quoi) => {
  console.log(`  ${ok ? '✓' : '✖'} ${libelle.padEnd(34)} ${etat}`);
  if (!ok) echecs.push(quoi);
};

console.log('\nInscription');
ligne(s.external?.email === true, 'provider e-mail', s.external?.email ? 'ouvert' : 'FERMÉ',
  'le provider e-mail est FERMÉ : plus aucune inscription par e-mail.\n'
  + '     → Dashboard → Authentication → Sign In / Providers → Email → activer.');
ligne(s.disable_signup === false, 'création de compte', s.disable_signup ? 'FERMÉE' : 'ouverte',
  'la création de compte est DÉSACTIVÉE : un relecteur Apple ne peut pas ouvrir de\n'
  + '     compte de test, et la fiche store « sans compte requis » devient fausse.\n'
  + '     → Dashboard → Authentication → Sign In / Providers → « Allow new users to sign up ».');
ligne(confirmation, 'confirmation e-mail', confirmation ? 'EXIGÉE' : 'désactivée (mailer_autoconfirm: true)',
  'la confirmation e-mail est DÉSACTIVÉE : aucun e-mail n\'est envoyé, et tout\n'
  + '     compte créé est actif immédiatement.\n'
  + '     → Dashboard → Authentication → Sign In / Providers → Email → cocher\n'
  + '       « Confirm email ». Procédure : supabase/PROCEDURE-2026-08-07-confirmation-email.md');

// ⚠️ ÉTAT, PAS VERDICT — et c'est délibéré. L'auth anonyme est ACTIVE exprès : c'est
// le chemin du relecteur Apple (`EXPO_PUBLIC_REVIEW_CODE`), et son remplacement est
// daté APRÈS la soumission. La faire échouer dans un sens ou dans l'autre figerait
// une décision qui n'est pas encore prise. On l'imprime pour qu'elle soit VUE.
console.log(`  · connexion invité (anonyme)        ${s.external?.anonymous_users ? 'ouverte' : 'fermée'}  (état, pas verdict)`);

if (echecs.length) {
  console.error(`\n✖ ${echecs.length} réglage(s) d'authentification bloquent l'inscription :`);
  for (const e of echecs) console.error(`   • ${e}`);
  console.error('');
  process.exit(1);
}

console.log('\n✅ L\'inscription est ouverte, et la confirmation e-mail est active.');
console.log('   ⚠️ Ce résultat périme : ces réglages se pilotent hors du dépôt.');
console.log('      Re-mesurer, ne jamais se fier à une note écrite.\n');
