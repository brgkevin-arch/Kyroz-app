// ── VERROU : les libellés du harnais Playwright ↔ les écrans réels ───────────
//
// POURQUOI CE FICHIER EXISTE
//
// `test/_harness.mjs` pilote l'app par ce qu'elle AFFICHE : un placeholder, un
// sous-titre d'objectif, le nom d'un onglet. Ces textes vivent dans les écrans, et
// rien n'obligeait personne à prévenir le harnais en les changeant. Il a donc pourri
// deux fois pour la même raison :
//
//   · juin-juillet 2026 — l'onboarding passe de 10 à 7 étapes, le portail de
//     dépistage santé s'intercale : les 7 scripts cassent d'un coup ;
//   · 2026-08-05 — l'attestation du dépistage n'est plus rendue qu'après les deux
//     réponses, et le champ « âge » devient une date de naissance : les 5 scripts
//     s'arrêtent au portail, aucun n'atteint plus l'écran Plan.
//
// Les deux fois, la panne a dormi des JOURS. Elle ne pouvait se voir qu'en lançant
// un navigateur contre un serveur web — donc jamais dans `npm test`, jamais dans un
// diff. Et quand elle se voyait enfin, elle mentait : « écran introuvable » accuse
// les écrans alors que le parcours n'y est jamais arrivé.
//
// Ce test ferme ça. Il ne lance NI navigateur NI serveur : il lit les fichiers du
// dépôt. Renommer un libellé dans un écran fait rougir `npm test` le jour même,
// avec le nom du script qui va casser.
//
// ⚠️ CE QU'IL NE SAIT PAS FAIRE : dire que le PARCOURS est encore juste. Un libellé
// peut exister et l'enchaînement avoir changé (c'est exactement le défaut du
// 2026-08-05 : « Je confirme… » existait toujours, mais il fallait répondre aux
// questions AVANT). La preuve du parcours reste une passe Playwright — cf.
// `test/README.md`. Ce test ferme le chemin par lequel la dérive est réellement
// arrivée : un texte changé d'un côté sans l'autre.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

const HARNAIS = 'test/_harness.mjs';

/**
 * Comparaison INSENSIBLE À LA CASSE, comme `getByText(txt, { exact: false })` de
 * Playwright. Ce n'est pas un confort : la carte de suivi du poids rend
 * « SUIVI DU POIDS » en capitales et le script cherche « Suivi du poids ». Comparer
 * strictement ferait rougir un test alors que le script, lui, trouve bien la cible.
 */
const contient = (src: string, txt: string) => src.toLowerCase().includes(txt.toLowerCase());

/**
 * Une ancre = un texte que les scripts cherchent À L'ÉCRAN.
 *
 * `dans` est l'écran qui doit le rendre, `script` celui qui le cherche (par défaut
 * le harnais partagé). Les deux côtés sont vérifiés : un libellé retiré de l'app
 * rougit, et un libellé retiré du script rougit aussi — sinon cette table
 * deviendrait à son tour une troisième vérité que plus personne ne lit.
 */
type Ancre = {
  quoi: string;
  /** Le texte tel qu'il s'affiche — c'est lui qui nomme le cas dans la sortie. */
  texte: string;
  dans: string;
  /** Motif attendu dans l'ÉCRAN quand le texte n'y est pas littéral (`label: 'Femme'`). */
  motif?: string;
  /** Motif attendu dans le SCRIPT quand il ne cherche pas le texte littéral. */
  cherche?: string;
  script?: string;
};

const ANCRES: Ancre[] = [
  // ── Connexion invité (guestLogin) ──
  { quoi: 'bouton de connexion invité', texte: 'Continuer en invité', dans: 'app/(auth)/login.tsx' },
  { quoi: 'testID du bouton invité', texte: 'guest-login', dans: 'app/(auth)/login.tsx' },
  { quoi: 'champ e-mail (preuve « toujours sur le login »)', texte: 'toi@email.com', dans: 'app/(auth)/login.tsx' },
  { quoi: 'champ mot de passe (QA écran de login)', texte: '6 caractères minimum', dans: 'app/(auth)/login.tsx', script: 'test/qa-full.mjs' },

  // ── Portail de dépistage santé (passScreening) ──
  { quoi: 'question du portail', texte: 'Es-tu concerné·e', dans: 'components/HealthScreening.tsx' },
  { quoi: 'réponse « Non » de chaque condition', texte: 'Non', motif: "label: 'Non'", cherche: "getByText('Non'", dans: 'components/HealthScreening.tsx' },
  { quoi: 'attestation (rendue APRÈS les réponses)', texte: 'Je confirme être un adulte', dans: 'components/HealthScreening.tsx' },

  // ── Assistant d'onboarding (runOnboarding) ──
  { quoi: 'repère de l\'étape 1', texte: 'Ton prénom', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'compteur d\'étapes lu par etapeCourante', texte: 'ÉTAPE n / 6', motif: 'ÉTAPE {step - 1} / {TOTAL_STEPS - 1}', cherche: '[ÉE]TAPE', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'sexe féminin (seule branche des personas F)', texte: 'Femme', motif: "label: 'Femme'", dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'activité — au moins un choix exigé', texte: 'Je ne fais pas de sport', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'bouton final de l\'étape 7', texte: 'Générer mon plan', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'bouton d\'avancement', texte: 'Continuer', dans: 'app/(auth)/onboarding.tsx' },

  // ── Arrivée sur le plan ──
  { quoi: 'reveal du 1er plan', texte: 'Voir mon plan', dans: 'components/FirstPlanReveal.tsx' },
  { quoi: 'sortie de la visite guidée', texte: 'Passer', dans: 'components/GuidedTour.tsx' },
  { quoi: 'refus du consentement analytics', texte: 'Non merci', dans: 'components/AnalyticsConsentBanner.tsx' },

  // ── Sous-écrans du Profil (qa-deep / qa-settings) ──
  { quoi: 'carte de suivi du poids', texte: 'Suivi du poids', dans: 'components/WeightSummaryCard.tsx', script: 'test/qa-deep.mjs' },
  { quoi: 'enregistrement d\'une pesée', texte: 'Enregistrer', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-deep.mjs' },
  { quoi: 'sous-écran Informations', texte: 'Informations', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-deep.mjs' },
  { quoi: 'sous-écran Sport & activité', texte: 'Sport & activité', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-settings.mjs' },
  { quoi: 'sous-écran Objectif', texte: 'Objectif', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-settings.mjs' },
  { quoi: 'sous-écran Objectif daté', texte: 'Objectif daté', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-deep.mjs' },
  { quoi: 'sous-écran Calories & macros', texte: 'Calories & macros', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-settings.mjs' },
  { quoi: 'sous-écran Préférences alimentaires', texte: 'Préférences alimentaires', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-settings.mjs' },
  { quoi: 'sous-écran Paramètres des repas', texte: 'Paramètres des repas', dans: 'app/(tabs)/profil.tsx', script: 'test/qa-settings.mjs' },
];

/**
 * Placeholders : un champ se remplit par son placeholder EXACT (`fillPh`), pas par
 * son libellé. C'est ce qui a cassé le 2026-08-02 — le champ d'âge (« 25 ») est
 * devenu trois champs de date, et le harnais a continué de viser le champ disparu.
 */
const PLACEHOLDERS: { quoi: string; valeur: string; dans: string }[] = [
  { quoi: 'prénom (étape 1)', valeur: 'Kévin', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'jour de naissance (étape 2)', valeur: '2', dans: 'components/BirthDateField.tsx' },
  { quoi: 'mois de naissance (étape 2)', valeur: '8', dans: 'components/BirthDateField.tsx' },
  { quoi: 'année de naissance (étape 2)', valeur: '1994', dans: 'components/BirthDateField.tsx' },
  { quoi: 'poids (étape 2)', valeur: '80', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'taille (étape 2)', valeur: '178', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'masse grasse (étape 3)', valeur: 'ex. 18', dans: 'components/BodyFatPicker.tsx' },
];

/**
 * Clés AsyncStorage lues ou écrites par le harnais. Un renommage ici ne casse rien
 * de VISIBLE : la visite guidée réapparaît simplement et intercepte tous les clics
 * — la panne se présente alors comme « écran introuvable », le pire des diagnostics.
 */
const CLES: { quoi: string; cle: string; dans: string }[] = [
  { quoi: 'plan persisté (seule preuve d\'un parcours abouti)', cle: '@kyroz:plan', dans: 'app/(tabs)/plan.tsx' },
  { quoi: 'profil persisté (objectif servi, TDEE, macros)', cle: '@kyroz:profile', dans: 'hooks/useProfile.ts' },
  { quoi: 'consentement analytics (posé à « denied »)', cle: '@kyroz:analyticsConsent', dans: 'lib/analytics.ts' },
  { quoi: 'préfixe des visites guidées', cle: '@kyroz:tour:', dans: 'components/GuidedTour.tsx' },
];

describe('harnais Playwright — les libellés cherchés existent encore', () => {
  it.each(ANCRES)('« $texte » — $quoi', ({ texte, dans, motif, cherche, script }) => {
    const fichierScript = script ?? HARNAIS;
    expect(
      contient(lire(dans), motif ?? texte),
      `${dans} ne rend plus « ${texte} » → ${fichierScript} cliquera dans le vide et le rapport dira « introuvable »`,
    ).toBe(true);
    expect(
      contient(lire(fichierScript), cherche ?? texte),
      `${fichierScript} ne cherche plus « ${texte} » : mettre à jour cette table, elle ne doit pas devenir une vérité de plus`,
    ).toBe(true);
  });

  it.each(PLACEHOLDERS)('placeholder « $valeur » — $quoi', ({ valeur, dans }) => {
    expect(
      lire(dans).includes(`placeholder="${valeur}"`),
      `${dans} n'a plus de champ avec placeholder="${valeur}" → fillPh() ne remplira RIEN, en silence`,
    ).toBe(true);
    expect(
      lire(HARNAIS).includes(`'${valeur}'`),
      `${HARNAIS} ne vise plus le placeholder « ${valeur} » : mettre à jour cette table`,
    ).toBe(true);
  });

  it.each(CLES)('clé $cle — $quoi', ({ cle, dans }) => {
    expect(lire(dans).includes(cle), `${dans} n'emploie plus ${cle}`).toBe(true);
    expect(lire(HARNAIS).includes(cle), `${HARNAIS} n'emploie plus ${cle}`).toBe(true);
  });
});

describe('harnais Playwright — les tables recopiées suivent la source', () => {
  // GOAL_SUB sert à CLIQUER l'objectif. Cette étape est l'une des deux que l'app ne
  // valide pas : un sous-titre faux ne bloque rien, le persona repart avec
  // l'objectif par défaut et le rapport décrit un profil qu'on n'a pas demandé.
  it('GOAL_SUB reproduit exactement les sous-titres de GOALS', () => {
    const goals = Object.fromEntries(
      [...lire('app/(auth)/onboarding.tsx').matchAll(/\{\s*value:\s*'(\w+)',\s*sub:\s*'([^']+)'\s*\}/g)]
        .map((m) => [m[1], m[2]]),
    );
    const harnais = Object.fromEntries(
      [...lire(HARNAIS).matchAll(/^\s{2}(\w+):\s*'([^']+)',$/gm)].map((m) => [m[1], m[2]]),
    );
    expect(Object.keys(goals).length, 'GOALS introuvable dans onboarding.tsx').toBeGreaterThan(0);
    for (const [objectif, sous] of Object.entries(goals)) {
      expect(harnais[objectif], `objectif « ${objectif} » absent de GOAL_SUB (${HARNAIS})`).toBe(sous);
    }
  });

  it('TABS reproduit les onglets réellement montés, dans l\'ordre', () => {
    const montes = [...lire('app/(tabs)/_layout.tsx').matchAll(/title:\s*'([^']+)'/g)].map((m) => m[1]);
    const declares = /export const TABS = \[([^\]]+)\]/.exec(lire(HARNAIS))?.[1]
      .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
    expect(declares, `TABS introuvable dans ${HARNAIS}`).toEqual(montes);
  });

  // Le harnais joue TOTAL_STEPS - 1 « Continuer » puis « Générer mon plan ». Une
  // étape ajoutée à l'assistant le laisserait s'arrêter une marche trop tôt — et
  // comme la dernière étape est la seule validée, il partirait sans plan.
  it('runOnboarding joue exactement TOTAL_STEPS étapes', () => {
    const total = Number(/const TOTAL_STEPS = (\d+)/.exec(lire('app/(auth)/onboarding.tsx'))?.[1]);
    expect(total, 'TOTAL_STEPS introuvable dans onboarding.tsx').toBeGreaterThan(1);
    const harnais = lire(HARNAIS);
    expect(
      harnais.includes(`suivant(${total - 1})`),
      `l'assistant a ${total} étapes : ${HARNAIS} doit avancer jusqu'à suivant(${total - 1}) avant « Générer mon plan »`,
    ).toBe(true);
    expect(
      harnais.includes(`suivant(${total})`),
      `${HARNAIS} avance au-delà de la dernière étape (suivant(${total})) — la dernière se conclut par « Générer mon plan »`,
    ).toBe(false);
  });

  // Le portail ne rend son attestation qu'une fois TOUTES les conditions répondues :
  // c'est la règle qui a fait dormir la panne du 2026-08-05. Le harnais doit donc
  // cliquer AUTANT de « Non » qu'il y a de conditions — il les compte à l'écran
  // plutôt que d'en écrire le nombre, et ce test interdit le retour à un nombre figé.
  it('passScreening répond à toutes les conditions avant de chercher l\'attestation', () => {
    const harnais = lire(HARNAIS);
    const sequence = /export async function passScreening[\s\S]*?\n}/.exec(harnais)?.[0] ?? '';
    expect(sequence, 'passScreening introuvable').not.toBe('');
    const posNon = sequence.indexOf('getByText(\'Non\'');
    const posAttestation = sequence.indexOf('Je confirme être un adulte');
    expect(posNon, 'passScreening ne clique plus les réponses « Non »').toBeGreaterThan(-1);
    expect(
      posNon < posAttestation,
      'l\'attestation est cherchée AVANT les réponses : elle n\'est rendue qu\'une fois les deux questions répondues (HealthScreening.tsx, allAnswered)',
    ).toBe(true);
    expect(
      /const n = await nons\.count\(\)/.test(sequence),
      'le nombre de conditions doit être COMPTÉ à l\'écran, pas écrit en dur',
    ).toBe(true);
  });
});
