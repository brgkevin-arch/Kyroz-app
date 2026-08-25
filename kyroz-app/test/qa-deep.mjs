// QA approfondie : Réserve + tous les sous-écrans du Profil, captures + erreurs.
//
// Ce script attendait un login MANUEL de 3 minutes quand il n'avait pas de session
// sauvegardée. Il amorce désormais lui-même une session invité, puis la range dans
// test/qa/session.json pour que les passes suivantes démarrent directement dedans.
//
// Usage : node test/qa-deep.mjs        (supprimer test/qa/session.json = repartir à zéro)

import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'node:fs';
import { SHOT, STATE, PHONE, HEADLESS, sleep, ensureDirs, open, tap, bootToPlan, closeSheet, goToProfil, neutralizeFirstRun, bilanPannes } from './_harness.mjs';

ensureDirs();

const report = { screens: [], console: [], pageErrors: [], failedRequests: [] };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: HEADLESS, slowMo: 150 });
const haveState = existsSync(STATE);
const context = await browser.newContext({
  viewport: PHONE,
  storageState: haveState ? STATE : undefined,
});
await neutralizeFirstRun(context);
const page = await context.newPage();
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) report.console.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
page.on('pageerror', (e) => report.pageErrors.push(e.message.slice(0, 300)));
page.on('requestfailed', (r) => report.failedRequests.push(`FAIL ${r.method()} ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) report.failedRequests.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*/, '')}`); });

const snap = async (name) => {
  await page.screenshot({ path: `${SHOT}/${name}.png` }).catch(() => {});
  log('shot: ' + name);
  report.screens.push(name);
};
await open(page);

const onPlan = await bootToPlan(page);
log(onPlan ? 'session prête' : 'ATTENTION : écran Plan jamais atteint');
if (!onPlan) {
  // Sans session, la Réserve et les sous-écrans du Profil n'existent pas : la suite
  // ne produirait qu'une liste de « introuvable » qui accuse les écrans alors que
  // c'est le PARCOURS qui est cassé. On s'arrête sur le vrai diagnostic.
  await context.close();
  await browser.close();
  bilanPannes();
  process.exit(3);
}
if (!haveState) {
  await context.storageState({ path: STATE });
  log('session sauvegardée -> ' + STATE);
}
await sleep(1200);

// ---- FRIGO ----
if (await tap(page, 'Réserve', { which: 'last' })) {
  await sleep(1800); await snap('D-reserve-top');
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await sleep(600); }
  await snap('D-reserve-scrolled');
  await page.mouse.wheel(0, -1600); await sleep(500);
} else log('onglet Réserve introuvable');

// ---- PROFIL + sous-écrans ----
await goToProfil(page); await snap('D-profil');

// Suivi du poids : le seul sous-écran qui ÉCRIT côté cloud (weight_logs).
// On va jusqu'à l'enregistrement — c'est tout l'intérêt : les écouteurs plus haut
// attrapent un 4xx/5xx sur ce POST, qu'une simple capture ne verrait jamais.
if (await tap(page, 'Suivi du poids', { timeout: 3000 })) {
  await sleep(1500); await snap('D-poids');
  // Placeholder dynamique (dernier poids connu, sinon « 80 ») → repéré par sa forme.
  const kg = page.getByPlaceholder(/^\d+([.,]\d+)?$/).first();
  if (await kg.isVisible({ timeout: 2000 }).catch(() => false)) {
    await kg.fill('81.4').catch(() => {});
    await sleep(400);
    await tap(page, 'Enregistrer', { exact: true, which: 'last', timeout: 2000 });
    await sleep(2000);
    await snap('D-poids-after-add');
  } else log('champ de poids introuvable');
  await closeSheet(page);
} else log('« Suivi du poids » introuvable');

// Libellés réels des lignes de app/(tabs)/profil.tsx.
const subs = ['Informations', 'Sport & activité', 'Objectif', 'Objectif daté', 'Calories & macros', 'Préférences alimentaires', 'Paramètres des repas'];
for (const sub of subs) {
  await goToProfil(page);
  const key = sub.toLowerCase().replace(/[^a-zà-ÿ]+/g, '-');
  if (await tap(page, sub, { exact: true, timeout: 3000 })) {
    await sleep(1500);
    await snap('D-set-' + key);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 500); await sleep(500); }
    await snap('D-set-' + key + '-scrolled');
    await closeSheet(page);
  } else log('sous-écran introuvable : ' + sub);
}

await sleep(800);
writeFileSync(`${SHOT}/report-deep.json`, JSON.stringify(report, null, 2));
await context.close();
await browser.close();

log('\n########## DEEP SUMMARY ##########');
log('Captures : ' + report.screens.length);
log('Erreurs page : ' + report.pageErrors.length);
log('-- requêtes en échec / 4xx-5xx (dédup) --\n' + ([...new Set(report.failedRequests)].slice(0, 25).join('\n') || 'aucune'));
log('-- console (dédup) --\n' + ([...new Set(report.console)].slice(0, 20).join('\n') || 'aucune'));
log('DONE');
