// Détails d'écran pour le carrousel d'accueil (`components/IntroCarousel.tsx`).
//
// 🔴 POURQUOI UN SCRIPT ET PAS DES CAPTURES FAITES À LA MAIN. Une image d'app
// FIGE l'app au jour où elle est prise, et continue d'avoir l'air à jour — c'est
// le défaut que `docs/briefs/README.md` nomme pour les briefs, et il est pire
// ici : ces images sont la PREMIÈRE chose qu'un utilisateur voit. Une capture
// faite à la main ne se regénère pas, donc elle ne se regénère jamais.
//
// Usage : KYROZ_URL=http://localhost:8097 node test/intro-captures.mjs
//
// 🔴 NE JAMAIS VIDER `assets/intro/` AVANT DE LANCER CE SCRIPT. Il pilote l'app pour
// la photographier, et l'app IMPORTE ces images (`components/IntroCarousel.tsx`,
// `require` résolu par Metro à la compilation). Sans elles le bundle ne se construit
// plus, l'écran ne s'ouvre pas, et le script échoue sur « l'écran Plan n'a pas été
// atteint » — un diagnostic qui accuse le parcours alors que la cause est le ménage
// qu'on vient de faire. Les captures s'ÉCRASENT en place, il n'y a rien à nettoyer.
// Sortie : assets/intro/ — versionnée, elle, parce que le code l'importe.
//
// ⚠️ LE CADRAGE N'EST PAS EN PIXELS EN DUR. Chaque diapo vise un TEXTE de l'écran
// (« Ma répartition (%) », « Suivi du poids »…) et se recadre sur la boîte que
// l'élément occupe RÉELLEMENT au moment du rendu. Des coordonnées en dur auraient
// péri au premier ajustement de mise en page, en silence, et le carrousel aurait
// montré un bout de rien. Ces textes sont verrouillés contre les écrans par
// `lib/__tests__/harnaisEcrans.test.ts`.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep, open, tap, bootToPlan, neutralizeFirstRun, dismissOverlays, DEFAULT_PERSONA } from './_harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'intro');
mkdirSync(OUT, { recursive: true });

// 430 × 932 en ×3, comme les visuels de fiche : le rendu TÉLÉPHONE est garanti
// (le seuil tablette est à 700, cf. lib/layout.ts) et la densité suffit pour un
// affichage plein écran sur n'importe quel appareil.
const PHONE = { width: 430, height: 932 };
// ⚠️ ×2 ET PAS ×3 (2026-09-07). Les diapos montrent désormais l'ÉCRAN ENTIER, pas un
// détail : une capture pleine page pèse trois fois plus qu'un recadrage. Elle est
// affichée sur ~230 pt de large, soit 690 px sur un écran ×3 — 860 px de capture
// suffisent largement, et le jeu complet reste léger. Capturer plus, c'est alourdir
// le bundle pour des pixels que personne ne verra.
const SCALE = 2;

// 🔴 L'ANCRE NE CADRE PLUS RIEN, ELLE PROUVE QU'ON EST SUR LE BON ÉCRAN. Les diapos
// montrent la page entière ; il n'y a donc plus de recadrage à calculer. Mais la
// vérification, elle, RESTE — et elle est plus nécessaire que jamais : c'est
// exactement ce qui manquait à `store-assets.mjs` le 2026-09-02, quand un onglet qui
// ne changeait pas lui a fait produire quatre captures identiques en annonçant quatre
// écrans différents, avec un code de sortie 0.
const DIAPOS = [
  { nom: '1-plan',     onglet: 'Plan',     ancre: 'Ma répartition (%)' },
  { nom: '2-poids',    onglet: 'Profil',   ancre: 'Suivi du poids' },
  { nom: '3-courses',  onglet: 'Courses',  ancre: 'Viandes & poissons' },
  { nom: '4-recettes', onglet: 'Recettes', ancre: 'Toutes les recettes' },
];

// 🔴 LES DEUX THÈMES, PAS UN. Une image est un pixel figé : elle ne suit pas le
// thème du lecteur. Capturée en sombre uniquement, elle poserait un rectangle noir
// au milieu d'un écran clair — soit exactement le défaut de contraste que la
// priorité 3 vient de fermer, réintroduit en image.
const THEMES = ['sombre', 'clair'];
const SCHEMA = { sombre: 'dark', clair: 'light' };

// Des pesées SEMÉES, pour que la carte de suivi montre une COURBE. Sans elles, le
// persona n'a que son poids d'inscription et la carte affiche « Encore une pesée et
// ta courbe apparaît ici » — une diapo qui vend le suivi du poids en montrant qu'il
// n'y en a pas. Valeurs déterministes : la capture doit être la même à chaque
// lancement, sinon le diff d'un fichier versionné devient illisible.
// ⚠️ La DERNIÈRE valeur diffère de l'avant-dernière à dessein. Avec 82,0 partout en
// fin de série, la carte affichait « 0 kg depuis la pesée précédente » — une diapo
// qui vend le suivi du poids en montrant qu'il ne bouge pas.
const PESEES = [
  { date: '2026-08-08', weight_kg: 84.4 }, { date: '2026-08-13', weight_kg: 84.0 },
  { date: '2026-08-18', weight_kg: 83.5 }, { date: '2026-08-23', weight_kg: 83.1 },
  { date: '2026-08-28', weight_kg: 82.6 }, { date: '2026-09-03', weight_kg: 82.0 },
];

const browser = await chromium.launch();
let manques = 0;

for (const theme of THEMES) {
  const dossier = join(OUT, theme);
  mkdirSync(dossier, { recursive: true });

  const ctx = await browser.newContext({
    viewport: PHONE, deviceScaleFactor: SCALE, colorScheme: SCHEMA[theme],
  });
  await neutralizeFirstRun(ctx);
  const page = await ctx.newPage();
  await open(page);

  // ⚠️ `bootToPlan` rend un BOOLÉEN, pas l'objet `{ ok }` de `runOnboarding`. Écrit
  // `parcours?.ok` la première fois : `true?.ok` vaut `undefined`, donc le script
  // déclarait l'échec sur un parcours qui venait de réussir. Un faux négatif accuse
  // l'app quand c'est la sonde qui lit mal — le défaut consigné dans `_harness.mjs`.
  if (!(await bootToPlan(page, { ...DEFAULT_PERSONA, days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] }))) {
    console.error(`❌ [${theme}] le parcours n'a pas abouti — rien à capturer`);
    manques++;
    await ctx.close();
    continue;
  }

  // Les pesées se sèment APRÈS l'inscription, pas dans `neutralizeFirstRun` : posées
  // avant, elles seraient réécrites à chaque chargement de page par le script d'init,
  // y compris par-dessus ce que le parcours écrit lui-même.
  await page.evaluate((pesees) => {
    localStorage.setItem('@kyroz:weights', JSON.stringify(pesees));
  }, PESEES);
  await page.reload({ waitUntil: 'load' });
  await sleep(3000);
  await dismissOverlays(page);
  console.log(`[${theme}] session prête`);

  for (const { nom, onglet, ancre } of DIAPOS) {
    if (!(await tap(page, onglet, { which: 'last', timeout: 3000 }))) {
      console.error(`❌ [${theme}] onglet introuvable : ${onglet}`);
      manques++;
      continue;
    }
    await sleep(1800);
    await dismissOverlays(page);
    await page.mouse.wheel(0, -3000);
    await sleep(700);

    // 🔴 ON PROUVE QU'ON EST SUR LE BON ÉCRAN AVANT DE PHOTOGRAPHIER. Un onglet qui
    // ne bascule pas ne lève aucune erreur : la page reste celle d'avant, et la
    // capture suivante l'immortalise sous un autre nom. C'est la panne exacte de
    // `store-assets.mjs` le 2026-09-02 — quatre fiches App Store identiques, code 0.
    const present = await page.getByText(ancre, { exact: false }).first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (!present) {
      console.error(`❌ [${theme}] ${onglet} : « ${ancre} » absent — l'écran n'est pas celui attendu`);
      manques++;
      continue;
    }

    await page.screenshot({ path: join(dossier, `${nom}.png`) });
    console.log(`[${theme}] capture : ${nom} (page entière)`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n→ ${OUT}`);
if (manques) {
  console.error(`\n❌ ${manques} diapo(s) sans image — le carrousel serait incomplet.`);
  process.exit(1);
}
