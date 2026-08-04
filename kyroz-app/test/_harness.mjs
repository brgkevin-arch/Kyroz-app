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
export const TABS = ['Plan', 'Courses', 'Frigo', 'Recettes', 'Profil'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function ensureDirs() {
  mkdirSync(VIDEO, { recursive: true });
  mkdirSync(SHOT, { recursive: true });
}

/**
 * Neutralise les surcouches de premier lancement AVANT que l'app ne les lise.
 *
 * Sans ça, l'arrivée sur le plan empile une visite guidée modale (« Passer /
 * Suivant », components/GuidedTour.tsx) et une carte de consentement analytics :
 * elles interceptent TOUS les clics, et un script se retrouve à déclarer chaque
 * écran « introuvable » alors qu'il n'a simplement jamais pu quitter le Plan.
 *
 * Le consentement est posé à « denied » : un robot ne consent pas à la télémétrie.
 */
export async function neutralizeFirstRun(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('@kyroz:tour:plan', 'done');
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

/**
 * Portail de dépistage santé (components/HealthScreening.tsx).
 * Il REMPLACE l'assistant tant qu'il n'est pas passé : sans lui, aucun script
 * d'onboarding ne voit jamais l'étape 1.
 */
export async function passScreening(page) {
  // ⚠️ L'attestation n'est PAS affichée à l'arrivée : l'écran ne la révèle
  // qu'une fois les deux questions répondues (`allAnswered`, cf. le ternaire de
  // components/HealthScreening.tsx). Cette fonction la cherchait d'emblée, ne la
  // trouvait donc jamais, et renvoyait `false` — ce qui faisait sauter TOUT
  // l'onboarding en silence. Constaté le 2026-08-05 : le script de captures
  // annonçait « plan non généré », puis écrasait quand même les PNG du store.
  const questions = page.getByText('Es-tu concerné·e', { exact: false }).first();
  if (!(await questions.isVisible({ timeout: 4000 }).catch(() => false))) return false;

  // « Non » est une réponse à DONNER : il y en a une par question, et le bouton
  // reste désactivé tant qu'il en manque une.
  const nons = page.getByText('Non', { exact: true });
  const combien = await nons.count();
  for (let i = 0; i < combien; i++) {
    await nons.nth(i).click().catch(() => {});
    await sleep(250);
  }

  const attest = page.getByText('Je confirme être un adulte en bonne santé', { exact: false }).first();
  if (!(await attest.isVisible({ timeout: 3000 }).catch(() => false))) return false;
  await attest.click().catch(() => {});
  await sleep(400);
  await tapPrimary(page, 'Continuer');
  return true;
}

// Sous-titre unique par objectif — source : GOALS dans app/(auth)/onboarding.tsx.
// (« cut_aggressive » a été retiré du catalogue d'objectifs, il n'est plus listé.)
export const GOAL_SUB = {
  cut: 'Perdre du gras en gardant le muscle',
  recomp: 'Affiner et prendre du muscle en parallèle',
  maintain: 'Stabiliser poids et composition',
  lean_bulk: 'Prendre du muscle avec un surplus propre',
  bulk: 'Maximiser la prise de masse',
};

/**
 * Joue l'onboarding complet — 7 étapes (TOTAL_STEPS, app/(auth)/onboarding.tsx).
 * Les vieux scripts en jouaient 10 : l'étape « récap » a été supprimée le
 * 2026-06-20 et macros/préférences/variété ont fusionné en une seule étape.
 */
export async function runOnboarding(page, p) {
  // 1 — prénom
  await fillPh(page, 'Kévin', p.name);
  await sleep(250);
  await tapPrimary(page);

  // 2 — sexe + infos de base
  if (p.sex === 'female') { await tap(page, 'Femme', { exact: true }); await sleep(250); }
  // ⚠️ L'âge ne se SAISIT plus : c'est une date de naissance en trois champs
  // (components/BirthDateField.tsx), dont l'âge est dérivé. Ce script remplissait
  // encore un champ « 25 » qui n'existe plus ; « Continuer » restait donc
  // désactivé et TOUT l'onboarding s'arrêtait à l'étape 1, en silence.
  const [jour, mois, annee] = p.birth ?? [15, 3, 1998];
  await fillPh(page, '2', jour);
  await fillPh(page, '8', mois);
  await fillPh(page, '1994', annee);
  await fillPh(page, '80', p.weight);
  await fillPh(page, '178', p.height);
  await sleep(250);
  await tapPrimary(page);

  // 3 — masse grasse (saisie % directe plutôt que la silhouette)
  await fillPh(page, 'ex. 18', p.bodyFat);
  await sleep(250);
  await tapPrimary(page);

  // 4 — activité : « Je ne fais pas de sport » (au moins un choix est exigé)
  await tap(page, 'Je ne fais pas de sport');
  await sleep(250);
  await tapPrimary(page);

  // 5 — objectif
  await tap(page, GOAL_SUB[p.goal]);
  await sleep(250);
  await tapPrimary(page);

  // 6 — préférences / protéines / variété → défauts
  await tapPrimary(page);

  // 7 — jours de plan (AUCUN coché par défaut → obligatoire) ; repas déjà tous cochés
  for (const d of p.days ?? ['Lun', 'Mer', 'Ven']) {
    await tap(page, d, { exact: true });
    await sleep(150);
  }
  await sleep(250);
  await tapPrimary(page, 'Générer mon plan');
  await sleep(3500);
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

/** Persona par défaut : profil qui passe le plancher de sécurité sans drapeau. */
export const DEFAULT_PERSONA = {
  name: 'Marc', sex: 'male', age: 28, weight: 82, height: 180, bodyFat: 12, goal: 'cut',
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
 */
export async function bootToPlan(page, persona = DEFAULT_PERSONA) {
  await guestLogin(page);
  if (await passScreening(page)) await runOnboarding(page, persona);
  await dismissReveal(page);
  await dismissOverlays(page);
  return (await plannedMeals(page)) > 0;
}
