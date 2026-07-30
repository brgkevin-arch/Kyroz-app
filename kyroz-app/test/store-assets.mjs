// Visuels obligatoires de la fiche Google Play : captures d'écran + feature graphic.
//
// Google REFUSE de publier, même sur une piste de test fermé, tant que la fiche
// n'est pas complète : au moins 2 captures de téléphone et un feature graphic de
// 1024×500. C'est donc le vrai chemin critique du lancement Android, pas le build.
//
// Usage : node test/store-assets.mjs        (serveur web requis, cf. _harness)
// Sortie : test/store/

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep, open, tap, bootToPlan, neutralizeFirstRun, dismissOverlays, DEFAULT_PERSONA } from './_harness.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'store');
mkdirSync(OUT, { recursive: true });

// 390×844 = gabarit iPhone 12/13/14, rendu TÉLÉPHONE garanti. On ne capture pas
// plus large : au-delà de ~600 px l'app bascule sur une mise en page tablette et
// les captures ne ressembleraient plus à ce que verra l'utilisateur.
const PHONE = { width: 390, height: 844 };

const browser = await chromium.launch({ headless: true });
// THÈME SOMBRE imposé : l'app suit le système, et Playwright démarre en clair.
// La marque est noire (splash #000000, feature graphic noir) — des captures claires
// jureraient sur la fiche, et le remplissage noir des bords se verrait comme un défaut.
const context = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, colorScheme: 'dark' });
await neutralizeFirstRun(context);
const page = await context.newPage();

await open(page);
// Semaine COMPLÈTE : le persona par défaut ne planifie que 3 jours, et le
// sélecteur de la fiche montrerait un plan à trous.
const ok = await bootToPlan(page, { ...DEFAULT_PERSONA, days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] });
console.log(ok ? 'session prête' : '⚠️ plan non généré — captures probablement vides');
await sleep(1500);

// Écrans retenus, dans l'ordre où ils racontent le produit : ce qu'on reçoit
// (le plan), puis ce qui le rend crédible (recettes), puis ce qu'il fait gagner
// (courses, frigo).
const ECRANS = [
  ['1-plan', 'Plan'],
  ['2-recettes', 'Recettes'],
  ['3-courses', 'Courses'],
  ['4-frigo', 'Frigo'],
  ['5-profil', 'Profil'],
];

for (const [nom, onglet] of ECRANS) {
  if (!(await tap(page, onglet, { which: 'last', timeout: 3000 }))) {
    console.log('onglet introuvable : ' + onglet);
    continue;
  }
  await sleep(2000);
  await dismissOverlays(page);
  await page.mouse.wheel(0, -3000);
  await sleep(800);
  await page.screenshot({ path: `${OUT}/${nom}.png` });
  console.log('capture : ' + nom);
}

// ── Feature graphic 1024×500 ─────────────────────────────────────────────────
// Sobre et sombre, aligné sur le thème de l'app. Pas de capture d'écran dedans :
// Google l'affiche en petit et en tête de fiche, un écran illisible y dessert.
const FEATURE = `
<style>html,body{margin:0;padding:0;background:#000;}</style>
<div style="width:1024px;height:500px;background:#000;display:flex;align-items:center;
            justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="text-align:center;padding:0 64px;">
    <div style="color:#fff;font-size:76px;font-weight:800;letter-spacing:-2.5px;">Kyroz</div>
    <div style="color:#fff;opacity:.62;font-size:29px;font-weight:500;margin-top:18px;
                letter-spacing:-.4px;">Ton plan de repas, calé sur tes macros</div>
    <div style="margin-top:34px;display:flex;gap:14px;justify-content:center;">
      ${['7 jours', 'Liste de courses', '314 recettes'].map((t) => `
        <span style="color:#fff;opacity:.85;font-size:19px;font-weight:600;
                     border:1px solid rgba(255,255,255,.22);border-radius:999px;
                     padding:9px 20px;">${t}</span>`).join('')}
    </div>
  </div>
</div>`;

const fg = await context.newPage();
await fg.setViewportSize({ width: 1024, height: 500 });
await fg.setContent(FEATURE);
await sleep(400);
await fg.screenshot({ path: `${OUT}/feature-graphic.png` });
console.log('capture : feature-graphic (1024×500)');

await context.close();
await browser.close();

writeFileSync(`${OUT}/README.txt`,
  `Visuels de la fiche Google Play — générés le 2026-07-30 par test/store-assets.mjs\n\n` +
  `Captures : 390×844 CSS rendues en ×3 → 1170×2532 px.\n` +
  `Feature graphic : 1024×500 px, exigé par Google.\n\n` +
  `Regénérer : npm run store:assets (serveur web allumé).\n`);

console.log('\n→ ' + OUT);
