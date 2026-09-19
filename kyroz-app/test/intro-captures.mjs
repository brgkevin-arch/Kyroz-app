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
// ⚠️ SANS OPTION, IL CRÉE DEUX COMPTES INVITÉS — un par thème — sur la base Supabase
// de `.env.local`, c'est-à-dire la PRODUCTION sur une machine de développement.
// ➡️ Préférer : KYROZ_SESSION_LOCALE=1 KYROZ_URL=http://localhost:8097 node test/intro-captures.mjs
// (session factice posée sur l'appareil, aucun compte créé — `_harness.mjs::poserSessionLocale`).
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
//
// `preparer` : un geste à faire AVANT de photographier, quand l'écran par défaut ne
// montre pas ce que la diapo prétend vendre.
// `refuser` : un texte qui ne doit PAS s'y trouver. C'est la règle « un chiffre
// affiché est celui qui sera servi » appliquée à l'image de vente : une diapo qui
// annonce le contraire de ce qu'elle montre est un mensonge, même sans code fautif.
const DIAPOS = [
  {
    nom: '1-plan', onglet: 'Plan', ancre: 'Ma répartition (%)',
    // 🔴 SANS CE GESTE, LA DIAPO DU PLAN AFFICHE « 0 / 2183 kcal », barre vide.
    // Le persona vient de s'inscrire : son premier jour n'a rien de consommé. La
    // diapo qui vend le plan montrait donc une journée où rien n'a encore eu lieu.
    // On coche un repas — le VRAI geste (`cookMeal` → `setMealStatus 'eaten'`), pas
    // une valeur posée dans le stockage.
    preparer: async (page) => tap(page, 'J\'ai cuisiné', { which: 'first', timeout: 3000 }),
    refuser: '0 / ',
  },
  { nom: '2-poids', onglet: 'Profil', ancre: 'Suivi du poids', refuser: '0 kg depuis' },
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
// n'y en a pas.
//
// 🔴 LE DERNIER POINT EST LA PESÉE DU JOUR, AU POIDS DU PERSONA, ET C'EST LE SCRIPT QUI
// LA POSE (corrigé le 2026-09-19). Ce commentaire disait le contraire : « l'app pose
// elle-même une pesée du JOUR » (`useWeightLog` : `upsertEntry` quand la liste est
// vide). Faux dès que le script RÉÉCRIT le journal après l'inscription — la liste n'est
// plus vide, l'app ne pose rien, et la diapo montrait « 82 kg » en en-tête au-dessus
// d'une courbe qui finissait à 82,6 le 13 septembre.
// ⚠️ Et l'avant-dernier point reste à 82,6, pas à 82,0 : deux dernières pesées égales
// faisaient finir la courbe À PLAT sous « 0 kg depuis la pesée précédente » (mesuré sur
// l'image le 2026-09-07). −0,6 kg, cohérent avec la pente.
//
// 🔴 LE JOUR DE LA CAPTURE EST FIGÉ À UN LUNDI 9 H 30 (2026-09-19). Les images
// dépendaient de l'heure de génération : lancé un samedi soir, le script rendait
// « Bonsoir », « Jour 6 », des repas cochés tout seuls, et sur les Courses « À partir
// du samedi : ton plan avait déjà commencé ». Le contexte démarre donc sur `FIXE`
// (`clock.install`), et les pesées se datent depuis lui : les dates ne vieillissent
// plus et le diff d'une regénération à l'autre ne tient qu'à ce qui a changé.
// ⚠️ `clock.install`, PAS `clock.setFixedTime` : une horloge FIGÉE casse la roulette de
// date de naissance de l'inscription (elle mesure le temps qui passe, le harnais
// s'arrête sur « Valider n'a rien enregistré »). Celle-ci démarre à `FIXE` et avance.
const FIXE = new Date(2026, 8, 14, 9, 30); // lundi 14 septembre 2026, 9 h 30, heure locale
// Date LOCALE, comme l'app (`localStamp`) : `toISOString` est en UTC et décalerait
// d'un jour une capture faite près de minuit.
const ilYA = (jours) => {
  const d = new Date(FIXE);
  d.setDate(d.getDate() - jours);
  const deux = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
};
const PESEES = [
  { date: ilYA(30), weight_kg: 84.4 },
  { date: ilYA(24), weight_kg: 84.0 },
  { date: ilYA(18), weight_kg: 83.5 },
  { date: ilYA(12), weight_kg: 83.1 },
  { date: ilYA(6),  weight_kg: 82.6 },
  { date: ilYA(0),  weight_kg: DEFAULT_PERSONA.weight },
];

const browser = await chromium.launch();
let manques = 0;

for (const theme of THEMES) {
  const dossier = join(OUT, theme);
  mkdirSync(dossier, { recursive: true });

  const ctx = await browser.newContext({
    viewport: PHONE, deviceScaleFactor: SCALE, colorScheme: SCHEMA[theme],
  });
  await ctx.clock.install({ time: FIXE }); // démarre lundi 9 h 30, puis avance (cf. `FIXE`)
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

  for (const { nom, onglet, ancre, preparer, refuser } of DIAPOS) {
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

    if (preparer) {
      // Un geste de préparation qui ÉCHOUE ne se laisse pas passer : la capture
      // sortirait, muette, en montrant l'écran par défaut — c'est-à-dire exactement
      // ce que la préparation existe pour éviter.
      if (!(await preparer(page))) {
        console.error(`❌ [${theme}] ${nom} : la préparation n'a pas abouti`);
        manques++;
        continue;
      }
      await sleep(1400);
      await dismissOverlays(page);
      await page.mouse.wheel(0, -3000);
      await sleep(600);
    }

    // 🔴 CE QUE L'ÉCRAN NE DOIT PAS DIRE. Un écran valide peut afficher le contraire
    // de ce que sa diapo annonce — « 0 kg depuis la pesée précédente » au-dessus
    // d'une courbe qui descend, « 0 / 2183 kcal » pour vendre un plan. Aucun test de
    // code ne voit ça : la faute est dans la DONNÉE servie, pas dans le rendu.
    if (refuser) {
      const texte = await page.evaluate(() => document.body.innerText || '');
      if (texte.includes(refuser)) {
        console.error(`❌ [${theme}] ${nom} : l'écran affiche « ${refuser} » — la diapo dirait le contraire de ce qu'elle montre`);
        manques++;
        continue;
      }
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
