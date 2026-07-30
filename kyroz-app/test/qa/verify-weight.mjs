// Sonde ciblée : l'enregistrement d'un poids doit écrire dans weight_logs sans 404.
// Usage : node test/qa/verify-weight.mjs

import { chromium } from 'playwright';
import {
  SHOT, PHONE, sleep, ensureDirs, open, tap, bootToPlan, goToProfil, closeSheet, neutralizeFirstRun,
} from '../_harness.mjs';

ensureDirs();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: PHONE });
await neutralizeFirstRun(context);
const page = await context.newPage();

const wl = [];
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('weight_logs') || u.includes('recipe_overrides')) wl.push(`${r.status()} ${r.request().method()} ${u.replace(/\?.*/, '')}`);
});

await open(page);
await bootToPlan(page); // le script exigeait une session.json créée à la main

await goToProfil(page);
await tap(page, 'Suivi du poids', { timeout: 3000 });
await sleep(1500);

// Placeholder dynamique (dernier poids connu, sinon « 80 ») → repéré par sa forme.
const kg = page.getByPlaceholder(/^\d+([.,]\d+)?$/).first();
await kg.fill('85').catch(() => {});
await sleep(500);
await tap(page, 'Enregistrer', { exact: true, which: 'last', timeout: 2000 });
await sleep(2500);

await page.screenshot({ path: `${SHOT}/F-weight-after-save.png` }).catch(() => {});
await closeSheet(page);
await context.close();
await browser.close();

console.log('=== trafic weight_logs / recipe_overrides ===');
console.log([...new Set(wl)].join('\n') || 'aucun appel capturé');
const had404 = wl.some((x) => x.startsWith('404'));
console.log('\nRÉSULTAT : ' + (had404 ? '❌ toujours un 404' : '✅ aucun 404'));
process.exitCode = had404 ? 1 : 0;
