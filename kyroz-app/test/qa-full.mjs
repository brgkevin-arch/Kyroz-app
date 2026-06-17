import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const SHOT = '/Users/kevinberger/Kyroz Code/kyroz-app/test/qa';
mkdirSync(SHOT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const report = { phaseA: [], personas: [], console: [], pageErrors: [], failedRequests: [] };

const browser = await chromium.launch({ headless: false, slowMo: 120 });

// Branche les écouteurs d'erreurs sur une page (tag = persona courant pour le contexte).
function attach(page, tag) {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) report.console.push(`[${tag}][${m.type()}] ${m.text()}`.slice(0, 300)); });
  page.on('pageerror', (e) => report.pageErrors.push(`[${tag}] ${e.message}`.slice(0, 300)));
  page.on('requestfailed', (r) => report.failedRequests.push(`[${tag}] ${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', async (r) => {
    if (r.status() < 400) return;
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch {}
    report.failedRequests.push(`[${tag}] ${r.status()} ${r.request().method()} ${r.url()} :: ${body}`);
  });
}

// Capture écran + dump du texte visible (pour assertions sans dépendre du pixel).
async function snap(page, name) {
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
    return [...new Set(out)].slice(0, 80);
  }).catch(() => []);
  log(`\n=== ${name} ===\n` + texts.join(' | '));
  return texts;
}

// Renvoie le texte qui suit un libellé dans le dump (ex. valeur après « Calories / jour »).
const after = (texts, label) => {
  const i = texts.findIndex((t) => t === label || t.startsWith(label));
  return i >= 0 && i + 1 < texts.length ? texts[i + 1] : null;
};

// ── Sous-objectif (sous-titre unique) par valeur d'objectif ───────────────────
const GOAL_SUB = {
  cut_aggressive: 'Perdre du gras vite, déficit marqué',
  cut: 'Perdre du gras en gardant le muscle',
  recomp: 'Affiner et prendre du muscle en parallèle',
  maintain: 'Stabiliser poids et composition',
  lean_bulk: 'Prendre du muscle avec un surplus propre',
  bulk: 'Maximiser la prise de masse',
};

// ── Personas testés : sexe / poids / masse grasse / objectif variés ───────────
// (objectifs choisis pour rester au-dessus du plancher kcal : <1500 H / <1200 F
//  déclenche le hard-block et bloque la génération — cf. validateProfile.)
const PERSONAS = [
  { key: 'H1-homme-cut',    name: 'Marc',  sex: 'male',   age: 28, weight: 82, height: 180, bodyFat: 12, goal: 'cut' },
  { key: 'H2-homme-bulk',   name: 'Yanis', sex: 'male',   age: 35, weight: 98, height: 178, bodyFat: 24, goal: 'lean_bulk' },
  { key: 'F1-femme-recomp', name: 'Léa',   sex: 'female', age: 29, weight: 60, height: 166, bodyFat: 22, goal: 'recomp' },
  { key: 'F2-femme-maint',  name: 'Sophie',sex: 'female', age: 33, weight: 75, height: 168, bodyFat: 32, goal: 'maintain' },
];

// ════════ PHASE A : QA de l'écran de login (indépendant du persona) ════════
log('\n########## PHASE A: LOGIN SCREEN ##########');
{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  attach(page, 'login');
  await page.goto('http://localhost:8081', { waitUntil: 'load' });
  await sleep(2500);
  report.phaseA.push(await snap(page, 'A1-login-initial'));

  const email = page.locator('input').first();
  const pw = page.locator('input[type="password"]').first();
  await email.fill('notanemail').catch(() => {});
  await pw.fill('123').catch(() => {});
  await sleep(500);
  report.phaseA.push(await snap(page, 'A2-invalid-input'));
  await email.fill('test@example.com').catch(() => {});
  await pw.fill('secret123').catch(() => {});
  await sleep(500);
  report.phaseA.push(await snap(page, 'A3-valid-input'));
  try { await page.getByText('données de santé', { exact: false }).first().click({ timeout: 1500 }); await sleep(400); await snap(page, 'A4-consent-checked'); } catch {}
  await ctx.close();
}

// ════════ PHASE B : onboarding autonome, un persona à la fois ════════
async function runPersona(p) {
  log(`\n########## PERSONA ${p.key} (${p.sex}, ${p.weight}kg, ${p.bodyFat}% MG, ${p.goal}) ##########`);
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  attach(page, p.key);
  await page.goto('http://localhost:8081', { waitUntil: 'load' });
  await sleep(2500);

  // Connexion invité (auth anonyme Supabase) — un nouvel invité par contexte isolé.
  try { await page.getByTestId('guest-login').click({ timeout: 5000 }); }
  catch { await page.getByText('Continuer en invité', { exact: false }).first().click({ timeout: 5000 }).catch(() => {}); }
  await sleep(3000);

  const tapContinue = async () => {
    const b = page.getByText('Continuer', { exact: true }).last();
    if (await b.isVisible({ timeout: 2000 }).catch(() => false)) await b.click().catch(() => {});
    await sleep(1100);
  };
  const fillPh = async (ph, val) => {
    const f = page.getByPlaceholder(ph, { exact: true }).first();
    if (await f.isVisible({ timeout: 1500 }).catch(() => false)) await f.fill(String(val)).catch(() => {});
  };
  const tap = async (txt, exact = false) => {
    await page.getByText(txt, { exact }).first().click({ timeout: 1500 }).catch(() => {});
  };

  // 1 — prénom
  await fillPh('Kévin', p.name); await sleep(250); await tapContinue();
  // 2 — sexe + infos de base
  if (p.sex === 'female') { await tap('Femme', true); await sleep(250); }
  await fillPh('25', p.age); await fillPh('80', p.weight); await fillPh('178', p.height);
  await sleep(250); await tapContinue();
  // 3 — masse grasse (saisie % directe)
  await fillPh('ex. 18', p.bodyFat); await sleep(250); await tapContinue();
  // 4 — activité : « Je ne fais pas de sport »
  await tap('Je ne fais pas de sport'); await sleep(250); await tapContinue();
  // 5 — objectif
  await tap(GOAL_SUB[p.goal]); await sleep(250); await tapContinue();
  // 6 macros · 7 préférences · 8 variété → défauts
  await tapContinue(); await tapContinue(); await tapContinue();
  // 9 — jours de plan (≥1 requis ; repas tous cochés par défaut)
  for (const d of ['Lun', 'Mer', 'Ven']) { await tap(d, true); await sleep(150); }
  await sleep(250); await tapContinue();
  // 10 — récap (kcal/macros propres à ce corps) → générer
  const recap = await snap(page, `${p.key}-recap`);
  await page.getByText('Générer mon plan', { exact: false }).last().click({ timeout: 2500 }).catch(() => {});
  await sleep(3500);

  const reachedPlan = await page.getByText('Plan', { exact: false }).first().isVisible().catch(() => false);
  if (reachedPlan) {
    await snap(page, `${p.key}-plan-top`);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await sleep(500); }
    await snap(page, `${p.key}-plan-scrolled`);
  } else {
    await snap(page, `${p.key}-BLOCKED`);
  }

  report.personas.push({
    key: p.key, sex: p.sex, weight: p.weight, bodyFat: p.bodyFat, goal: p.goal, reachedPlan,
    objectif: after(recap, 'Objectif'),
    masseGrasse: after(recap, 'Masse grasse'),
    kcal: after(recap, 'Calories / jour'),
    proteines: after(recap, 'Protéines'),
    glucides: after(recap, 'Glucides'),
    lipides: after(recap, 'Lipides'),
  });
  await ctx.close();
}

for (const p of PERSONAS) await runPersona(p);

await browser.close();

writeFileSync(`${SHOT}/report.json`, JSON.stringify(report, null, 2));

// ════════ RÉSUMÉ ════════
log('\n\n########## SUMMARY ##########');
log('Personas: ' + report.personas.length);
log('Page errors: ' + report.pageErrors.length);
log('Failed/4xx-5xx requests: ' + report.failedRequests.length);
log('\n-- Plans générés par persona --');
for (const r of report.personas) {
  log(`${r.reachedPlan ? '✓' : '✗'} ${r.key.padEnd(18)} ${r.sex === 'male' ? 'H' : 'F'} ${String(r.weight).padStart(3)}kg ${String(r.bodyFat).padStart(2)}%MG ${String(r.objectif || '?').padEnd(10)} → ${r.kcal || '?'} · P ${r.proteines || '?'} · G ${r.glucides || '?'} · L ${r.lipides || '?'}`);
}
log('\n-- pageErrors --\n' + (report.pageErrors.join('\n') || 'none'));
log('\n-- failedRequests (dédup) --\n' + ([...new Set(report.failedRequests)].slice(0, 20).join('\n') || 'none'));
log('\n-- console (dédup) --\n' + ([...new Set(report.console)].slice(0, 25).join('\n') || 'none'));
log('DONE');
