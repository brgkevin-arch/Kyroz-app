// Visuels obligatoires de la fiche Google Play : captures d'écran + feature graphic.
//
// Google REFUSE de publier, même sur une piste de test fermé, tant que la fiche
// n'est pas complète : au moins 2 captures de téléphone et un feature graphic de
// 1024×500. C'est donc le vrai chemin critique du lancement Android, pas le build.
//
// Usage : node test/store-assets.mjs        (serveur web requis, cf. _harness)
// Sortie : test/store/

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep, open, tap, bootToPlan, neutralizeFirstRun, dismissOverlays, DEFAULT_PERSONA } from './_harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── Gabarit de capture ───────────────────────────────────────────────────────
// 430×932 = iPhone 14/15 Pro Max (et 15/16 Plus), rendu TÉLÉPHONE garanti — en
// ×3 il sort à 1290×2796, LE gabarit 6.7" attendu par App Store Connect.
// ⚠️ Ce n'est PAS la seule taille acceptée pour le créneau 6.9" : 1320×2868
// (iPhone 16 Pro Max, 440×956) l'est aussi. Ne pas écrire « la seule ».
// ⚠️ C'était 390×844 (6.1") jusqu'au 2026-08-10, soit 1170×2532 en ×3 : une
// taille qu'App Store Connect REFUSE à l'envoi. Troisième défaut de dimension
// de ce script — d'où la règle : mesurer le PNG produit (`sips -g pixelWidth
// -g pixelHeight`), jamais relire la config.
// ⚠️ Le seuil réel est TABLET_MIN_WIDTH = 700 (lib/layout.ts), pas « ~600 px »
// comme l'annonçait ce commentaire — et avant le 2026-08-01 il n'y avait AUCUN
// seuil, l'app était en pleine largeur à toute taille. 430 reste donc très en
// dessous : la mise en page TÉLÉPHONE est bien celle qui est capturée.
//
// `--ipad` produit le gabarit exigé par Apple pour un binaire iPad : 2048×2732,
// soit l'iPad Pro 13" (1024×1366 pt) en ×2.
const IPAD = process.argv.includes('--ipad');
const PHONE = { width: 430, height: 932 };
const TABLET = { width: 1024, height: 1366 };
const VIEWPORT = IPAD ? TABLET : PHONE;
const SCALE = IPAD ? 2 : 3;

const OUT = join(HERE, IPAD ? 'store-ipad' : 'store');
mkdirSync(OUT, { recursive: true });

// Le catalogue est la source du nombre affiché sur le feature graphic : il était
// figé à « 314 recettes » alors que le catalogue en compte 466 — un chiffre faux
// sur une fiche de store est exactement ce que la règle « pas de mensonge »
// interdit, et un nombre écrit à la main redevient faux à la vague suivante.
const NB_RECETTES = JSON.parse(
  readFileSync(join(HERE, '..', 'Recette', 'recettes-kyroz.json'), 'utf8')
).recipes.length;

const browser = await chromium.launch({ headless: true });
// THÈME SOMBRE imposé : l'app suit le système, et Playwright démarre en clair.
// La marque est noire (splash #000000, feature graphic noir) — des captures claires
// jureraient sur la fiche, et le remplissage noir des bords se verrait comme un défaut.
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, colorScheme: 'dark' });
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
// (courses, réserve).
const ECRANS = [
  ['1-plan', 'Plan'],
  ['2-recettes', 'Recettes'],
  ['3-courses', 'Courses'],
  ['4-reserve', 'Réserve'],
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
//
// ⚠️ JAMAIS en mode iPad : c'est un visuel Google Play, Apple n'en demande pas,
// et le `deviceScaleFactor` de 2 le sortait à 2048×1000 — hors des specs Google,
// qui exigent EXACTEMENT 1024×500.
const FEATURE = `
<style>html,body{margin:0;padding:0;background:#000;}</style>
<div style="width:1024px;height:500px;background:#000;display:flex;align-items:center;
            justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="text-align:center;padding:0 64px;">
    <div style="color:#fff;font-size:76px;font-weight:800;letter-spacing:-2.5px;">Kyroz</div>
    <div style="color:#fff;opacity:.62;font-size:29px;font-weight:500;margin-top:18px;
                letter-spacing:-.4px;">Ton plan de repas, calé sur tes macros</div>
    <div style="margin-top:34px;display:flex;gap:14px;justify-content:center;">
      ${['7 jours', 'Liste de courses', `${NB_RECETTES} recettes`].map((t) => `
        <span style="color:#fff;opacity:.85;font-size:19px;font-weight:600;
                     border:1px solid rgba(255,255,255,.22);border-radius:999px;
                     padding:9px 20px;">${t}</span>`).join('')}
    </div>
  </div>
</div>`;

if (IPAD) {
  console.log('feature graphic : ignoré (visuel Google Play, hors gabarit iPad)');
} else {
  // ⚠️ CONTEXTE À PART, `deviceScaleFactor: 1`. Le feature graphic était créé
  // dans le contexte des captures, donc il HÉRITAIT de son ×3 et sortait à
  // 3072×1500 — mesuré le 2026-08-01, et ce depuis l'origine du script.
  // Google exige EXACTEMENT 1024×500 : le visuel livré était hors specs, alors
  // qu'AGENTS.md C2 le déclarait conforme.
  const fgCtx = await browser.newContext({
    viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1, colorScheme: 'dark',
  });
  const fg = await fgCtx.newPage();
  await fg.setContent(FEATURE);
  await sleep(400);
  await fg.screenshot({ path: `${OUT}/feature-graphic.png` });
  await fgCtx.close();
  console.log('capture : feature-graphic (1024×500)');
}

await context.close();
await browser.close();

const { width: vw, height: vh } = VIEWPORT;
writeFileSync(`${OUT}/README.txt`,
  `Visuels de fiche de store — générés par test/store-assets.mjs\n\n` +
  `Captures : ${vw}×${vh} CSS rendues en ×${SCALE} → ${vw * SCALE}×${vh * SCALE} px.\n` +
  (IPAD
    ? `Gabarit iPad Pro 13" — exigé par Apple dès ios.supportsTablet = true.\n`
    : `Feature graphic : 1024×500 px, exigé par Google.\n`) +
  `\nRegénérer : npm run store:assets${IPAD ? ' -- --ipad' : ''} (serveur web allumé).\n`);

console.log('\n→ ' + OUT);
