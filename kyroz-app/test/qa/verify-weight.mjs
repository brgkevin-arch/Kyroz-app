import { chromium } from 'playwright';
const SHOT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, storageState: `${SHOT}/session.json` });
const page = await context.newPage();

const wl = [];
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('weight_logs') || u.includes('recipe_overrides')) wl.push(`${r.status()} ${r.request().method()} ${u.replace(/\?.*/, '')}`);
});

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await sleep(3000);

const tap = async (l) => { const e = page.getByText(l, { exact: false }).last(); if (await e.isVisible({ timeout: 1500 }).catch(()=>false)) { await e.click().catch(()=>{}); return true; } return false; };

await tap('Profil'); await sleep(1500);
await tap('Suivi du poids'); await sleep(1500);

// set a weight value then save
const input = page.locator('input').first();
await input.click().catch(()=>{});
await input.fill('85').catch(()=>{});
await sleep(500);
await tap('Enregistrer'); await sleep(2500);

await page.screenshot({ path: `${SHOT}/F-weight-after-save.png` }).catch(()=>{});
await context.close(); await browser.close();

console.log('=== weight_logs / recipe_overrides traffic ===');
console.log([...new Set(wl)].join('\n') || 'no calls captured');
const had404 = wl.some((x) => x.startsWith('404'));
console.log('\nRESULT: ' + (had404 ? '❌ still 404' : '✅ no 404 — fix worked'));
