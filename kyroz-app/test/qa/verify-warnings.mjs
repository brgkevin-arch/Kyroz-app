// Sonde ciblée : les avertissements de dépréciation React Native Web ont-ils disparu ?
// Usage : node test/qa/verify-warnings.mjs

import { chromium } from 'playwright';
import { PHONE, sleep, ensureDirs, open, tap, bootToPlan, closeSheet, neutralizeFirstRun } from '../_harness.mjs';

ensureDirs();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: PHONE });
await neutralizeFirstRun(context);
const page = await context.newPage();

const warns = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) warns.push(m.text()); });

await open(page);
await bootToPlan(page); // le script exigeait une session.json créée à la main

// On promène l'app sur plusieurs écrans + une feuille modale, pour faire monter
// un maximum de composants (Sheet / ActionSheet inclus).
for (const t of ['Frigo', 'Profil', 'Recettes']) {
  await tap(page, t, { which: 'last', timeout: 1500 });
  await sleep(1400);
}
// Ouvre la première carte de recette → Sheet. Ne dépend plus d'un nom de recette
// précis (« Omelette » avait disparu du catalogue).
const card = page.locator('[role="button"], [tabindex="0"]').nth(3);
if (await card.isVisible({ timeout: 1500 }).catch(() => false)) {
  await card.click().catch(() => {});
  await sleep(1500);
  await closeSheet(page);
}
await sleep(1000);

await context.close();
await browser.close();

const flags = ['pointerEvents is deprecated', 'shadow*', 'TouchableWithoutFeedback is deprecated', 'boxShadow'];
console.log('=== avertissements de dépréciation encore présents ? ===');
for (const f of flags) {
  console.log((warns.some((w) => w.includes(f)) ? 'ENCORE LÀ' : 'parti   ') + ' :: ' + f);
}
console.log('\n=== autres erreurs / avertissements console (dédup) ===');
console.log([...new Set(warns)].slice(0, 20).join('\n') || 'aucun');
