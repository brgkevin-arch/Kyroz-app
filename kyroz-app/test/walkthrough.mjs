// Vidéo de parcours : onboarding invité puis tour des onglets.
// Usage : node test/walkthrough.mjs        (KYROZ_HEADLESS=1 pour une passe muette)

import { chromium } from 'playwright';
import { VIDEO, PHONE, TABS, HEADLESS, sleep, ensureDirs, open, tap, bootToPlan, neutralizeFirstRun } from './_harness.mjs';

ensureDirs();

const browser = await chromium.launch({ headless: HEADLESS, slowMo: 250 });
const context = await browser.newContext({
  viewport: PHONE,
  recordVideo: { dir: VIDEO, size: PHONE },
});
await neutralizeFirstRun(context);
const page = await context.newPage();

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await open(page);

// Avant, ce script partait de l'écran de login et cliquait dans le vide : sans
// session, aucun onglet n'existe. Il filme désormais un vrai parcours.
const onPlan = await bootToPlan(page);
console.log(onPlan ? 'PLAN_REACHED' : 'PLAN_NOT_REACHED');

for (const label of TABS) {
  if (await tap(page, label, { which: 'last', timeout: 1200 })) {
    await sleep(1800);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 400); await sleep(700); }
    await page.mouse.wheel(0, -1200);
    await sleep(700);
  }
}

await sleep(1500);
await context.close(); // vide le tampon vidéo
await browser.close();

console.log('LOGS:\n' + logs.slice(0, 40).join('\n'));
console.log('video -> ' + VIDEO);
console.log('DONE');
