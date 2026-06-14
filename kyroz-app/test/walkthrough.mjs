import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/video';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, slowMo: 250 });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 }, // phone-ish portrait
  recordVideo: { dir: OUT, size: { width: 430, height: 932 } },
});
const page = await context.newPage();

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:8081', { waitUntil: 'load' });
await page.waitForLoadState('networkidle').catch(() => {});
await sleep(2500);

// Try to walk through the bottom tabs if present (Plan, Courses, Frigo, etc.)
const tabLabels = ['Plan', 'Courses', 'Frigo', 'Recettes', 'Favoris', 'Profil', 'Réglages', 'Paramètres'];
for (const label of tabLabels) {
  const el = page.getByText(label, { exact: false }).first();
  try {
    if (await el.isVisible({ timeout: 800 })) {
      await el.click({ timeout: 1500 });
      await sleep(1800);
    }
  } catch { /* tab not present, skip */ }
}

// Scroll the main view a bit to show content
for (let i = 0; i < 3; i++) {
  await page.mouse.wheel(0, 400);
  await sleep(900);
}

await sleep(1500);
await context.close(); // flush video
await browser.close();

console.log('LOGS:\n' + logs.slice(0, 40).join('\n'));
console.log('DONE');
