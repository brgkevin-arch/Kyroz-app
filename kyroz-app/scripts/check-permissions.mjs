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
// ── LE CÔTÉ APPLE, ouvert le 2026-08-27 (contre-audit CA-7-06) ──────────────
// Ce script ne lisait que `c.android`. Trois demandes iOS jamais arbitrées injectées
// dans app.json ressortaient dans la config RÉSOLUE qu'il charge DÉJÀ — il pouvait
// donc les voir — et il imprimait « ✅ Les permissions résolues sont celles qui ont
// été arbitrées », code 0. Google Data Safety avait son garde-fou, le formulaire
// App Privacy d'Apple — le premier store visé — n'en avait aucun.
//
// ⚠️ Le motif est `UsageDescription`, pas le préfixe `NS` : c'est le suffixe qui
// déclenche une demande d'autorisation à l'écran. `NSAppTransportSecurity` et
// `NSUserActivityTypes` sont des NS qui ne demandent rien.
const ATTENDUES_IOS = {
  NSCameraUsageDescription: 'photos de progression prises à l’appareil (lib/photos.ts)',
  NSPhotoLibraryUsageDescription: 'photos de progression choisies dans la photothèque (lib/photos.ts)',
};

const BLOQUEES = {
  'android.permission.RECORD_AUDIO': 'jamais utilisée — injectée par expo-image-picker',
  'android.permission.SYSTEM_ALERT_WINDOW': 'jamais utilisée',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'AUCUN usage : lib/photos.ts n’écrit rien hors du bac à sable (audit V1, 03-02)',
};

const brut = execFileSync('npx', ['expo', 'config', '--type', 'introspect', '--json'], {
  cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
});
const c = JSON.parse(brut);

// 🔴 GARDE DE PÉRIMÈTRE — même leçon que CA-7-03 sur `check:abonnements`, qui passait
// au vert en ayant comparé ZÉRO identifiant. Un contrôle qui ne trouve rien à vérifier
// ressemble EXACTEMENT à un contrôle que tout satisfait. Si la forme de la config
// change (renommage, plugin qui n'expose plus la clé), on échoue BRUYAMMENT.
if (!c.android || !c.ios) {
  console.error('\n✖ La config résolue n’a pas de section `android` et/ou `ios` : ce relevé ne');
  console.error('  mesure RIEN. Ne pas lire son résultat comme un feu vert.\n');
  process.exit(2);
}
const resolues = c.android.permissions ?? [];
const bloquees = c.android.blockedPermissions ?? [];
const infoPlist = c.ios.infoPlist ?? {};
const demandesIos = Object.keys(infoPlist).filter((k) => k.endsWith('UsageDescription'));

let ko = 0;
const ligne = (ok, quoi, note) => { if (!ok) ko++; console.log(`  ${ok ? '✓' : '✖'} ${quoi.padEnd(46)} ${note}`); };

console.log('\nPermissions Android RÉSOLUES (pas celles d’app.json)');
for (const p of resolues) ligne(p in ATTENDUES, p.replace('android.permission.', ''), ATTENDUES[p] ?? '🔴 NON ARBITRÉE — d’où vient-elle ?');
for (const p of Object.keys(ATTENDUES)) if (!resolues.includes(p)) ligne(false, p.replace('android.permission.', ''), '🔴 ATTENDUE mais ABSENTE — un plugin a-t-il changé ?');

console.log('\nRetirées volontairement');
for (const p of Object.keys(BLOQUEES)) ligne(bloquees.includes(p), p.replace('android.permission.', ''), BLOQUEES[p]);

console.log('\nDemandes d’autorisation iOS RÉSOLUES (infoPlist)');
for (const k of demandesIos) ligne(k in ATTENDUES_IOS, k, ATTENDUES_IOS[k] ?? '🔴 NON ARBITRÉE — d’où vient-elle ?');
for (const k of Object.keys(ATTENDUES_IOS)) if (!demandesIos.includes(k)) ligne(false, k, '🔴 ATTENDUE mais ABSENTE — un plugin a-t-il changé ?');
// Un texte vide passe la revue Apple en 2.1 « Performance » puis se fait rejeter :
// la clé existe, donc le système affiche une alerte SANS explication.
// ⚠️ CETTE LIGNE NE PEUT PAS ROUGIR SUR LES DEUX CLÉS ACTUELLES, et il faut le dire :
// le plugin d'`expo-image-picker` RÉINJECTE son texte par défaut quand app.json le
// laisse vide — mesuré. Elle garde donc les clés ajoutées À LA MAIN, qu'aucun plugin
// ne répare : vérifié par mutation sur un `NSFaceIDUsageDescription` vide, qui rougit.
for (const k of demandesIos) ligne(typeof infoPlist[k] === 'string' && infoPlist[k].trim().length > 10, `${k} → texte`, 'la raison affichée à l’utilisateur doit être écrite');

console.log('\nSauvegardes du système');
ligne(c.android?.allowBackup === false, 'android.allowBackup', 'false — les données locales ne partent pas chez Google (09-02)');

if (ko) {
  console.error(`\n✖ ${ko} écart(s). Les DEUX formulaires en dépendent : Data Safety décrit le manifeste\n  FUSIONNÉ (pas app.json), et App Privacy décrit les demandes iOS résolues ci-dessus.\n  Toute ligne qui bouge change une case à remplir.\n`);
  process.exit(1);
}
console.log(`\n✅ Les permissions résolues sont celles qui ont été arbitrées — ${resolues.length} Android, ${demandesIos.length} iOS.`);
console.log('   ⚠️ Ce relevé n’est pas le manifeste FINAL : seul un prebuild Android le rend.\n');
