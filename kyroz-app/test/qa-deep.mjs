import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

const SHOT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa';
const STATE = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa/session.json';
mkdirSync(SHOT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { screens: [], console: [], pageErrors: [], failedRequests: [] };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const haveState = existsSync(STATE);
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  storageState: haveState ? STATE : undefined,
});
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
const tap = async (label, exact = false) => {
  const el = page.getByText(label, { exact }).last();
  if (await el.isVisible({ timeout: 1200 }).catch(() => false)) { await el.click({ timeout: 2000 }).catch(() => {}); return true; }
  return false;
};

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await sleep(2500);

if (!haveState) {
  log('WAITING FOR MANUAL LOGIN (3 min)...');
  const start = Date.now();
  while (Date.now() - start < 180000) {
    const ok = await page.getByText('Plan', { exact: false }).first().isVisible().catch(() => false);
    const login = await page.getByText('Mot de passe', { exact: false }).first().isVisible().catch(() => false);
    if (ok && !login) break;
    await sleep(1500);
  }
  await sleep(1500);
  await context.storageState({ path: STATE });
  log('session saved -> ' + STATE);
}
await sleep(1500);

// ---- FRIGO ----
if (await tap('Frigo')) {
  await sleep(1800); await snap('D-frigo-top');
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await sleep(600); }
  await snap('D-frigo-scrolled');
  await page.mouse.wheel(0, -1600); await sleep(500);
} else log('Frigo tab not found');

// ---- PROFIL + sub-screens ----
await tap('Profil'); await sleep(1500); await snap('D-profil');

// Suivi du poids -> try to add an entry (reproduce weight_logs POST)
if (await tap('Suivi du poids')) {
  await sleep(1500); await snap('D-poids');
  // try a likely "add" affordance
  for (const lbl of ['Ajouter', 'Enregistrer', '+ ', 'Nouveau', 'Noter']) {
    if (await tap(lbl)) { await sleep(1500); await snap('D-poids-after-add'); break; }
  }
  await page.goBack().catch(() => {}); await sleep(1200);
}

const subs = ['Informations', 'Objectif', 'Calories & macros', 'Préférences alimentaires', 'Paramètres des repas'];
for (const sub of subs) {
  await tap('Profil'); await sleep(1000);
  if (await tap(sub)) {
    await sleep(1500);
    await snap('D-set-' + sub.split(' ')[0].toLowerCase());
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 500); await sleep(500); }
    await snap('D-set-' + sub.split(' ')[0].toLowerCase() + '-scrolled');
    await page.goBack().catch(() => {}); await sleep(1200);
  } else log('sub-screen not found: ' + sub);
}

await sleep(800);
writeFileSync(`${SHOT}/report-deep.json`, JSON.stringify(report, null, 2));
await context.close();
await browser.close();

log('\n########## DEEP SUMMARY ##########');
log('Screens: ' + report.screens.length);
log('Page errors: ' + report.pageErrors.length);
log('-- failed/4xx-5xx (deduped) --\n' + ([...new Set(report.failedRequests)].slice(0, 25).join('\n') || 'none'));
log('-- console (deduped) --\n' + ([...new Set(report.console)].slice(0, 20).join('\n') || 'none'));
log('DONE');
