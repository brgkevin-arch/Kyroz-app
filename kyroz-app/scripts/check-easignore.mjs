// Le `.easignore` retient-il encore tout ce qu'il doit retenir ?
//
// Pourquoi ce script existe : `.easignore` **REMPLACE** les `.gitignore` au lieu de
// s'y ajouter (eas-cli, `build/vcs/local.js` : « if .easignore exists, .gitignore
// files are not used »). Tout motif qu'on en retire RE-MONTE donc dans l'archive
// envoyée à EAS — **les motifs de secrets compris**. Un fichier qui a l'air correct
// peut donc être en train de publier un `.env.local` sans que rien ne rougisse.
//
// Sans ce script, la phrase « à refaire après toute modification » écrite en tête du
// `.easignore` resterait décorative. Il compte trois choses :
//   1. chaque motif de secret mord, y compris à l'intérieur d'un worktree ;
//   2. l'UNION des .gitignore sources est complète — un chemin témoin dérivé de
//      chaque motif source doit rester exclu ;
//   3. aucun motif de dossier ne porte de barre finale (mesuré : avec `dist/`, la
//      bibliothèque `ignore` répond « non ignoré » pour le dossier `dist` lui-même,
//      elle ne sait pas que c'en est un — même piège que pour `node_modules`).
//
// Et il affiche ce que pèserait l'archive, en exécutant la VRAIE classe `Ignore`
// d'eas-cli plutôt qu'une imitation.
//
//   npm run check:easignore
//
// Lecture seule. Contexte complet : STORE-RELEASE.md, section 8 (l'archive faisait
// 478 Mo pour 18 Mo versionnés, mesuré le 2026-08-27).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const RACINE = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const EASIGNORE = path.join(RACINE, '.easignore');
const GIT_COMMON_DIR = path.resolve(
  RACINE,
  execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: RACINE, encoding: 'utf8' }).trim(),
);

// La classe Ignore vit dans eas-cli, installé globalement. On la charge plutôt que de
// la réécrire : une imitation qui diverge ne prouverait rien.
function chargerIgnore() {
  const candidats = [];
  try {
    candidats.push(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'eas-cli'));
  } catch {}
  candidats.push('/usr/local/lib/node_modules/eas-cli', '/opt/homebrew/lib/node_modules/eas-cli');
  for (const base of candidats) {
    const f = path.join(base, 'build', 'vcs', 'local.js');
    if (existsSync(f)) return require(f).Ignore;
  }
  return null;
}
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const Ignore = chargerIgnore();

if (!existsSync(EASIGNORE)) {
  console.error(`✖ Aucun .easignore à la racine du dépôt (${RACINE}).`);
  console.error('  eas-cli le cherche là, PAS dans kyroz-app/ où vit eas.json.');
  process.exit(1);
}
if (!Ignore) {
  console.error('✖ eas-cli introuvable — installe-le : npm i -g eas-cli');
  process.exit(1);
}

// ── Ce qui doit sortir de l'archive, et pourquoi ────────────────────────────────
const DOIT_ETRE_EXCLU = [
  // Secrets : le motif à côté est la seule chose qui les retient.
  ['secret', '.env'], ['secret', 'kyroz-app/.env'], ['secret', 'kyroz-app/.env.local'],
  ['secret', 'kyroz-app/.env.production'], ['secret', 'kyroz-app/.env.preview'],
  ['secret', '.claude/worktrees/wt/kyroz-app/.env.local'],
  ['secret', 'kyroz-app/asc-api-key.p8'], ['secret', 'certs/dist.p12'],
  ['secret', 'kyroz-app/private.key'], ['secret', 'kyroz-app/cert.pem'],
  ['secret', 'kyroz-app/Kyroz.mobileprovision'], ['secret', 'android/release.jks'],
  // Lourds : la cause mesurée des 478 Mo.
  ['lourd', '.claude/worktrees'], ['lourd', '.claude/worktrees/wt/kyroz-app/ios/Pods/a.h'],
  ['lourd', 'kyroz-app/ios'], ['lourd', 'kyroz-app/ios/Pods/Podfile.lock'],
  ['lourd', 'kyroz-app/android'], ['lourd', 'kyroz-app/node_modules'],
  ['lourd', 'kyroz-app/Data/Ciqual'], ['lourd', 'kyroz-app/Data/Ciqual/alim.csv'],
  ['lourd', 'kyroz-app/data/ciqual/alim.csv'],
  ['lourd', 'kyroz-app/assets/bodyfat/_source/male-models.png'],
  ['lourd', 'kyroz-app/dist/index.html'], ['lourd', 'kyroz-app/.expo/devices.json'],
  ['lourd', 'kyroz-app/design-system/index.html'], ['lourd', 'kyroz-app/test/store/01.png'],
];

// Ce que le build ne peut PAS perdre. Une exclusion trop large se voit ici.
const DOIT_RESTER = [
  'kyroz-app/.env.example', 'kyroz-app/app.json', 'kyroz-app/eas.json',
  'kyroz-app/package.json', 'kyroz-app/package-lock.json', 'kyroz-app/metro.config.js',
  'kyroz-app/tsconfig.json', 'kyroz-app/app/(tabs)/profil.tsx',
  'kyroz-app/lib/foods.generated.ts', 'kyroz-app/components/BodyFatPicker.tsx',
  'kyroz-app/assets/bodyfat/male-1.png', 'kyroz-app/assets/bodyfat/female-6.png',
  'kyroz-app/assets/icon.png', 'kyroz-app/supabase/config.toml',
];

// Les .gitignore que .easignore remplace : chacun de leurs motifs doit être couvert.
const SOURCES = [
  ['.gitignore (racine)', path.join(RACINE, '.gitignore'), ''],
  ['kyroz-app/.gitignore', path.join(RACINE, 'kyroz-app/.gitignore'), 'kyroz-app/'],
  ['kyroz-app/ios/.gitignore', path.join(RACINE, 'kyroz-app/ios/.gitignore'), 'kyroz-app/ios/'],
  // `--git-common-dir` et pas `RACINE/.git` : dans un worktree, `.git` est un FICHIER
  // qui pointe ailleurs, et le vrai `info/exclude` est celui du dépôt principal.
  ['.git/info/exclude', path.join(GIT_COMMON_DIR, 'info', 'exclude'), ''],
];

function temoinDepuisMotif(ligne, prefixe) {
  let m = ligne.trim();
  if (!m || m.startsWith('#') || m.startsWith('!')) return null;
  const ancre = m.startsWith('/') || m.replace(/\/$/, '').includes('/');
  const dossier = m.endsWith('/');
  m = m.replace(/^\//, '').replace(/\/$/, '')
       .replace(/\*\*\//g, '').replace(/\[([A-Za-z])[A-Za-z]\]/g, '$1').replace(/\*/g, 'x');
  return { chemin: (ancre ? prefixe : prefixe + 'sous/dossier/') + m, dossier };
}

const ig = await Ignore.createForCopyingAsync(RACINE);
let echecs = 0;
const rouge = (s) => `\x1b[31m${s}\x1b[0m`;
const vert = (s) => `\x1b[32m${s}\x1b[0m`;

console.log(`\n.easignore : ${EASIGNORE}\n`);

console.log('1. Motifs de secrets et gros dossiers');
for (const [cat, p] of DOIT_ETRE_EXCLU) {
  if (!ig.ignores(p)) { echecs++; console.log(rouge(`   ✖ [${cat}] PARTIRAIT chez EAS : ${p}`)); }
}
console.log(vert(`   ✔ ${DOIT_ETRE_EXCLU.length} chemins témoins, tous exclus`));

console.log('\n2. Fichiers nécessaires au build');
for (const p of DOIT_RESTER) {
  if (ig.ignores(p)) { echecs++; console.log(rouge(`   ✖ exclu à tort : ${p}`)); }
}
console.log(vert(`   ✔ ${DOIT_RESTER.length} chemins témoins, tous conservés`));

console.log('\n3. Union des .gitignore remplacés');
let nMotifs = 0;
for (const [nom, fichier, prefixe] of SOURCES) {
  if (!existsSync(fichier)) continue;
  for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
    const t = temoinDepuisMotif(ligne, prefixe);
    if (!t) continue;
    nMotifs++;
    const aTester = t.dossier ? [t.chemin, `${t.chemin}/fichier.txt`] : [t.chemin];
    const manquants = aTester.filter((c) => !ig.ignores(c));
    if (manquants.length) {
      echecs++;
      console.log(rouge(`   ✖ ${nom} : "${ligne.trim()}" n'est plus couvert (${manquants.join(', ')})`));
    }
  }
}
console.log(vert(`   ✔ ${nMotifs} motifs sources, tous couverts`));

console.log('\n4. Barres finales sur les motifs de dossier');
for (const [i, ligne] of readFileSync(EASIGNORE, 'utf8').split('\n').entries()) {
  const m = ligne.trim();
  if (!m || m.startsWith('#') || m.startsWith('!')) continue;
  if (m.endsWith('/')) {
    echecs++;
    console.log(rouge(`   ✖ ligne ${i + 1} : "${m}" — la barre finale empêche le motif`));
    console.log(rouge('     de mordre sur le dossier lui-même. Écrire "' + m.slice(0, -1) + '".'));
  }
}
if (!echecs) console.log(vert('   ✔ aucune'));

// ── Ce que pèserait l'archive ───────────────────────────────────────────────────
let octets = 0, fichiers = 0;
(function parcourir(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const complet = path.join(dir, e.name);
    if (ig.ignores(path.relative(RACINE, complet))) continue;
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) parcourir(complet);
    else if (e.isFile()) { fichiers++; try { octets += statSync(complet).size; } catch {} }
  }
})(RACINE);
const mo = (octets / 1024 / 1024).toFixed(1);
console.log(`\nArchive : ${fichiers} fichiers, ${mo} Mo avant compression`);
console.log('  (repère du 2026-08-27 : 503 fichiers, 10,2 Mo → 14,1 Mo de .tar.gz,');
console.log('   .git du clone shallow compris. Avant .easignore : 12 184 fichiers, 478 Mo.)');

if (echecs) {
  console.log(rouge(`\n✖ ${echecs} contrôle(s) en échec — ne pas lancer de build en l'état.\n`));
  process.exit(1);
}
console.log(vert('\n✔ Le .easignore retient tout ce qu\'il doit retenir.\n'));
