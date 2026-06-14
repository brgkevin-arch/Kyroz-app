import { chromium } from 'playwright';
const SHOT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa';
const STATE = `${SHOT}/session.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, storageState: STATE });
const page = await context.newPage();
const fails = [];
page.on('response', (r) => { if (r.status() >= 400) fails.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*/, '')}`); });

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await sleep(2500);

const tab = async (label) => { const e = page.getByText(label, { exact: false }).last(); if (await e.isVisible({ timeout: 1500 }).catch(() => false)) { await e.click().catch(() => {}); return true; } return false; };
const snap = async (n) => { await page.screenshot({ path: `${SHOT}/${n}.png` }).catch(() => {}); console.log('shot: ' + n); };

const subs = [
  ['Objectif', 'objectif'],
  ['Calories & macros', 'macros'],
  ['Préférences alimentaires', 'preferences'],
  ['Paramètres des repas', 'repas'],
];
for (const [label, key] of subs) {
  await tab('Profil'); await sleep(1200);
  // scroll the profil list a touch so the row is on-screen
  await page.mouse.wheel(0, 250); await sleep(500);
  const row = page.getByText(label, { exact: false }).first();
  if (await row.isVisible({ timeout: 1500 }).catch(() => false)) {
    await row.click().catch(() => {});
    await sleep(1600);
    await snap('E-' + key);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 500); await sleep(500); }
    await snap('E-' + key + '-scrolled');
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(900);
  } else {
    console.log('NOT FOUND: ' + label);
  }
}
await context.close(); await browser.close();
console.log('fails: ' + ([...new Set(fails)].join(' | ') || 'none'));
console.log('DONE');
