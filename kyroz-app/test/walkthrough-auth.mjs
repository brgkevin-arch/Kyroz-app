// Vidéo de parcours APRÈS connexion, en fouillant chaque onglet.
//
// Ce script attendait un login MANUEL pendant 3 minutes (« WAITING_FOR_LOGIN »),
// donc il ne tournait jamais sans un humain devant l'écran. Il passe désormais par
// la connexion invité, comme les autres.
//
// Usage : node test/walkthrough-auth.mjs

import { chromium } from 'playwright';
import { VIDEO, PHONE, TABS, HEADLESS, sleep, ensureDirs, open, tap, bootToPlan, neutralizeFirstRun, bilanPannes } from './_harness.mjs';

ensureDirs();

const browser = await chromium.launch({ headless: HEADLESS, slowMo: 200 });
const context = await browser.newContext({
  viewport: PHONE,
  recordVideo: { dir: VIDEO, size: PHONE },
});
await neutralizeFirstRun(context);
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await open(page);

const onPlan = await bootToPlan(page);
console.log(onPlan ? 'LOGIN_OK' : 'LOGIN_FAILED');
if (!onPlan) {
  // Filmer les onglets sans session revient à filmer l'écran de login : la vidéo
  // serait propre et mensongère. `bilanPannes` dit à quelle marche ça a cassé.
  await context.close();
  await browser.close();
  bilanPannes();
  process.exit(3);
}
await sleep(1500);

for (const label of TABS) {
  if (await tap(page, label, { which: 'last', timeout: 1200 })) {
    await sleep(1800);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 450); await sleep(900); }
    await page.mouse.wheel(0, -900);
    await sleep(700);
  } else {
    console.log('onglet introuvable : ' + label);
  }
}

await sleep(1500);
await context.close(); // vide le tampon vidéo
await browser.close();

console.log('pageErrors: ' + (errors.join(' | ') || 'none'));
console.log('video -> ' + VIDEO);
console.log('DONE');
