import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const SHOT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa';
mkdirSync(SHOT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { screens: [], console: [], pageErrors: [], failedRequests: [] };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await context.newPage();

page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) report.console.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
page.on('pageerror', (e) => report.pageErrors.push(e.message.slice(0, 300)));
page.on('requestfailed', (r) => report.failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) report.failedRequests.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

const snap = async (name) => {
  const file = `${SHOT}/${name}.png`;
  await page.screenshot({ path: file }).catch(() => {});
  const texts = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.children.length === 0 && el.textContent && el.textContent.trim()) {
        const t = el.textContent.trim();
        if (t.length > 0 && t.length < 80) out.push(t);
      }
    });
    return [...new Set(out)].slice(0, 60);
  }).catch(() => []);
  const entry = { name, file, texts };
  report.screens.push(entry);
  log(`\n=== ${name} ===\n` + texts.join(' | '));
  return entry;
};

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await sleep(2500);

// ---------- PHASE A: LOGIN SCREEN QA (no real auth) ----------
log('\n########## PHASE A: LOGIN ##########');
await snap('A1-login-initial');

const emailInput = page.locator('input').first();
const pwInput = page.locator('input[type="password"]').first();

// invalid email + short pw
await emailInput.fill('notanemail').catch(() => {});
await pwInput.fill('123').catch(() => {});
await sleep(600);
await snap('A2-invalid-input');

// valid email + valid pw, signup mode (consent required)
await emailInput.fill('test@example.com').catch(() => {});
await pwInput.fill('secret123').catch(() => {});
await sleep(600);
await snap('A3-valid-no-consent');

// click consent checkbox (the row containing "données de santé")
try {
  const consent = page.getByText('données de santé', { exact: false }).first();
  await consent.click({ timeout: 1500 });
  await sleep(500);
  await snap('A4-consent-checked');
} catch { log('consent click skipped'); }

// switch to "Connexion" mode
try {
  await page.getByText('Connexion', { exact: true }).first().click({ timeout: 1500 });
  await sleep(600);
  await snap('A5-signin-mode');
} catch { log('signin switch skipped'); }

// ---------- WAIT FOR MANUAL LOGIN ----------
log('\n########## WAITING FOR MANUAL LOGIN (3 min) ##########');
const start = Date.now();
let loggedIn = false;
while (Date.now() - start < 180000) {
  const onTabs = await page.getByText('Plan', { exact: false }).first().isVisible().catch(() => false);
  const stillLogin = await page.getByText('Mot de passe', { exact: false }).first().isVisible().catch(() => false);
  if (onTabs && !stillLogin) { loggedIn = true; break; }
  await sleep(1500);
}
report.loginDetected = loggedIn;
log(loggedIn ? 'LOGIN_DETECTED' : 'LOGIN_TIMEOUT');
await sleep(2500);

// Might land on onboarding instead of tabs
await snap('B0-post-login');

// ---------- PHASE B: AUTHENTICATED TABS ----------
log('\n########## PHASE B: TABS ##########');
const tabs = [
  { label: 'Plan', key: 'plan' },
  { label: 'Courses', key: 'courses' },
  { label: 'Recettes', key: 'recettes' },
  { label: 'Garde-manger', key: 'garde-manger' },
  { label: 'Profil', key: 'profil' },
];
for (const tab of tabs) {
  try {
    const el = page.getByText(tab.label, { exact: false }).last();
    if (!(await el.isVisible({ timeout: 1000 }))) { log(`tab ${tab.label} not visible`); continue; }
    await el.click({ timeout: 2000 });
    await sleep(1800);
    await snap(`B-${tab.key}-top`);
    // scroll down to reveal more, screenshot, scroll back
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await sleep(700); }
    await snap(`B-${tab.key}-scrolled`);
    await page.mouse.wheel(0, -1600); await sleep(600);
  } catch (e) { log(`tab ${tab.label} error: ${e.message}`); }
}

// ---------- SAFE INTERACTION PROBES ----------
log('\n########## PHASE C: SAFE INTERACTIONS ##########');
// Plan: try a "Recaler"/"Régénérer" style button
try {
  await page.getByText('Plan', { exact: false }).last().click({ timeout: 1500 });
  await sleep(1200);
  for (const lbl of ['Recaler', 'Régénérer', 'Regénérer', 'Nouveau plan']) {
    const b = page.getByText(lbl, { exact: false }).first();
    if (await b.isVisible({ timeout: 600 }).catch(() => false)) {
      await b.click({ timeout: 1500 }).catch(() => {});
      await sleep(2000);
      await snap(`C-plan-after-${lbl}`);
      break;
    }
  }
} catch (e) { log('plan interaction skipped: ' + e.message); }

// Courses: try checking first item
try {
  await page.getByText('Courses', { exact: false }).last().click({ timeout: 1500 });
  await sleep(1200);
  await snap('C-courses-state');
} catch { /* ignore */ }

await sleep(1000);
writeFileSync(`${SHOT}/report.json`, JSON.stringify(report, null, 2));
await context.close();
await browser.close();

log('\n\n########## SUMMARY ##########');
log('Login detected: ' + report.loginDetected);
log('Screens captured: ' + report.screens.length);
log('Console errors/warnings: ' + report.console.length);
log('Page errors: ' + report.pageErrors.length);
log('Failed/4xx-5xx requests: ' + report.failedRequests.length);
log('\n-- pageErrors --\n' + (report.pageErrors.join('\n') || 'none'));
log('\n-- failedRequests --\n' + ([...new Set(report.failedRequests)].slice(0, 20).join('\n') || 'none'));
log('\n-- console (deduped) --\n' + ([...new Set(report.console)].slice(0, 25).join('\n') || 'none'));
log('DONE');
