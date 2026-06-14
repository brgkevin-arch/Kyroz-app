import { chromium } from 'playwright';
const SHOT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, storageState: `${SHOT}/session.json` });
const page = await context.newPage();
const warns = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) warns.push(m.text()); });

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await sleep(3000);
// touch a few tabs + open a sheet (Recettes card) to exercise Sheet/ActionSheet
const tap = async (l) => { const e = page.getByText(l, { exact: false }).last(); if (await e.isVisible({ timeout: 1200 }).catch(()=>false)) { await e.click().catch(()=>{}); return true; } return false; };
await tap('Frigo'); await sleep(1200);
await tap('Profil'); await sleep(1200);
await tap('Recettes'); await sleep(1200);
// open first recipe -> Sheet
const card = page.getByText('Omelette', { exact: false }).first();
if (await card.isVisible({ timeout: 1500 }).catch(()=>false)) { await card.click().catch(()=>{}); await sleep(1500); await page.keyboard.press('Escape').catch(()=>{}); }
await sleep(1000);

await context.close(); await browser.close();
const flags = ['pointerEvents is deprecated', 'shadow*', 'TouchableWithoutFeedback is deprecated', 'boxShadow'];
console.log('=== deprecation warnings still present? ===');
for (const f of flags) {
  const hit = warns.find((w) => w.includes(f));
  console.log((hit ? 'STILL PRESENT' : 'gone') + ' :: ' + f);
}
console.log('\n=== other console errors/warnings (deduped) ===');
console.log([...new Set(warns)].slice(0, 20).join('\n') || 'none');
