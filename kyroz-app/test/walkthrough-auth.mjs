import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/video';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  recordVideo: { dir: OUT, size: { width: 430, height: 932 } },
});
const page = await context.newPage();

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await sleep(2000);

// --- Wait for the USER to log in by hand in the headed window ---
// We consider login done when a tab bar label (e.g. "Plan") becomes visible,
// or when the login form's "Mot de passe" field disappears.
console.log('WAITING_FOR_LOGIN');
const start = Date.now();
const TIMEOUT = 180000; // 3 min for the user to authenticate
let loggedIn = false;
while (Date.now() - start < TIMEOUT) {
  const onPlan = await page.getByText('Plan', { exact: false }).first().isVisible().catch(() => false);
  const stillLogin = await page.getByText('Mot de passe', { exact: false }).first().isVisible().catch(() => false);
  if (onPlan && !stillLogin) { loggedIn = true; break; }
  await sleep(1500);
}
console.log(loggedIn ? 'LOGIN_DETECTED' : 'LOGIN_TIMEOUT');
await sleep(2000);

// --- Walk the core loop ---
const tabs = ['Plan', 'Courses', 'Recettes', 'Garde-manger', 'Frigo', 'Profil'];
for (const label of tabs) {
  const el = page.getByText(label, { exact: false }).last();
  try {
    if (await el.isVisible({ timeout: 800 })) {
      await el.click({ timeout: 1500 });
      await sleep(1800);
      for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 450); await sleep(900); }
      await page.mouse.wheel(0, -900); await sleep(700);
    }
  } catch { /* skip missing tab */ }
}

await sleep(1500);
await context.close(); // flush video
await browser.close();
console.log('DONE');
