// QA ciblée : les sous-écrans de réglages du Profil, en captures avant/après scroll.
//
// Ce script exigeait un test/qa/session.json déjà présent (créé à la main par
// qa-deep) et plantait sec sinon. Il amorce désormais sa propre session invité.
//
// Usage : node test/qa-settings.mjs

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { SHOT, STATE, PHONE, HEADLESS, sleep, ensureDirs, open, tap, bootToPlan, closeSheet, goToProfil, neutralizeFirstRun, bilanPannes } from './_harness.mjs';

ensureDirs();

const browser = await chromium.launch({ headless: HEADLESS, slowMo: 150 });
const haveState = existsSync(STATE);
const context = await browser.newContext({ viewport: PHONE, storageState: haveState ? STATE : undefined });
await neutralizeFirstRun(context);
const page = await context.newPage();

const fails = [];
page.on('response', (r) => { if (r.status() >= 400) fails.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*/, '')}`); });

const snap = async (n) => { await page.screenshot({ path: `${SHOT}/${n}.png` }).catch(() => {}); console.log('shot: ' + n); };

await open(page);

const onPlan = await bootToPlan(page);
console.log(onPlan ? 'session prête' : 'ATTENTION : écran Plan jamais atteint');
if (!onPlan) {
  // Les sous-écrans visés vivent dans le Profil, qui n'existe pas sans session :
  // continuer ne rendrait que des « INTROUVABLE » qui accusent les mauvais écrans.
  await context.close();
  await browser.close();
  bilanPannes();
  process.exit(3);
}
if (!haveState) await context.storageState({ path: STATE });
await sleep(1200);

const subs = [
  ['Objectif', 'objectif'],
  ['Sport & activité', 'sport'],
  ['Calories & macros', 'macros'],
  ['Préférences alimentaires', 'preferences'],
  ['Paramètres des repas', 'repas'],
];
for (const [label, key] of subs) {
  await goToProfil(page);
  if (await tap(page, label, { exact: true, timeout: 3000 })) {
    await sleep(1600);
    await snap('E-' + key);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 500); await sleep(500); }
    await snap('E-' + key + '-scrolled');
    await closeSheet(page); // ce sont des Sheet, pas des routes : goBack() ne ferme rien
  } else {
    console.log('INTROUVABLE : ' + label);
  }
}

await context.close();
await browser.close();
console.log('échecs : ' + ([...new Set(fails)].join(' | ') || 'aucun'));
console.log('DONE');
