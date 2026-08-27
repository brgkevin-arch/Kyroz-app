import { describe, it, expect } from 'vitest';
import { computePlan, recalcProfile, goalLabel, goalSubtitle, recommendedProteinPerKg } from '../tdee';
import { normalizeGoal } from '../syncGuard';
import { bootProfile } from '../profileBoot';
import { GOALS, GOAL_FALLBACK, isGoal, MEAL_ORDER, UserProfile } from '../types';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 UN `goal` HORS BARÈME FIGEAIT L'APP. POUR TOUJOURS. (constat 02-03)
//
// `goal` est une colonne `text` SANS contrainte (`schema.sql:65`), et `rowToProfile`
// recopie la colonne brute avant de caster `as UserProfile` (`sync.ts:155-162`). Le
// type `Goal` — une union de six littéraux — était donc une CLAIM du compilateur, pas
// une garantie sur la donnée. Personne n'avait écrit de garde : le type disait qu'elle
// était inutile.
//
// Mesuré AVANT correctif, sur quatre formes atteignables :
//
//   goal: undefined  ·  null (colonne vide)  ·  ''  ·  'perte_de_poids' (saisi en base)
//     → computePlan / goalLabel / goalSubtitle / recommendedProteinPerKg
//       TypeError: Cannot read properties of undefined (reading 'kcalDelta')
//
// L'audit n'avait nommé QUE `undefined` et QUE `computePlan`. C'était quatre valeurs
// et quatre fonctions.
//
// ⚠️ ET LE DÉGÂT N'ÉTAIT PAS LE CRASH. `recalcProfile` est appelé dans le `.then()` de
// la lecture du profil au démarrage, qui n'avait pas de `.catch()` : la levée sautait
// `setLoading(false)`, `app/index.tsx` restait sur `<Splash />`, et la valeur fautive
// étant relue d'AsyncStorage à chaque lancement, redémarrer ne réparait rien. Pas de
// crash visible, pas de message, aucune issue hors réinstallation.
//
// ⚠️ LE PRÉCÉDENT EST DANS LE MÊME FICHIER. `normalizeVariety` dit dans son propre
// commentaire « même remède que `normalizeGoal` » — et applique un remède PLUS FORT :
// elle referme toute valeur inconnue sur un défaut, ce que l'originale ne faisait pas.
// Le jumeau écrit en second était le bon. Et `variety: 'high'` a été trouvé sur un
// profil RÉEL, saisi hors de l'app : l'accident n'est pas hypothétique, il a déjà eu
// lieu une fois — sur le champ où il ne coûtait qu'un mauvais plan silencieux.

const base = {
  id: 't', sex: 'male', age: 35, weight_kg: 92, height_cm: 182, body_fat_pct: 18,
  activity_level: 'moderate', training_days_per_week: 4, sports: [],
  neat_level: 'desk', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
};
const profil = (goal: unknown) => ({ ...base, goal } as unknown as UserProfile);

/** Les quatre formes que la donnée peut réellement prendre hors barème. */
const HORS_BAREME: [string, unknown][] = [
  ['absent (undefined)', undefined],
  ['NULL — la forme réelle d’une colonne `text` vide', null],
  ['chaîne vide', ''],
  ['inconnu — saisi à la main en base', 'perte_de_poids'],
];

describe('objectif hors barème — le moteur ne lève plus, et sert le plan de MAINTIEN', () => {
  const maintien = computePlan(profil('maintain'));

  it('le témoin : un objectif VALIDE produit bien un plan (sinon la sonde ne mesure rien)', () => {
    expect(maintien.profile.target_kcal).toBeGreaterThan(1500);
    expect(computePlan(profil('cut')).profile.target_kcal).toBeLessThan(maintien.profile.target_kcal);
  });

  for (const [nom, g] of HORS_BAREME) {
    it(`🔴 \`${nom}\` → plan IDENTIQUE au plan de maintien, pas une levée`, () => {
      const servi = computePlan(profil(g));
      // Égalité EXACTE du plan entier, pas « un nombre plausible » : le repli doit
      // être le plan de maintien, pas un plan qui lui ressemble.
      expect(servi.profile.target_kcal).toBe(maintien.profile.target_kcal);
      expect(servi.profile.target_protein_g).toBe(maintien.profile.target_protein_g);
      expect(servi.profile.target_carbs_g).toBe(maintien.profile.target_carbs_g);
      expect(servi.profile.target_fat_g).toBe(maintien.profile.target_fat_g);
      expect(servi.floor_kcal).toBe(maintien.floor_kcal);
    });

    it(`🔴 \`${nom}\` → les trois libellés répondent aussi`, () => {
      // L'audit ne nommait que `computePlan`. Ces trois-là levaient à l'identique, et
      // deux sont appelés EN RENDU (`profil.tsx:674`, `FirstPlanReveal.tsx:121`) :
      // une levée y aurait été un écran rouge, pas un plan faux.
      expect(goalLabel(g as never)).toBe(goalLabel(GOAL_FALLBACK));
      expect(goalSubtitle(g as never)).toBe(goalSubtitle(GOAL_FALLBACK));
      expect(recommendedProteinPerKg(g as never)).toBe(recommendedProteinPerKg(GOAL_FALLBACK));
    });
  }
});

// ── LA PRÉMISSE DU « PAS D'ENGINE_REV » — COMPTÉE, PAS AFFIRMÉE ─────────────
//
// Toute correction qui déplace des cibles doit incrémenter `ENGINE_REV` et déclencher
// l'avertissement one-shot. Celle-ci ne le fait pas, et l'argument est :
//
//   « les SEULS profils touchés sont ceux dont `computePlan` LEVAIT — ils n'ont aucune
//     cible servie, donc aucune cible servie ne bouge. »
//
// C'est une affirmation vérifiable, donc elle se vérifie. Elle tient si et seulement si
// AUCUN objectif valide n'est dévié vers le repli.
describe('aucun objectif VALIDE n’est dévié vers le repli', () => {
  it('la sonde voit bien les six objectifs — sinon elle ne mesure rien', () => {
    expect(GOALS.length).toBe(6);
    expect(GOALS).toContain(GOAL_FALLBACK);
  });

  it('🔴 aucun objectif valide ne sert le plan du REPLI', () => {
    // ⚠️ LA PREMIÈRE VERSION DE CE TEST EXIGEAIT SIX CIBLES DISTINCTES, ET ELLE A
    // ROUGI — à raison. Mesuré : 2263, 2263, 2395, 2545, 2745, 2945. `cut_aggressive`
    // et `cut` servent la MÊME cible parce que le plancher de sécurité (2263 ici)
    // absorbe l'écart entre −500 et −300 kcal/j. C'est très exactement la mesure qui
    // avait motivé la fusion des deux sèches (« un choix fantôme », 2026-07-29) :
    // le test l'a re-trouvée seule, sur un profil qu'on n'avait pas choisi pour ça.
    //
    // La distinction des cibles était donc une MAUVAISE sonde : elle mesure le
    // plancher autant que l'objectif. Ce qu'il faut prouver est plus étroit et
    // insensible au plancher — si le repli était appliqué par erreur à un objectif
    // valide, le plan de cet objectif serait celui de `maintain`.
    const repli = JSON.stringify(computePlan(profil(GOAL_FALLBACK)).profile);
    for (const g of GOALS) {
      if (g === GOAL_FALLBACK) continue;
      expect(JSON.stringify(computePlan(profil(g)).profile), `objectif ${g}`).not.toBe(repli);
    }
  });

  it('🔴 les six objectifs ont chacun leur PROPRE entrée de configuration', () => {
    // Le pendant sans plancher : les libellés se lisent directement dans la table, donc
    // six libellés distincts prouvent que six entrées répondent — et qu'aucun objectif
    // valide ne retombe sur celle du repli.
    const libelles = GOALS.map(goalLabel);
    expect(new Set(libelles).size, libelles.join(' · ')).toBe(GOALS.length);
    expect(new Set(GOALS.map(goalSubtitle)).size).toBe(GOALS.length);
  });

  it('🔴 `normalizeGoal` rend l’objet IDENTIQUE pour un objectif valide — donc rien n’est réécrit', () => {
    // `toBe` et pas `toEqual` : l'identité de référence est ce qui garantit qu'aucune
    // réécriture n'est déclenchée au démarrage, donc qu'aucun profil sain n'est
    // marqué « dirty » ni repoussé au cloud par ce correctif.
    for (const g of GOALS) {
      if (g === 'cut_aggressive' || g === 'bulk') continue; // refermés à dessein
      const p = profil(g);
      expect(normalizeGoal(p), `objectif ${g}`).toBe(p);
    }
  });

  it('les deux objectifs RETIRÉS restent refermés comme avant', () => {
    expect(normalizeGoal(profil('cut_aggressive'))!.goal).toBe('cut');
    expect(normalizeGoal(profil('bulk'))!.goal).toBe('lean_bulk');
  });
});

describe('`normalizeGoal` referme la donnée — le repli doit SE VOIR', () => {
  for (const [nom, g] of HORS_BAREME) {
    it(`🔴 \`${nom}\` → \`${GOAL_FALLBACK}\` en stockage`, () => {
      // Le filet moteur fait tourner l'app ; il ne répare pas la donnée. Sans cette
      // réécriture, la valeur fautive resterait en base et dans AsyncStorage à vie, et
      // l'écran Profil afficherait un objectif que rien ne sait resélectionner.
      expect(normalizeGoal(profil(g))!.goal).toBe(GOAL_FALLBACK);
    });
  }

  it('`isGoal` refuse ce qu’il doit refuser et accepte ce qu’il doit accepter', () => {
    for (const g of GOALS) expect(isGoal(g), `${g} devrait être valide`).toBe(true);
    for (const [, g] of HORS_BAREME) expect(isGoal(g)).toBe(false);
    expect(isGoal(0)).toBe(false);
    expect(isGoal({})).toBe(false);
    // ⚠️ Le piège d'un `includes` sur un tableau : les propriétés héritées d'`Array`.
    expect(isGoal('length')).toBe(false);
    expect(isGoal('constructor')).toBe(false);
  });
});

// ── LE GEL AU DÉMARRAGE — LA MOITIÉ PORTANTE DU CONSTAT ─────────────────────
//
// ⚠️ Refermer `goal` ferme une porte dans une pièce sans murs : le prochain champ hors
// barème refigerait tout à l'identique (02-02 est encore ouvert sur les quatre champs
// du BMR). C'est le MÉCANISME qui devait être rattrapé, et c'est pour ça que la
// décision a été sortie de `hooks/useProfile.ts` vers `lib/profileBoot.ts` — la suite
// ne couvre que `lib/`, une garantie laissée dans le hook n'aurait été qu'un
// commentaire que rien ne compte.
describe('démarrage — `bootProfile` ne lève JAMAIS, quoi qu’il lise', () => {
  const sain = JSON.stringify(profil('cut'));

  it('le témoin : sur un profil sain, il recalcule pour de vrai', () => {
    const r = bootProfile(sain, recalcProfile);
    expect(r.profile!.target_kcal).toBeGreaterThan(1500);
    expect(r.degraded).toBe(false);
    expect(r.warn).toBeNull();
  });

  it('rien en stockage → pas de profil, pas d’alerte', () => {
    expect(bootProfile(null, recalcProfile)).toEqual({ profile: null, stored: null, warn: null, degraded: false });
  });

  it('🔴 stockage CORROMPU → profil absent, et surtout : pas de levée', () => {
    const r = bootProfile('{ceci n’est pas du JSON', recalcProfile);
    expect(r.profile).toBeNull();
    // `stored` NUL est ce qui protège la donnée : l'appelant ne réécrit que si
    // `stored` existe, donc un profil illisible n'est jamais écrasé par sa propre
    // lecture ratée.
    expect(r.stored).toBeNull();
    expect(r.warn).toMatch(/ILLISIBLE/);
  });

  it('🔴 le recalcul LÈVE → le profil stocké est servi tel quel, l’app s’ouvre', () => {
    // La branche qui ne peut plus être atteinte par une donnée réelle depuis que
    // `goal` est refermé — d'où l'injection de `recalc`, seul moyen de la faire
    // rougir. Un garde-fou qu'on n'a jamais vu rougir ne prouve rien.
    const r = bootProfile(sain, () => { throw new TypeError('champ hors barème'); });
    expect(r.profile).not.toBeNull();
    expect(r.profile!.goal).toBe('cut');
    expect(r.degraded, 'l’appelant doit savoir que le plancher rétroactif n’a PAS été appliqué').toBe(true);
    expect(r.warn).toMatch(/IMPOSSIBLE/);
  });

  it('🔴 un `goal` hors barème lu du stockage ouvre l’app SANS passer par la branche dégradée', () => {
    // Le cas de bout en bout : c'est exactement l'octet qui figeait l'app.
    const r = bootProfile(JSON.stringify(profil('perte_de_poids')), recalcProfile);
    expect(r.degraded, 'il ne doit PLUS y avoir de levée à rattraper').toBe(false);
    expect(r.profile!.goal).toBe(GOAL_FALLBACK);
    expect(r.profile!.target_kcal).toBeGreaterThan(1500);
    // Et le profil est bien RÉÉCRIT (stored ≠ healed) : le repli se voit dans l'app.
    expect(JSON.stringify(r.stored)).not.toBe(JSON.stringify(r.profile));
  });
});
