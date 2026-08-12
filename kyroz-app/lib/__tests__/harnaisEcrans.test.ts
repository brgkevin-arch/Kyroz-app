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
import { TOURS } from '../tours';

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

// Retire blocs `/* */` et lignes `//` avant de chercher une chaîne dans du code.
// Même remède qu'`emailConfirmation.test.ts` : sans ça, une note qui CITE un libellé
// se porte garante de son existence (ou de sa disparition).
const sansCommentairesJS = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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

  // ── Écran d'avertissement santé : PLUS D'ANCRES, PARCE QU'IL N'Y A PLUS D'ÉCRAN ──
  // Cinq ancres ont vécu ici. Trois sont parties le 2026-08-11 (E39, l'écran cesse de
  // poser des questions), les deux dernières — « Avant de commencer » et « J'ai
  // compris » — le 2026-08-12 avec l'écran lui-même. Les scripts ne franchissent donc
  // plus rien entre la connexion et l'étape 1.
  // ⚠️ Ne pas les « remettre au cas où » : une ancre qui désigne un écran supprimé
  // rougit pour de bonnes raisons le jour où on la lit, et pour de mauvaises tous les
  // autres jours. Ce que l'écran portait est gardé ailleurs, par
  // `lib/__tests__/avertissementMedical.test.ts`.

  // ── Assistant d'onboarding (runOnboarding) ──
  { quoi: 'repère de l\'étape 1', texte: 'Ton prénom', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'compteur d\'étapes lu par etapeCourante', texte: 'ÉTAPE n / 6', motif: 'ÉTAPE {step - 1} / {TOTAL_STEPS - 1}', cherche: '[ÉE]TAPE', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'sexe féminin (seule branche des personas F)', texte: 'Femme', motif: "label: 'Femme'", dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'activité — au moins un choix exigé', texte: 'Je ne fais pas de sport', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'bouton final de l\'étape 7', texte: 'Générer mon plan', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'bouton d\'avancement', texte: 'Continuer', dans: 'app/(auth)/onboarding.tsx' },

  // ⚠️ Le consentement analytics a CHANGÉ DE PLACE le 2026-08-10 : il ne s'affiche
  // plus sur l'écran Plan mais AVANT l'assistant, entre le portail de dépistage et
  // l'étape 1. Le harnais le neutralise en amont (`neutralizeFirstRun` pose
  // `@kyroz:analyticsConsent = 'denied'`), donc l'écran ne surgit jamais pendant un
  // parcours scripté ; « Non merci » reste le filet de `dismissOverlays`.
  { quoi: 'refus du consentement analytics', texte: 'Non merci', dans: 'components/AnalyticsConsentStep.tsx' },

  // ── Arrivée sur le plan ──
  { quoi: 'reveal du 1er plan', texte: 'Voir mon plan', dans: 'components/FirstPlanReveal.tsx' },
  { quoi: 'sortie de la visite guidée', texte: 'Passer', dans: 'components/GuidedTour.tsx' },

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
 *
 * `via` = le composant qui rend l'attribut, quand la valeur est DÉCIDÉE ailleurs et
 * passée en propriété. Cas des trois champs de date depuis le 2026-08-07 : leur
 * mécanique vit dans `DateInput`, leurs exemples restent choisis par l'écran qui
 * s'en sert. Le DOM porte le même attribut qu'avant, mais la chaîne a DEUX bouts —
 * et il faut vérifier les deux, sinon elle peut se rompre au milieu sans rougir.
 *
 * ⚠️ `cle` désigne le champ PRÉCIS, et ce n'est pas du zèle : une première version
 * cherchait seulement « un placeholder transmis quelque part » dans `DateInput`.
 * Vérifiée par mutation, elle laissait passer la suppression du placeholder du champ
 * *Jour* — les deux autres suffisaient à la satisfaire. Un verrou qui accepte
 * n'importe lequel des trois maillons ne garde aucun des trois.
 */
const champDate = (cle: 'd' | 'mo' | 'y') => ({ fichier: 'components/DateInput.tsx', cle });
type Via = { fichier: string; cle: string };
const PLACEHOLDERS: { quoi: string; valeur: string; dans: string; via?: Via }[] = [
  { quoi: 'prénom (étape 1)', valeur: 'Kévin', dans: 'app/(auth)/onboarding.tsx' },
  { quoi: 'jour de naissance (étape 2)', valeur: '2', dans: 'components/BirthDateField.tsx', via: champDate('d') },
  { quoi: 'mois de naissance (étape 2)', valeur: '8', dans: 'components/BirthDateField.tsx', via: champDate('mo') },
  { quoi: 'année de naissance (étape 2)', valeur: '1994', dans: 'components/BirthDateField.tsx', via: champDate('y') },
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

describe('harnais Playwright — il neutralise TOUS les tours, pas seulement le premier', () => {
  // ⚠️ Ce test est né d'un manque REL, pas d'une précaution. `neutralizeFirstRun`
  // ne posait que `@kyroz:tour:plan` — écrit à l'époque où il n'existait qu'un
  // tour. Le tutoriel est passé à CINQ le 2026-08-08 (E20) sans que cette ligne
  // bouge : les quatre autres se seraient armés à la première visite de LEUR
  // onglet, au milieu d'un parcours. Un tour est une `Modal` dont les panneaux
  // avalent les taps, donc le script aurait rendu « écran introuvable » — en
  // accusant l'écran alors qu'il n'avait pas pu quitter le précédent.
  //
  // La liste du harnais est une COPIE (c'est du `.mjs`, il ne peut pas importer
  // `lib/tours.ts`). Une copie que personne ne relit est une seconde source de
  // vérité qui attend son bug (§10) — ce test est ce qui la relit.
  const harnais = readFileSync(join(RACINE, HARNAIS), 'utf8');

  it.each(TOURS.map((t) => t.id))('le tour « %s » est neutralisé avant le premier rendu', (id) => {
    expect(
      harnais.includes(`'${id}'`) || harnais.includes(`@kyroz:tour:${id}`),
      `\`${HARNAIS}\` n'éteint pas le tour « ${id} » : il s'armera au milieu d'un parcours et avalera les taps.`,
    ).toBe(true);
  });

  it('n\'éteint aucun tour qui n\'existe plus', () => {
    // Le sens inverse : un id resté dans le harnais après la suppression d'un
    // tour est du bruit qui survivra à sa raison d'être.
    const connus = new Set(TOURS.map((t) => t.id as string));
    const bloc = harnais.match(/for \(const id of \[([^\]]+)\]\)/)?.[1] ?? '';
    const cites = [...bloc.matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
    expect(cites.filter((id) => !connus.has(id))).toEqual([]);
    // Et la boucle doit bien exister : sans elle, le test ci-dessus passerait sur
    // n'importe quelle occurrence du mot dans le fichier.
    expect(cites.length, 'la boucle de neutralisation des tours a disparu du harnais').toBe(TOURS.length);
  });
});

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

  it.each(PLACEHOLDERS)('placeholder « $valeur » — $quoi', ({ valeur, dans, via }) => {
    // Écrit sur le champ (`placeholder="80"`), ou décidé dans un écran et transmis à un
    // composant de saisie (`placeholders={{ y: '1994' }}` → `DateInput`). Les deux
    // rendent le même attribut dans le DOM ; la seconde forme exige donc les DEUX bouts,
    // et pour LE champ concerné : l'exemple là où il est choisi, et son passage effectif
    // là où ce champ-là est rendu.
    const direct = lire(dans).includes(`placeholder="${valeur}"`);
    const transmis = !!via
      && lire(dans).includes(`${via.cle}: '${valeur}'`)
      && lire(via.fichier).includes(`placeholder={placeholders?.${via.cle}}`);
    expect(
      direct || transmis,
      via
        ? `${dans} ne choisit plus « ${via.cle}: '${valeur}' », ou ${via.fichier} ne le passe plus à ce champ → fillPh() ne remplira RIEN, en silence`
        : `${dans} n'a plus de champ avec placeholder="${valeur}" → fillPh() ne remplira RIEN, en silence`,
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

  // 🔴 CE TEST A CHANGÉ DE CIBLE DEUX FOIS, IL N'A JAMAIS ÉTÉ SUPPRIMÉ — et c'est
  // le point. Version 1 : `passScreening` devait cliquer un « Non » par condition
  // avant de chercher l'attestation (la règle née de la panne du 2026-08-05).
  // Version 2 (E39) : l'écran ne pose plus de question, il devait le franchir par
  // son bouton unique. Version 3 (2026-08-12) : l'écran n'existe plus du tout.
  //
  // Le RISQUE, lui, n'a pas bougé d'un pouce à travers les trois : un harnais qui
  // vise un libellé disparu rend « écran introuvable » et accuse la CIBLE au lieu du
  // PARCOURS. Ce qu'il faut donc vérifier aujourd'hui, c'est qu'aucun reste de cet
  // écran ne traîne dans le harnais, et que ce qui absorbait son délai de montage a
  // bien été remplacé — sinon l'onboarding se saute en silence sur une page lente.
  it('le harnais ne cherche plus l\'écran d\'avertissement supprimé', () => {
    // 🔴 LES COMMENTAIRES SE RETIRENT AVANT TOUTE RECHERCHE DE CHAÎNE, et ce test en
    // est la démonstration : la note du harnais qui explique le retrait CITE
    // « Avant de commencer », donc une version naïve s'accuserait elle-même. C'est le
    // défaut d'A30 rejoué — le commentaire se porte garant de ce qu'il décrit — ici
    // dans le sens alarmant, qui est la version chanceuse : il rougit au lieu de
    // verdir à tort. Un test qui cherche l'ABSENCE d'un libellé doit lire le CODE.
    const harnais = sansCommentairesJS(lire(HARNAIS));
    for (const reste of ['Avant de commencer', 'ai compris', 'getByText(\'Non\'', 'Je confirme être un adulte', 'Es-tu concerné']) {
      expect(
        harnais.includes(reste),
        `le harnais cherche encore « ${reste} » : cet écran a été supprimé le 2026-08-12, le script échouerait en accusant l'app`,
      ).toBe(false);
    }
  });

  // ⚠️ CE QUI REMPLACE L'ÉCRAN N'EST PAS RIEN : son `isVisible({ timeout })` absorbait
  // le temps de montage de l'assistant. Sans attente explicite derrière, une sonde
  // instantanée rendrait « pas d'assistant » sur une page qui n'a pas fini de monter —
  // donc onboarding SAUTÉ, donc un plan jamais généré, sans une ligne pour le dire.
  it('l\'entrée dans l\'assistant ATTEND l\'étape 1, elle ne la sonde pas', () => {
    const harnais = sansCommentairesJS(lire(HARNAIS));
    const boot = /export async function bootToPlan[\s\S]*?\n}/.exec(harnais)?.[0] ?? '';
    expect(boot, 'bootToPlan introuvable').not.toBe('');
    expect(
      boot.includes('attendreEtape1'),
      'bootToPlan n\'attend plus l\'étape 1 : un assistant lent à monter serait pris pour une session déjà onboardée',
    ).toBe(true);
    expect(
      /isVisible\(\{\s*timeout/.test(harnais.slice(harnais.indexOf('attendreEtape1'))),
      'attendreEtape1 ne pose aucun délai — elle ne remplace donc pas ce que l\'écran supprimé absorbait',
    ).toBe(true);
  });
});
