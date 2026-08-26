// Quelles permissions l'app demande-t-elle VRAIMENT ?
//
// Pourquoi ce script existe : `app.json` déclare `"permissions": []`, et ça ne veut
// PAS dire zéro. Les plugins en injectent, et le tableau vide n'en retire aucune —
// seul `blockedPermissions` retire. L'audit V1 (constat 03-01) a trouvé TROIS
// permissions dans la config résolue là où le fichier en annonçait zéro.
//
//   npm run check:permissions
//
// Lecture seule : `expo config --type introspect` résout les plugins, n'écrit rien.
// Même famille que `check:migrations` et `check:ota` — le dépôt ne sait pas ce qu'il
// demande tant qu'il ne le mesure pas.

import { execFileSync } from 'node:child_process';

// Ce qui est ATTENDU, et pourquoi chacune est là. Toute permission résolue absente
// de cette liste est un ajout non arbitré — c'est ça qu'on veut voir rougir.
const ATTENDUES = {
  'android.permission.INTERNET': 'synchronisation Supabase, achats RevenueCat',
  'android.permission.READ_EXTERNAL_STORAGE': 'photothèque (expo-image-picker) — lecture des photos de progression',
};

// Ce qu'on retire EXPRÈS, avec la raison. Une disparition de cette liste veut dire
// que quelqu'un a retiré un blocage, ce qui rouvre une permission.
const BLOQUEES = {
  'android.permission.RECORD_AUDIO': 'jamais utilisée — injectée par expo-image-picker',
  'android.permission.SYSTEM_ALERT_WINDOW': 'jamais utilisée',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'AUCUN usage : lib/photos.ts n’écrit rien hors du bac à sable (audit V1, 03-02)',
};

const brut = execFileSync('npx', ['expo', 'config', '--type', 'introspect', '--json'], {
  cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
});
const c = JSON.parse(brut);
const resolues = c.android?.permissions ?? [];
const bloquees = c.android?.blockedPermissions ?? [];

let ko = 0;
const ligne = (ok, quoi, note) => { if (!ok) ko++; console.log(`  ${ok ? '✓' : '✖'} ${quoi.padEnd(46)} ${note}`); };

console.log('\nPermissions Android RÉSOLUES (pas celles d’app.json)');
for (const p of resolues) ligne(p in ATTENDUES, p.replace('android.permission.', ''), ATTENDUES[p] ?? '🔴 NON ARBITRÉE — d’où vient-elle ?');
for (const p of Object.keys(ATTENDUES)) if (!resolues.includes(p)) ligne(false, p.replace('android.permission.', ''), '🔴 ATTENDUE mais ABSENTE — un plugin a-t-il changé ?');

console.log('\nRetirées volontairement');
for (const p of Object.keys(BLOQUEES)) ligne(bloquees.includes(p), p.replace('android.permission.', ''), BLOQUEES[p]);

console.log('\nSauvegardes du système');
ligne(c.android?.allowBackup === false, 'android.allowBackup', 'false — les données locales ne partent pas chez Google (09-02)');

if (ko) {
  console.error(`\n✖ ${ko} écart(s). Le formulaire Data Safety décrit le manifeste FUSIONNÉ, pas app.json :\n  toute ligne ci-dessus qui bouge change une case à remplir.\n`);
  process.exit(1);
}
console.log('\n✅ Les permissions résolues sont celles qui ont été arbitrées.');
console.log('   ⚠️ Ce relevé n’est pas le manifeste FINAL : seul un prebuild Android le rend.\n');
