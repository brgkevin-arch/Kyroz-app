// Détails d'écran pour le carrousel d'accueil (`components/IntroCarousel.tsx`).
//
// 🔴 POURQUOI UN SCRIPT ET PAS DES CAPTURES FAITES À LA MAIN. Une image d'app
// FIGE l'app au jour où elle est prise, et continue d'avoir l'air à jour — c'est
// le défaut que `docs/briefs/README.md` nomme pour les briefs, et il est pire
// ici : ces images sont la PREMIÈRE chose qu'un utilisateur voit. Une capture
// faite à la main ne se regénère pas, donc elle ne se regénère jamais.
//
// Usage : KYROZ_URL=http://localhost:8097 node test/intro-captures.mjs
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
const SCALE = 3;

// `marge` : ce qu'on ajoute autour de la boîte visée, en px CSS. `remonte` : de
// combien de parents on remonte avant de mesurer — un texte seul ne cadre rien,
// c'est le bloc qui le contient qu'on photographie.
// `bande` : hauteur imposée (px CSS) quand le bloc visé n'est pas un conteneur
// mesurable — une liste n'a pas de « carte » à photographier, on en prend une
// tranche sous son titre. Sans elle, `3-courses` rendait 72 px de haut : le titre
// de catégorie SEUL, sans un seul article dessous.
const DIAPOS = [
  { nom: '1-plan',     onglet: 'Plan',     ancre: 'Ma répartition (%)',  remonte: 3, marge: 12 },
  { nom: '2-poids',    onglet: 'Profil',   ancre: 'Suivi du poids',      remonte: 1, marge: 12 },
  { nom: '3-courses',  onglet: 'Courses',  ancre: 'Viandes & poissons',  remonte: 1, marge: 12, bande: 430 },
  // `margeHaut: 0` — la marge de 12 px faisait entrer une rangée de filtres coupée
  // en haut de l'image. Une diapo qui commence par un élément tronqué a l'air d'un
  // bug d'affichage, pas d'un extrait.
  { nom: '4-recettes', onglet: 'Recettes', ancre: 'Toutes les recettes', remonte: 1, marge: 12, margeHaut: 0, bande: 470 },
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

  for (const { nom, onglet, ancre, remonte, marge, margeHaut, bande } of DIAPOS) {
    if (!(await tap(page, onglet, { which: 'last', timeout: 3000 }))) {
      console.error(`❌ [${theme}] onglet introuvable : ${onglet}`);
      manques++;
      continue;
    }
    await sleep(1800);
    await dismissOverlays(page);
    await page.mouse.wheel(0, -3000);
    await sleep(700);

    let cible = page.getByText(ancre, { exact: false }).first();
    for (let i = 0; i < remonte; i++) cible = cible.locator('..');

    const boite = await cible.boundingBox().catch(() => null);
    if (!boite) {
      // 🔴 UN CADRAGE QUI ÉCHOUE SE NOMME. Sans ça le script garderait l'image
      // précédente, et le carrousel montrerait autre chose que ce qu'il annonce —
      // sans que personne ne l'apprenne. C'est ce que `store-assets.mjs` a fait le
      // 2026-09-02 : quatre captures identiques, code de sortie 0.
      console.error(`❌ [${theme}] ancre introuvable sur ${onglet} : « ${ancre} »`);
      manques++;
      continue;
    }

    const haut = margeHaut ?? marge;
    const hauteur = bande ?? boite.height + marge + haut;
    const clip = {
      x: Math.max(0, boite.x - marge),
      y: Math.max(0, boite.y - haut),
      width: Math.min(PHONE.width, boite.width + marge * 2),
      height: Math.min(PHONE.height - Math.max(0, boite.y - haut), hauteur),
    };
    await page.screenshot({ path: join(dossier, `${nom}.png`), clip });
    console.log(`[${theme}] capture : ${nom} (${Math.round(clip.width)}×${Math.round(clip.height)} CSS)`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n→ ${OUT}`);
if (manques) {
  console.error(`\n❌ ${manques} diapo(s) sans image — le carrousel serait incomplet.`);
  process.exit(1);
}
