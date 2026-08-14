// QA complète : écran de login, puis onboarding autonome de 4 personas contrastés.
//
// Deux réparations de fond le 2026-07-30, au-delà du chemin et du port :
//  · l'onboarding est passé de 10 à 7 étapes (l'étape « récap » a sauté le
//    2026-06-20, macros/préférences/variété ont fusionné) — le script jouait
//    encore l'ancien enchaînement et se perdait dès l'étape 6 ;
//  · un écran d'avertissement santé s'interposait entre la connexion et l'étape 1 —
//    sans lui, aucun persona ne voyait l'assistant. ⚠️ Il a été SUPPRIMÉ le
//    2026-08-12 : la connexion débouche maintenant sur l'assistant, et c'est
//    `attendreEtape1` qui absorbe le délai de montage que cet écran masquait.
//
// Les chiffres du plan étaient lus dans le DOM de l'écran de récap, qui n'existe
// plus. Ils sont désormais lus dans le profil persisté (@kyroz:profile) : valeurs
// exactes, pas de scraping de pixels.
//
// Usage : node test/qa-full.mjs            (les 4 personas)
//         node test/qa-full.mjs F          (un sous-ensemble — cf. plus bas)

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import {
  SHOT, PHONE, HEADLESS, BASE_URL, sleep, ensureDirs, open,
  guestLogin, attendreEtape1, runOnboarding, dismissReveal, dismissOverlays, neutralizeFirstRun, plannedMeals,
  bilanPannes,
} from './_harness.mjs';

ensureDirs();
const log = (...a) => console.log(...a);
const report = { baseUrl: BASE_URL, phaseA: [], personas: [], console: [], pageErrors: [], failedRequests: [] };

const browser = await chromium.launch({ headless: HEADLESS, slowMo: 120 });

// Branche les écouteurs d'erreurs sur une page (tag = persona courant, pour le contexte).
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

// Capture écran + dump du texte visible (assertions sans dépendre du pixel).
async function snap(page, name) {
  await page.screenshot({ path: `${SHOT}/${name}.png` }).catch(() => {});
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

// Ce que le moteur a RÉELLEMENT calculé, lu à la source plutôt qu'à l'écran.
const readProfile = (page) => page.evaluate(() => {
  const raw = localStorage.getItem('@kyroz:profile');
  const plan = localStorage.getItem('@kyroz:plan');
  if (!raw) return null;
  const p = JSON.parse(raw);
  return {
    goal: p.goal, tdee: p.tdee_kcal, kcal: p.target_kcal,
    prot: p.target_protein_g, carb: p.target_carbs_g, fat: p.target_fat_g,
    planDays: p.plan_days, meals: p.meals?.length ?? 0,
    planMeals: plan ? (JSON.parse(plan).meals?.length ?? 0) : 0,
  };
}).catch(() => null);

// ── Personas : sexe / poids / masse grasse / objectif variés ──────────────────
// (objectifs choisis pour rester au-dessus du plancher d'énergie disponible —
//  cf. lib/safety.ts::safetyFloorKcal, sinon la génération est bloquée.)
//
// ⚠️ `birth` et non `age` : l'étape 2 saisit une DATE DE NAISSANCE depuis le
// 2026-08-02, dont l'âge est dérivé. Les âges en commentaire sont ceux du
// 2026-08-05 et vieillissent avec les personas — c'est voulu, un utilisateur
// aussi. Ce qui compte pour la QA, ce sont les gabarits, pas l'année pile.
const PERSONAS = [
  { key: 'H1-homme-cut', name: 'Marc', sex: 'male', birth: { d: 2, m: 8, y: 1998 }, weight: 82, height: 180, bodyFat: 12, goal: 'cut' },          // 28 ans
  { key: 'H2-homme-bulk', name: 'Yanis', sex: 'male', birth: { d: 14, m: 3, y: 1991 }, weight: 98, height: 178, bodyFat: 24, goal: 'lean_bulk' },  // 35 ans
  { key: 'F1-femme-recomp', name: 'Léa', sex: 'female', birth: { d: 9, m: 1, y: 1997 }, weight: 60, height: 166, bodyFat: 22, goal: 'recomp' },    // 29 ans
  { key: 'F2-femme-maint', name: 'Sophie', sex: 'female', birth: { d: 27, m: 5, y: 1993 }, weight: 75, height: 168, bodyFat: 32, goal: 'maintain' }, // 33 ans
];

// Chaque persona consomme UNE création d'invité, et Supabase les plafonne par
// heure et par IP : une passe complète peut donc se faire refuser la moitié des
// profils sans que l'app y soit pour quoi que ce soit. D'où ce filtre — on scinde
// la passe en deux moitiés plutôt que d'attendre que le quota retombe.
//
//   node test/qa-full.mjs H1 H2       → seulement les deux hommes
//   node test/qa-full.mjs F           → les deux femmes
//
// Réutiliser UN SEUL invité pour les quatre ne marcherait pas : `hydrateFromCloud`
// ferait « pull_cloud » (contexte neuf = pas de profil local) et le persona
// suivant hériterait du profil du précédent, sautant l'onboarding.
const filtres = process.argv.slice(2);
const SELECTION = filtres.length
  ? PERSONAS.filter((p) => filtres.some((f) => p.key.toLowerCase().startsWith(f.toLowerCase())))
  : PERSONAS;
if (!SELECTION.length) {
  console.error(`Aucun persona ne correspond à « ${filtres.join(' ')} ». Disponibles : ${PERSONAS.map((p) => p.key).join(', ')}`);
  process.exit(2);
}
if (SELECTION.length < PERSONAS.length) {
  log(`Sélection : ${SELECTION.map((p) => p.key).join(', ')} (${PERSONAS.length - SELECTION.length} persona(s) écarté(s))`);
}

// ════════ PHASE A : QA de l'écran de login (indépendant du persona) ════════
log('\n########## PHASE A : ÉCRAN DE LOGIN ##########');
{
  const ctx = await browser.newContext({ viewport: PHONE });
  await neutralizeFirstRun(ctx);
  const page = await ctx.newPage();
  attach(page, 'login');
  await open(page);
  report.phaseA.push(await snap(page, 'A1-login-initial'));

  const email = page.getByPlaceholder('toi@email.com').first();
  const pw = page.getByPlaceholder('6 caractères minimum').first();
  await email.fill('notanemail').catch(() => {});
  await pw.fill('123').catch(() => {});
  await sleep(500);
  report.phaseA.push(await snap(page, 'A2-invalid-input'));
  await email.fill('test@example.com').catch(() => {});
  await pw.fill('secret123').catch(() => {});
  await sleep(500);
  report.phaseA.push(await snap(page, 'A3-valid-input'));
  try {
    await page.getByText('données de santé', { exact: false }).first().click({ timeout: 1500 });
    await sleep(400);
    await snap(page, 'A4-consent-checked');
  } catch { log('case de consentement introuvable'); }
  await ctx.close();
}

// ════════ PHASE B : onboarding autonome, un persona à la fois ════════
async function runPersona(p) {
  log(`\n########## PERSONA ${p.key} (${p.sex}, ${p.weight} kg, ${p.bodyFat} % MG, ${p.goal}) ##########`);
  const ctx = await browser.newContext({ viewport: PHONE }); // contexte isolé = nouvel invité
  await neutralizeFirstRun(ctx);
  const page = await ctx.newPage();
  attach(page, p.key);
  await open(page);

  const signedIn = await guestLogin(page);
  if (!signedIn) {
    // Presque toujours un 429 Supabase : la création d'invité est limitée par
    // heure et par IP. On abandonne CE persona proprement, sans jouer un
    // onboarding fantôme qui produirait un rapport illisible.
    await snap(page, `${p.key}-LOGIN-BLOQUE`);
    report.personas.push({ key: p.key, sex: p.sex, weight: p.weight, bodyFat: p.bodyFat, goal: p.goal, planMeals: 0, blocked: 'connexion invité refusée' });
    await ctx.close();
    return;
  }
  // L'assistant suit directement la connexion (l'écran d'avertissement santé a été
  // supprimé le 2026-08-12). Le contexte est neuf, donc l'étape 1 DOIT venir : ne pas
  // la voir est une panne, pas un cas légitime — la nommer ici évite de jouer un
  // onboarding fantôme derrière et de conclure « écran introuvable ».
  if (!(await attendreEtape1(page))) {
    await snap(page, `${p.key}-ASSISTANT-ABSENT`);
    report.personas.push({ key: p.key, sex: p.sex, weight: p.weight, bodyFat: p.bodyFat, goal: p.goal, planMeals: 0, blocked: "l'assistant d'onboarding n'est jamais apparu après la connexion" });
    await ctx.close();
    return;
  }

  const onboarding = await runOnboarding(page, p);
  if (!onboarding.ok) {
    await snap(page, `${p.key}-ONBOARDING-BLOQUE`);
    report.personas.push({ key: p.key, sex: p.sex, weight: p.weight, bodyFat: p.bodyFat, goal: p.goal, planMeals: 0, blocked: `onboarding bloqué à l'étape ${onboarding.etape}` });
    await ctx.close();
    return;
  }

  // Reveal du 1er plan : c'est là que vivent objectif / kcal / jours désormais.
  const reveal = await snap(page, `${p.key}-reveal`);
  await dismissReveal(page);
  await dismissOverlays(page);

  // Preuve non ambiguë : un plan persisté. Chercher le mot « Plan » à l'écran ne
  // prouve rien — getByText est insensible à la casse, « Générer mon plan » match.
  const reachedPlan = (await plannedMeals(page)) > 0;
  if (reachedPlan) {
    await snap(page, `${p.key}-plan-top`);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await sleep(500); }
    await snap(page, `${p.key}-plan-scrolled`);
  } else {
    await snap(page, `${p.key}-BLOCKED`);
  }

  const m = await readProfile(page);
  report.personas.push({ key: p.key, sex: p.sex, weight: p.weight, bodyFat: p.bodyFat, goal: p.goal, reachedPlan, revealSeen: reveal.some((t) => t.includes('kcal')), ...(m ?? {}) });
  await ctx.close();
}

for (const p of SELECTION) await runPersona(p);

await browser.close();
writeFileSync(`${SHOT}/report.json`, JSON.stringify(report, null, 2));

// ════════ RÉSUMÉ ════════
log('\n\n########## RÉSUMÉ ##########');
log('Personas : ' + report.personas.length);
log('Erreurs page : ' + report.pageErrors.length);
log('Requêtes en échec / 4xx-5xx : ' + report.failedRequests.length);
log('\n-- Plans générés par persona --');
for (const r of report.personas) {
  log(
    `${r.planMeals ? '✓' : '✗'} ${r.key.padEnd(18)} ${r.sex === 'male' ? 'H' : 'F'} ` +
    `${String(r.weight).padStart(3)}kg ${String(r.bodyFat).padStart(2)}%MG ${String(r.goal ?? '?').padEnd(10)} → ` +
    (r.blocked
      ? r.blocked
      : `TDEE ${r.tdee ?? '?'} · cible ${r.kcal ?? '?'} kcal · P ${r.prot ?? '?'} / G ${r.carb ?? '?'} / L ${r.fat ?? '?'} ` +
        `· ${r.planMeals ?? 0} repas planifiés`),
  );
}
const ko = report.personas.filter((r) => !r.planMeals);
// Un 429 sur /auth/v1/signup n'est PAS un bug de l'app : Supabase plafonne la
// création d'invités par heure et par IP. À dire explicitement, sinon un rapport
// vide se lit comme une app cassée.
if (report.failedRequests.some((f) => f.includes('over_request_rate_limit'))) {
  log('\n⚠ Supabase a refusé des connexions invité (429 over_request_rate_limit).');
  log("  Ce n'est pas un défaut de l'app : la création d'invités est plafonnée par heure et par IP.");
  log('  Relancer plus tard, ou espacer les passes.');
}
log('\n-- pageErrors --\n' + (report.pageErrors.join('\n') || 'aucune'));
log('\n-- failedRequests (dédup) --\n' + ([...new Set(report.failedRequests)].slice(0, 20).join('\n') || 'aucune'));
log('\n-- console (dédup) --\n' + ([...new Set(report.console)].slice(0, 25).join('\n') || 'aucune'));
log(`\nrapport -> ${SHOT}/report.json`);
// Distinguer les deux échecs, parce qu'ils appellent deux gestes différents :
// un persona sans plan peut être un refus Supabase, tandis qu'un blocage de
// parcours désigne une séquence du harnais devenue fausse.
const pannes = bilanPannes();
log(ko.length ? `ÉCHEC : ${ko.map((r) => r.key).join(', ')}` : 'DONE');
process.exitCode = ko.length || pannes ? 1 : 0;
