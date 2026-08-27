// Combien pèse le bundle JS, et par rapport à quoi ?
//
// Pourquoi ce script existe (constat 04-04) : l'audit a mesuré 5,95 Mo (iOS) et 6,92 Mo
// (Android) sur le `.hbc` de la 24ᵉ OTA. Ces chiffres sont justes le jour où ils ont été
// pris et **périment en silence** — personne ne les re-mesure, et une dépendance ajoutée
// ne se voit dans aucun diff.
//
// 🔴 CE SCRIPT NE TRANCHE PAS LE CONSTAT, ET IL FAUT LE DIRE. La reco de l'audit est
// « ne rien couper à l'aveugle : mesurer d'abord le DÉMARRAGE À FROID ; si le budget est
// tenu, le poids seul n'est pas un défaut ». Ce contrôle-là est en checklist HUMAINE
// (étape 5 : « Android bas de gamme, démarrage à froid chronométré, > 3 s = P1 ») et ne
// se fait pas depuis le dépôt. Un poids qui monte est un signal, pas un verdict.
//
// ⚠️ **ET SON CHIFFRE N'EST PAS COMPARABLE À CELUI DE L'AUDIT — C'EST MESURÉ, PAS SUPPOSÉ.**
// L'audit a mesuré l'artefact PUBLIÉ (`eas update`) ; ce script fait un `expo export`
// LOCAL. Le 2026-08-27, les deux ont été pris le même jour, sur le même commit :
//
//   export local (ce script)      7,03 Mo iOS
//   export d'`eas update` (25ᵉ)   6,00 Mo iOS · 7,00 Mo Android
//
// **1 Mo d'écart sur iOS, à code identique.** L'écart vient donc de la CHAÎNE, pas du
// produit — et lire le chiffre local comme une régression contre les 5,95 Mo de la 24ᵉ
// aurait fait chercher une cause dans du code sain.
// ➡️ La comparaison qui VAUT est publié↔publié : **5,95 → 6,00 Mo** entre la 24ᵉ et la
// 25ᵉ, soit +0,05 Mo pour six commits dont tout l'audit V1. Le poids ne dérive pas.
// ➡️ Ce qui vaut, c'est la comparaison de ce script AVEC LUI-MÊME dans le temps. Pour
// comparer au publié, il faut re-mesurer le publié (cf. CLAUDE.md §2, `strings -a` sur le
// `.hbc` d'un export EAS).
//
//   npm run mesure:bundle
//
// Lecture seule côté projet : l'export part dans un dossier temporaire.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Le relevé de l'audit V1, sur l'artefact PUBLIÉ. Repère historique, pas une cible. */
const AUDIT_V1 = { ios: 6.00, android: 7.00, date: '2026-08-27 (25ᵉ OTA)' };

/** Au-delà, on REGARDE — ce n'est pas un échec, c'est une invitation à mesurer le démarrage. */
const SEUIL_MO = 8;

const mo = (o) => o / 1024 / 1024;

function plusGrosFichier(dir, ext) {
  let max = { chemin: null, octets: 0 };
  const parcourir = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) parcourir(p);
      else if (p.endsWith(ext)) {
        const o = statSync(p).size;
        if (o > max.octets) max = { chemin: p, octets: o };
      }
    }
  };
  try { parcourir(dir); } catch {}
  return max;
}

function tailleDossier(dir) {
  let total = 0;
  const parcourir = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) parcourir(p); else total += statSync(p).size;
    }
  };
  try { parcourir(dir); } catch {}
  return total;
}

const plateformes = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const cibles = plateformes.length ? plateformes : ['ios'];

console.log('\nPoids du bundle JS — export LOCAL (pas l’artefact publié)\n');
let alerte = false;

for (const plat of cibles) {
  const out = mkdtempSync(join(tmpdir(), `kyroz-bundle-${plat}-`));
  try {
    execFileSync('npx', ['expo', 'export', '--platform', plat, '--output-dir', out], {
      cwd: ROOT,
      stdio: 'pipe',
      // Des valeurs FACTICES suffisent : on mesure un POIDS, pas un comportement. Sans
      // elles, `lib/supabase.ts` jette au chargement du module (il construit son client
      // à l'import) et l'export échoue — la panne accuserait le bundle au lieu de l'env.
      env: {
        ...process.env,
        EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://mesure.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'mesure',
      },
    });
    const b = plusGrosFichier(join(out, '_expo'), '.hbc');
    const assets = tailleDossier(join(out, 'assets'));
    const taille = mo(b.octets);
    const marque = taille > SEUIL_MO ? '⚠️' : '✓';
    if (taille > SEUIL_MO) alerte = true;
    console.log(`  ${marque} ${plat.padEnd(8)} bundle ${taille.toFixed(2)} Mo`
      + `   assets ${mo(assets).toFixed(2)} Mo`
      + `   (audit V1 publié : ${AUDIT_V1[plat] ?? '—'} Mo)`);
  } catch (e) {
    console.error(`  ✖ ${plat} : export impossible — ${String(e).split('\n')[0]}`);
    process.exitCode = 2;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

console.log(
  `\n  ℹ️  Repère : ${AUDIT_V1.ios} / ${AUDIT_V1.android} Mo au ${AUDIT_V1.date}, sur l’artefact PUBLIÉ.`
  + '\n      Un export local pèse ~1 Mo de PLUS à code identique (7,03 contre 6,00 le'
  + '\n      2026-08-27) : les deux méthodes ne se comparent PAS entre elles. Comparer ce'
  + '\n      script avec lui-même ; pour le publié, comparer publié à publié.'
  + `\n  ⚠️  ${alerte ? 'Au-delà du seuil de regard' : 'Sous le seuil de regard'} (${SEUIL_MO} Mo) —`
  + ' et ce n’est pas un verdict : le'
  + '\n      constat 04-04 se tranche au DÉMARRAGE À FROID sur Android bas de gamme,'
  + '\n      pas au poids (checklist humaine, étape 5).\n',
);
