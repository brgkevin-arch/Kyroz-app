// Socle partagé des scripts de parcours Playwright (walkthrough*, qa-*).
//
// POURQUOI CE FICHIER : ces scripts ont pourri entre juin et juillet 2026 parce que
// chacun recopiait les mêmes faits volatils — chemin ABSOLU du dépôt, port du
// serveur, enchaînement des écrans d'onboarding. Un renommage de dossier
// (« Kyroz Code » → « Kyroz_Code ») les a tous cassés d'un coup, sans que rien ne
// le signale. Ces faits vivent désormais ICI, à un seul endroit.
//
// RÈGLE : aucun chemin absolu, aucun port, aucun libellé d'écran dans les scripts
// appelants. S'il faut en ajouter un, il vient s'ajouter à ce fichier.
//
// SECONDE RÈGLE, ajoutée le 2026-08-05 : une séquence périmée doit le DIRE. Deux
// d'entre elles (dépistage santé, étape 2 de l'onboarding) ont été fausses pendant
// des jours sans qu'une seule ligne de sortie ne l'indique — les scripts rendaient
// « écran introuvable » alors qu'ils n'avaient jamais quitté le portail de santé.
// Toute étape qui n'aboutit pas passe par `panne()` ; `bilanPannes()` rend le
// compte en fin de script, à poser dans `process.exitCode`.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

// Dérivé du fichier lui-même : renommer le dépôt ne peut plus rien casser.
const HERE = dirname(fileURLToPath(import.meta.url)); // …/kyroz-app/test
export const VIDEO = join(HERE, 'video');
export const SHOT = join(HERE, 'qa');
export const STATE = join(SHOT, 'session.json');

// Le serveur web tourne sur 8090 (et non le 8081 par défaut d'Expo).
// Surchargeable sans éditer un script : KYROZ_URL=http://localhost:8081 node …
export const BASE_URL = process.env.KYROZ_URL ?? 'http://localhost:8090';

// Headed par défaut : ces scripts servent aussi à REGARDER l'app et à filmer.
// KYROZ_HEADLESS=1 pour une passe CI/rapide.
export const HEADLESS = process.env.KYROZ_HEADLESS === '1';

export const PHONE = { width: 430, height: 932 };

// Onglets réellement montés — source : app/(tabs)/_layout.tsx.
// (« Favoris », « Réglages », « Paramètres » traînaient dans les vieux scripts :
//  ces onglets n'existent pas, les boucles tournaient dans le vide.)
export const TABS = ['Plan', 'Courses', 'Réserve', 'Recettes', 'Profil'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function ensureDirs() {
  mkdirSync(VIDEO, { recursive: true });
  mkdirSync(SHOT, { recursive: true });
}

// ── Faire VOIR la panne ──────────────────────────────────────────────────────
//
// Ces scripts échouaient en silence : une séquence périmée rendait `false`, le
// script continuait, et le rapport concluait « écran introuvable » — le seul
// diagnostic qui soit à la fois faux et rassurant. L'écran EXISTE ; c'est le
// parcours qui n'y arrive plus. Mesuré le 2026-08-05 : `passScreening` cherchait
// une attestation qui n'est rendue qu'APRÈS les deux réponses, et `runOnboarding`
// remplissait un champ d'âge supprimé le 2026-08-02 — aucun script n'atteignait
// plus l'écran Plan, et pas une ligne de sortie ne le disait.
//
// Toute séquence du harnais qui n'aboutit pas passe désormais par `panne()` :
// message explicite, texte réellement à l'écran, capture. `bilanPannes()` les
// répète en fin de course et rend un code de sortie non nul.
export const PANNES = [];

/** Texte réellement visible, aplati — ce que le script « voyait » au moment du blocage. */
export const apercu = (page) => page
  .evaluate(() => (document.body.innerText || '').replace(/\s*\n+\s*/g, ' | ').trim().slice(0, 240))
  .catch(() => '(page illisible)');

/** Enregistre un blocage de parcours : bruyant, daté, avec capture. */
export async function panne(page, quoi, pourquoi) {
  const ecran = await apercu(page);
  mkdirSync(SHOT, { recursive: true });
  const capture = join(SHOT, `panne-${quoi}.png`);
  await page.screenshot({ path: capture }).catch(() => {});
  PANNES.push({ quoi, pourquoi, ecran, capture });
  console.error(`\n✗ PARCOURS BLOQUÉ [${quoi}] — ${pourquoi}`);
  console.error(`   à l'écran : ${ecran}`);
  console.error(`   capture   : ${capture}\n`);
}

/**
 * À appeler en fin de script. Rend le nombre de blocages (0 = parcours propre),
 * à poser dans `process.exitCode` : un parcours cassé ne doit pas sortir en 0.
 */
export function bilanPannes() {
  if (!PANNES.length) return 0;
  console.error(`\n########## ${PANNES.length} BLOCAGE(S) DE PARCOURS ##########`);
  for (const p of PANNES) console.error(`✗ [${p.quoi}] ${p.pourquoi}\n  écran : ${p.ecran}\n  capture : ${p.capture}`);
  console.error(
    '\nUn blocage de parcours n\'est PAS un « écran introuvable » : les écrans suivants\n' +
    'n\'ont jamais été atteints. Vérifier d\'abord que les séquences de test/_harness.mjs\n' +
    'correspondent encore aux écrans (dépistage santé, étapes d\'onboarding).\n',
  );
  return PANNES.length;
}

/**
 * Neutralise les surcouches de premier lancement AVANT que l'app ne les lise.
 *
 * Sans ça, deux surcouches interceptent TOUS les clics et un script se retrouve à
 * déclarer chaque écran « introuvable » alors qu'il n'a simplement jamais pu
 * avancer : la visite guidée modale à l'arrivée sur le plan (« Passer / Suivant »,
 * components/GuidedTour.tsx), et l'écran de consentement analytics.
 *
 * ⚠️ Ce dernier a CHANGÉ DE PLACE le 2026-08-10 : ce n'était plus une carte posée
 * sur le Plan mais un écran plein servi AVANT l'assistant d'onboarding
 * (components/AnalyticsConsentStep.tsx). Il bloque donc désormais une marche plus
 * TÔT — entre le dépistage santé et l'étape 1. La ligne qui le neutralise ci-dessous
 * n'a pas eu à changer (elle pose la réponse dans le stockage, pas à l'écran), mais
 * un script qui l'attendrait sur le Plan chercherait au mauvais endroit.
 *
 * Le consentement est posé à « denied » : un robot ne consent pas à la télémétrie.
 */
export async function neutralizeFirstRun(context) {
  await context.addInitScript(() => {
    try {
      // ⚠️ LES CINQ TOURS, pas seulement celui du Plan. Cette ligne n'en posait
      // qu'un — elle a été écrite quand il n'existait qu'un tour, et le tutoriel
      // est passé à cinq le 2026-08-08 (AGENTS.md E20). Les quatre autres se
      // seraient armés à la première visite de LEUR onglet, c'est-à-dire au
      // milieu d'un parcours, et un tour est une `Modal` dont les panneaux
      // avalent les taps : le script aurait déclaré « écran introuvable » alors
      // qu'il n'avait simplement pas pu quitter l'onglet précédent — le pire des
      // diagnostics (CLAUDE.md §11).
      // La liste est verrouillée contre `lib/tours.ts` par `harnaisEcrans.test.ts` :
      // ajouter un tour sans l'ajouter ici fait rougir `npm test` le jour même.
      for (const id of ['plan', 'profil']) {
        localStorage.setItem(`@kyroz:tour:${id}`, 'done');
      }
      localStorage.setItem('@kyroz:analyticsConsent', 'denied');
    } catch {}
  });
}

/**
 * Filet de sécurité : ferme à la main ce qui aurait quand même surgi (un tour dont
 * l'identifiant n'est pas connu de `neutralizeFirstRun`, par exemple).
 */
export async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    if (await tap(page, 'Passer', { exact: true, which: 'last', timeout: 700 })) { await sleep(600); continue; }
    if (await tap(page, 'Non merci', { exact: true, which: 'last', timeout: 700 })) { await sleep(600); continue; }
    break;
  }
}

/** Ouvre l'app et laisse le bundle web se poser. */
export async function open(page) {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(2500);
}

/** Clique un texte s'il est visible. Renvoie true si le clic a eu lieu. */
export async function tap(page, txt, { exact = false, which = 'first', timeout = 1500 } = {}) {
  const el = page.getByText(txt, { exact })[which]();
  if (!(await el.isVisible({ timeout }).catch(() => false))) return false;
  await el.click({ timeout: 2000 }).catch(() => {});
  return true;
}

/** Remplit un champ repéré par son placeholder. */
export async function fillPh(page, placeholder, value) {
  const f = page.getByPlaceholder(placeholder, { exact: true }).first();
  if (!(await f.isVisible({ timeout: 1500 }).catch(() => false))) return false;
  await f.fill(String(value)).catch(() => {});
  return true;
}

/** Bouton principal du pied d'écran (« Continuer » / « Générer mon plan »). */
export async function tapPrimary(page, label = 'Continuer') {
  await tap(page, label, { exact: true, which: 'last', timeout: 2500 });
  await sleep(1100);
}

/**
 * Connexion invité (auth anonyme Supabase).
 *
 * Remplace l'attente d'un login MANUEL de 3 minutes que faisaient walkthrough-auth
 * et qa-deep : un script qui exige un humain devant l'écran n'est pas un script.
 * L'affordance existe pour ça (login.tsx, testID « guest-login »).
 */
export async function guestLogin(page) {
  const byId = page.getByTestId('guest-login');
  if (await byId.isVisible({ timeout: 5000 }).catch(() => false)) {
    await byId.click().catch(() => {});
  } else if (!(await tap(page, 'Continuer en invité', { timeout: 3000 }))) {
    return true; // déjà connecté (storageState réutilisé) — rien à faire
  }
  await sleep(3000);
  // Toujours sur l'écran de login = la création d'invité a échoué. Le cas courant
  // est un 429 de Supabase (`over_request_rate_limit`) quand on enchaîne les
  // personas : il faut le DIRE, pas laisser le script continuer dans le vide.
  const stillLogin = await page.getByPlaceholder('toi@email.com').first().isVisible({ timeout: 1500 }).catch(() => false);
  return !stillLogin;
}

/*
 * 📌 `passScreening` A ÉTÉ RETIRÉE LE 2026-08-12, avec l'écran qu'elle franchissait.
 * La note reste, parce que la classe de panne, elle, reste — c'est le seul contenu
 * de cette fonction qui avait de la valeur.
 *
 * Il y a eu, entre la connexion et l'étape 1, un écran « Avant de commencer ». Quand
 * il posait encore deux questions, cette fonction cherchait l'attestation en PREMIER,
 * or l'écran ne la rendait qu'une fois les deux réponses données : le portail était
 * INFRANCHISSABLE, la fonction rendait `false` sans rien dire, et tous les scripts
 * concluaient « écran introuvable » — un faux diagnostic qui a dormi des jours.
 *
 * ➡️ D'où les deux règles qui gouvernent tout ce fichier : une marche qui n'aboutit
 * pas se NOMME (`panne`), et les libellés dont ce harnais dépend sont verrouillés
 * contre les écrans par `lib/__tests__/harnaisEcrans.test.ts`, pour qu'un renommage
 * rougisse dans `npm test` le jour même.
 *
 * Aujourd'hui la connexion invité débouche directement sur l'assistant — plus rien
 * à franchir. Le renvoi médical que cet écran portait est servi sous le bouton de
 * l'étape 1 (constants/legal.ts, gardé par lib/__tests__/avertissementMedical.test.ts).
 */

/**
 * Étape courante de l'assistant (1 à 7), `null` si on n'y est pas.
 *
 * L'assistant affiche « ÉTAPE n / 6 » à partir de l'étape 2 (le compteur exclut
 * le prénom, cf. onboarding.tsx L272) : l'étape 1 se reconnaît à son champ.
 * C'est ce repère qui permet d'affirmer qu'une étape a été FRANCHIE plutôt que
 * d'enchaîner sept clics dans le vide.
 */
export const etapeCourante = (page) => page.evaluate(() => {
  const txt = document.body.innerText || '';
  const m = /[ÉE]TAPE\s+(\d+)\s*\/\s*\d+/i.exec(txt);
  if (m) return Number(m[1]) + 1;
  return /Ton prénom/i.test(txt) ? 1 : null;
}).catch(() => null);

/**
 * Choisit une date de naissance dans la ROULETTE (2026-08-12 : les trois champs
 * tapés ont été remplacés par une ligne qui ouvre une feuille).
 *
 * 🔴 ON POSE LE DÉFILEMENT, ON NE POSE PAS L'ÉTAT. `scrollTop = i × 44` émet un
 * vrai événement `scroll`, donc traverse le VRAI `onScroll` du composant — c'est
 * le seul chemin que react-native-web câble au DOM. Écrire dans un état React à
 * la place testerait le harnais, pas l'app : c'est la règle « vérifier le
 * résultat, pas la mécanique ».
 *
 * ⚠️ L'ordre année → mois → jour n'est pas cosmétique : changer de mois RAMÈNE le
 * jour dans le mois (31 janvier → 28 février). Poser le jour en dernier évite de
 * le faire clamper par les colonnes suivantes.
 *
 * ⚠️ Et on attend plus que le délai de pose du composant (120 ms) avant de
 * valider — sinon la dernière colonne n'a pas encore été prise en compte, et la
 * date validée est celle d'avant. Panne silencieuse : le parcours continue.
 */
export async function choisirDateNaissance(page, birth) {
  const ligne = page.getByText('À renseigner', { exact: true }).first();
  if (!(await ligne.isVisible({ timeout: 3000 }).catch(() => false))) {
    await panne(page, 'date-naissance-ligne', 'la ligne « À renseigner » de la date de naissance est introuvable à l\'étape 2');
    return false;
  }
  await ligne.click().catch(() => {});
  await sleep(500);

  const anneeCourante = new Date().getFullYear();
  const cibles = [
    ['wheel-annee', anneeCourante - Number(birth.y)],
    ['wheel-mois', Number(birth.m) - 1],
    ['wheel-jour', Number(birth.d) - 1],
  ];
  for (const [id, index] of cibles) {
    const ok = await page.evaluate(([tid, i]) => {
      const noeud = document.querySelector(`[data-testid="${tid}"]`);
      if (!noeud) return false;
      // Le nœud porteur du testID n'est pas forcément celui qui défile : on prend
      // le premier de la chaîne (lui ou un descendant) qui déborde vraiment.
      const scrollable = [noeud, ...noeud.querySelectorAll('*')]
        .find((n) => n.scrollHeight > n.clientHeight + 1);
      if (!scrollable) return false;
      scrollable.scrollTop = i * 44;
      scrollable.dispatchEvent(new Event('scroll', { bubbles: true }));
      return true;
    }, [id, index]).catch(() => false);
    if (!ok) {
      await panne(page, `date-naissance-${id}`, `colonne ${id} introuvable ou non défilante dans la roulette`);
      return false;
    }
    await sleep(300); // > POSE_MS (120) : le composant doit avoir eu le temps de commettre
  }

  await tapPrimary(page, 'Valider');
  // Preuve : la ligne ne dit plus « À renseigner ». Sans ce contrôle, une roulette
  // qui ne commet rien passerait pour un succès — exactement la panne que ce
  // fichier existe pour rendre visible.
  if (await page.getByText('À renseigner', { exact: true }).first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await panne(page, 'date-naissance-validee', '« Valider » n\'a rien enregistré : la ligne dit toujours « À renseigner »');
    return false;
  }
  return true;
}

/**
 * Attend que l'étape 1 de l'assistant soit à l'écran. Rend `false` sans rien casser
 * quand elle ne vient pas — c'est le cas légitime d'une session déjà onboardée.
 *
 * ⚠️ Son délai remplace celui que portait l'écran d'avertissement supprimé le
 * 2026-08-12 : sans lui, un script conclurait « déjà onboardé » sur une page qui
 * n'a simplement pas fini de monter.
 */
export const attendreEtape1 = (page, maxMs = 5000) =>
  page.getByText('Ton prénom', { exact: false }).first()
    .isVisible({ timeout: maxMs }).catch(() => false);

/** Attend que le plan soit PERSISTÉ (la génération suit l'onboarding d'une poignée de secondes). */
export async function attendrePlan(page, maxMs = 15000) {
  const debut = Date.now();
  do {
    const n = await plannedMeals(page);
    if (n > 0) return n;
    await sleep(500);
  } while (Date.now() - debut < maxMs);
  return 0;
}

// Sous-titre unique par objectif — source : `sub` dans GOAL_CONFIG (lib/tdee.ts),
// depuis le 2026-08-25. Les phrases vivaient dans onboarding.tsx ; elles ont déménagé
// le jour où Profil → Objectif a voulu les mêmes. `harnaisEcrans.test.ts` recolle
// cette table sur la source à chaque exécution.
// (« cut_aggressive » a été retiré du catalogue d'objectifs, il n'est plus listé.)
export const GOAL_SUB = {
  cut: 'Perdre du gras en gardant le muscle',
  recomp: 'Affiner et prendre du muscle en parallèle',
  maintain: 'Stabiliser poids et composition',
  lean_bulk: 'Prendre du muscle avec un surplus propre',
  bulk: 'Prendre du poids sans brider le surplus',
};

/**
 * Joue l'onboarding complet — 7 étapes (TOTAL_STEPS, app/(auth)/onboarding.tsx).
 * Les vieux scripts en jouaient 10 : l'étape « récap » a été supprimée le
 * 2026-06-20 et macros/préférences/variété ont fusionné en une seule étape.
 *
 * ⚠️ L'étape 2 ne demande plus un ÂGE mais une DATE DE NAISSANCE, depuis le
 * 2026-08-02 : trois champs Jour / Mois / Année (components/BirthDateField.tsx,
 * placeholders « 2 », « 8 », « 1994 »). Le harnais remplissait encore un champ
 * d'âge (placeholder « 25 ») qui n'existe plus — `basicsValid` restait faux et le
 * parcours ne dépassait JAMAIS l'étape 2, sans un mot dans la sortie.
 *
 * Chaque « Continuer » exige désormais une preuve d'avancement (`etapeCourante`) :
 * un champ qui disparaîtra à son tour fera du bruit au lieu de faire du vide.
 *
 * Rend `{ ok, etape, repas }` — `etape` = celle où ça a coincé quand `ok` est faux.
 */
export async function runOnboarding(page, p = DEFAULT_PERSONA) {
  if (!p.birth) {
    await panne(page, 'onboarding-persona', `le persona « ${p.name ?? '?'} » ne porte pas de date de naissance (birth: { d, m, y }) — le champ « âge » a disparu de l'étape 2 le 2026-08-02`);
    return { ok: false, etape: 2, repas: 0 };
  }
  const depart = await etapeCourante(page);
  if (depart !== 1) {
    await panne(page, 'onboarding-depart', `l'assistant n'est pas à l'étape 1 (lu : ${depart ?? 'hors assistant'}) — le dépistage santé a-t-il été franchi ?`);
    return { ok: false, etape: depart ?? 0, repas: 0 };
  }

  /** Tape « Continuer » et EXIGE que l'assistant ait avancé d'une étape. */
  const suivant = async (depuis) => {
    await tapPrimary(page);
    const arrivee = await etapeCourante(page);
    if (arrivee === depuis + 1) return true;
    // L'écran affiche LUI-MÊME pourquoi il refuse (`blockReason`, onboarding.tsx
    // L182) : `apercu` le ramasse dans la capture de `panne`.
    await panne(page, `onboarding-etape-${depuis}`, `l'assistant n'a pas quitté l'étape ${depuis} (lu : ${arrivee ?? 'hors assistant'})`);
    return false;
  };

  // 1 — prénom
  // ⚠️ Le placeholder vaut « Ton prénom » depuis le 2026-08-12 — il valait « Kévin ».
  // Il est donc IDENTIQUE au libellé du champ, ce qui ne gêne pas `fillPh`
  // (`getByPlaceholder` lit l'attribut, jamais le texte à l'écran) mais interdit de
  // basculer ce remplissage sur `getByText` : il attraperait le libellé.
  await fillPh(page, 'Ton prénom', p.name);
  await sleep(300);
  if (!(await suivant(1))) return { ok: false, etape: 1, repas: 0 };

  // 2 — sexe + infos de base (date de naissance, poids, taille)
  if (p.sex === 'female') { await tap(page, 'Femme', { exact: true }); await sleep(250); }
  if (!(await choisirDateNaissance(page, p.birth))) return { ok: false, etape: 2, repas: 0 };
  await fillPh(page, '80', p.weight);
  await fillPh(page, '178', p.height);
  await sleep(400);
  if (!(await suivant(2))) return { ok: false, etape: 2, repas: 0 };

  // 3 — masse grasse (saisie % directe plutôt que la silhouette)
  await fillPh(page, 'ex. 18', p.bodyFat);
  await sleep(300);
  if (!(await suivant(3))) return { ok: false, etape: 3, repas: 0 };

  // 4 — activité : DEUX réponses exigées depuis le 2026-08-19. Les journées hors
  // sport (NEAT) d'abord — sans elle, « Continuer » ne fait plus rien et le script
  // s'arrêterait ici en accusant l'étape 5. On tape le cran `desk`, qui était la
  // valeur servie par défaut avant que la question soit posée : les calories
  // attendues par les scripts en aval ne bougent donc pas d'un iota.
  await tap(page, 'Assis la majeure partie de la journée');
  await sleep(300);
  await tap(page, 'Je ne fais pas de sport');
  await sleep(300);
  if (!(await suivant(4))) return { ok: false, etape: 4, repas: 0 };

  // 5 — objectif
  await tap(page, GOAL_SUB[p.goal]);
  await sleep(300);
  if (!(await suivant(5))) return { ok: false, etape: 5, repas: 0 };

  // 6 — préférences / protéines / variété → défauts
  if (!(await suivant(6))) return { ok: false, etape: 6, repas: 0 };

  // 7 — jours de plan (AUCUN coché par défaut → obligatoire) ; repas déjà tous cochés
  for (const d of p.days ?? ['Lun', 'Mer', 'Ven']) {
    await tap(page, d, { exact: true });
    await sleep(200);
  }
  await sleep(300);
  await tapPrimary(page, 'Générer mon plan');

  // Le plan est généré à l'arrivée sur l'onglet Plan : on ATTEND la preuve
  // persistée plutôt que de dormir un nombre de secondes tiré au jugé.
  const repas = await attendrePlan(page);
  if (!repas) {
    await panne(page, 'onboarding-plan', 'les 7 étapes sont passées mais aucun plan n\'a été persisté (@kyroz:plan)');
    return { ok: false, etape: 7, repas: 0 };
  }

  // ⚠️ L'étape 5 (objectif) et l'étape 6 (préférences) sont les SEULES que l'app
  // ne valide pas : `canProceed` les laisse toujours passer. Un sous-titre de
  // GOAL_SUB devenu faux ne bloquerait donc rien — le persona recevrait l'objectif
  // par défaut (« cut ») et le rapport parlerait d'un profil qu'on n'a pas demandé.
  // C'est le dernier chemin muet du parcours : on le vérifie sur ce qui est SERVI.
  const servi = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('@kyroz:profile')).goal; } catch { return null; }
  }).catch(() => null);
  if (servi !== p.goal) {
    await panne(page, 'onboarding-objectif', `objectif demandé « ${p.goal} », objectif servi « ${servi ?? 'aucun' } » — le sous-titre de GOAL_SUB ne correspond plus à l'écran`);
    return { ok: false, etape: 5, repas };
  }
  return { ok: true, etape: 7, repas };
}

/**
 * Ferme une feuille modale (components/Sheet.tsx).
 *
 * Les sous-écrans du Profil (« Informations », « Objectif », …) sont des Sheet et
 * NON des routes : `page.goBack()` ne les ferme pas — les vieux scripts restaient
 * bloqués sur la première feuille ouverte et déclaraient tout le reste
 * « introuvable ». On clique le fond, seul affordance de fermeture non destructive
 * (le bouton « Enregistrer », lui, écrirait dans le profil).
 * La feuille occupe 94 % de la hauteur : le fond n'est cliquable qu'en haut.
 */
export async function closeSheet(page) {
  await page.mouse.click(PHONE.width / 2, 16).catch(() => {});
  await sleep(700);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(600);
}

/** Va sur l'onglet Profil et remonte la liste en haut. */
export async function goToProfil(page) {
  await tap(page, 'Profil', { which: 'last', timeout: 3000 });
  await sleep(1400);
  await page.mouse.wheel(0, -3000);
  await sleep(600);
}

/** Reveal du 1er plan (components/FirstPlanReveal.tsx) — masque l'écran Plan. */
export async function dismissReveal(page) {
  if (await tap(page, 'Voir mon plan', { which: 'last', timeout: 4000 })) {
    await sleep(1500);
    return true;
  }
  return false;
}

/**
 * Persona par défaut : profil qui passe le plancher de sécurité sans drapeau.
 *
 * ⚠️ `birth` (jour / mois / année) et NON `age` : l'étape 2 saisit une date de
 * naissance depuis le 2026-08-02, et l'âge en est DÉRIVÉ (lib/birthday.ts).
 * Garder un champ `age` ici serait une seconde source de vérité qui ne remplit
 * plus rien à l'écran. Né le 02/08/1998 → 28 ans au 2026-08-05.
 */
export const DEFAULT_PERSONA = {
  name: 'Marc', sex: 'male', birth: { d: 2, m: 8, y: 1998 }, weight: 82, height: 180, bodyFat: 12, goal: 'cut',
};

/**
 * Nombre de repas dans le plan PERSISTÉ (@kyroz:plan), 0 si aucun plan.
 *
 * C'est la seule preuve non ambiguë que le parcours a abouti : chercher le mot
 * « Plan » à l'écran ne prouve rien — `getByText` est insensible à la casse, donc
 * le bouton « Générer mon plan » de l'onboarding le satisfait aussi.
 */
export const plannedMeals = (page) => page.evaluate(() => {
  const raw = localStorage.getItem('@kyroz:plan');
  try { return raw ? (JSON.parse(raw).meals?.length ?? 0) : 0; } catch { return 0; }
}).catch(() => 0);

/**
 * Amène la page jusqu'à l'écran Plan, sans intervention humaine :
 * invité → dépistage → onboarding → reveal. Idempotent : si la session est déjà
 * onboardée (storageState réutilisé), chaque étape se saute d'elle-même.
 * Renvoie true si un plan a réellement été généré.
 *
 * Chaque marche qui casse est NOMMÉE (cf. `panne`) : un `false` muet renvoyait
 * les scripts vers le seul diagnostic qui soit à la fois faux et rassurant —
 * « écran introuvable ».
 */
export async function bootToPlan(page, persona = DEFAULT_PERSONA) {
  if (!(await guestLogin(page))) {
    await panne(page, 'connexion-invite', 'connexion invité refusée — 429 Supabase (plafond par heure et par IP) ou provider anonyme coupé');
    return false;
  }

  // L'assistant suit directement la connexion depuis le 2026-08-12 (plus d'écran
  // d'avertissement à franchir).
  // ⚠️ ATTENDRE, pas sonder une fois : l'assistant met une poignée de centaines de
  // millisecondes à monter, et une sonde instantanée rendrait `null` — donc « session
  // déjà onboardée », donc onboarding sauté EN SILENCE. C'est exactement la panne que
  // ce fichier existe pour rendre impossible. L'écran d'avant absorbait ce délai avec
  // son `isVisible({ timeout: 5000 })`.
  if ((await attendreEtape1(page)) || (await etapeCourante(page)) === 1) {
    if (!(await runOnboarding(page, persona)).ok) return false;
  }

  await dismissReveal(page);
  await dismissOverlays(page);
  const repas = await plannedMeals(page);
  if (!repas) {
    await panne(page, 'ecran-plan', 'aucun plan persisté (@kyroz:plan) — l\'écran Plan n\'a pas été atteint');
    return false;
  }
  return true;
}
