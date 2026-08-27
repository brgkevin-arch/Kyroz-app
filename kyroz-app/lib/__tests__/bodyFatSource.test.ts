// ── PROVENANCE DU %MG — Katch-McArdle ne prend plus une devinette (2026-08-06) ──
//
// ⚠️ AMENDÉ PAR « R6 LISSÉE » (2026-08-24, `ENGINE_REV` 7 → 8) : un %MG estimé ne
// donne plus TOUJOURS Mifflin — quand Katch dépasse Mifflin au-delà du bruit d'une
// silhouette, le BMR glisse progressivement vers Katch (jamais l'inverse, jamais de
// baisse). Les vecteurs et invariants de cette règle vivent dans `r6Lissee.test.ts` ;
// les blocs 1, 3, 6 et 8 ci-dessous ont été réécrits pour dire la règle NOUVELLE.
// Ce qui n'a pas bougé d'un kcal : la branche `measured` (Katch pur), le côté gras
// (Mifflin tel quel), et l'option A (bloc 4 — la masse maigre ignore la provenance).
//
// Ce que ce fichier défend, et pourquoi chaque test existe :
//
//  1. la BRANCHE : Katch PUR uniquement si `body_fat_source === 'measured'` ; un
//     estimé reste borné dans [Mifflin ; Katch], et vaut Mifflin dès que Katch ne
//     dépasse pas nettement ;
//  2. le DÉFAUT : `undefined` (tous les comptes d'avant la migration) calcule comme
//     estimé — jamais comme mesuré ;
//  3. la NON-RÉGRESSION que le fondateur a demandée : un profil existant sans
//     provenance ne voit pas son TDEE changer « de façon inattendue ». Il change de
//     façon EXPLICABLE et bornée, et c'est mesuré ici, pas affirmé ;
//  4. la promesse de l'option A : le plancher de sécurité ne bouge PAS. C'est ce qui
//     distingue ce chantier de l'option B, et sans test rien ne l'empêcherait de
//     dériver ;
//  5. le déterminisme : mêmes entrées = mêmes sorties ;
//  6. le SEUIL 35 % / 43 % (bloc 8) : la question n'est posée qu'au-delà du plafond
//     du sélecteur, et une réponse « mesuré » ne survit pas à un %MG redescendu
//     sous ce seuil — sinon Katch s'appliquerait via un réglage inatteignable.
//
// ⚠️ VÉRIFIÉ PAR MUTATION (cf. AGENTS.md) — un test qu'on n'a jamais vu rougir ne
// prouve rien. TROIS mutations ont été jouées, parce qu'une seule ne couvrait que le
// tiers du fichier, et le relevé est celui-ci, pas celui qu'on aurait aimé :
//
//   M1 · `katchEligible` remis sur l'ancien prédicat (`typeof body_fat_pct === 'number'`)
//        → 7 tests rouges, blocs 1, 2, 3 et 6.
//   M2 · `resolvedBodyFatPct` consulte la provenance (c'est l'option B, celle qu'on a
//        ÉCARTÉE) → 3 tests rouges, tout le bloc 4.
//   M3 · `MAX_DEFICIT_TDEE_RATIO` desserré de 0,25 à 0,90 → bloc 7 rouge.
//   M4 · seuil `BF_CHART_MAX` mis à 0 (question posée partout) → 4 tests du bloc 8.
//   M5 · `provenanceRetenue` cesse de nettoyer (l'état fantôme revient) → 2 tests.
//   M6 · l'écran redéclare sa propre table de seuils → 1 test (le verrou de source).
//
// Le bloc 5 (déterminisme) ne rougit sous AUCUNE des trois, et c'est normal : il ne
// garde pas ce chantier, il garde la contrainte transverse « mêmes entrées = mêmes
// sorties », qui doit tenir quel que soit le prédicat.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  calculateBMR, calculateTDEE, katchEligible, recalcProfile, computePlan,
  bodyFatTdeeImpact, leanBodyMass, ENGINE_REV, katchRaw, mifflinRaw,
} from '../tdee';
import {
  safetyFloorKcal, fatFreeMassKg, EA_HARD_FLOOR, highAdiposity,
  BF_CHART_MAX, provenanceDemandee, provenanceRetenue,
} from '../safety';
import { exerciseKcalPerDay } from '../sport';
import { makeProfile } from './helpers';
import { BodyFatSource, UserProfile } from '../types';

const T = '2026-08-06';

/** Même corps, seule la provenance change. */
const corps = (source?: BodyFatSource, over: Partial<UserProfile> = {}): UserProfile =>
  makeProfile({
    sex: 'female', age: 32, weight_kg: 78, height_cm: 168,
    body_fat_pct: 33, body_fat_source: source,
    neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    ...over,
  });

describe('1 — la branche du BMR suit la PROVENANCE, pas la présence du chiffre', () => {
  const bf = { sex: 'female' as const, weight_kg: 78, height_cm: 168, age: 32, body_fat_pct: 33 };
  const mifflin = Math.round(10 * 78 + 6.25 * 168 - 5 * 32 - 161);
  const katch = Math.round(370 + 21.6 * leanBodyMass('female', 78, 33));

  // ⚠️ **CE CORPS NE SÉPARE PLUS LES DEUX PROVENANCES, ET C'EST LE CORRECTIF 02-01.**
  // Sur lui, Katch rend 1499 contre 1509 à Mifflin : Katch se TROMPE, vers le bas. Le
  // chemin « mesuré » servait quand même Katch — c'était le P0. Il sert Mifflin depuis
  // le 2026-08-27, comme le chemin « estimé ».
  // ➡️ La provenance décide toujours, mais seulement là où Katch est AU-DESSUS et de
  // moins d'une demi-bande : le mesuré prend Katch entier, l'estimé attend que l'écart
  // sorte du bruit de silhouette. Ce corps-là est le `SEPARE` ci-dessous, trouvé par
  // BALAYAGE (marge 29,4 kcal des deux côtés de la fenêtre), pas au jugé.
  const SEPARE = { sex: 'male' as const, weight_kg: 110, height_cm: 160, age: 25, body_fat_pct: 31 };

  it('mesuré, Katch au-dessus → Katch-McArdle ENTIER (pas de bande morte)', () => {
    const k = Math.round(370 + 21.6 * leanBodyMass('male', 110, 31));
    expect(calculateBMR({ ...SEPARE, body_fat_source: 'measured' })).toBe(k);
    // …et l'estimé, sur le MÊME corps, reste sur Mifflin : l'écart n'est pas encore
    // sorti du bruit d'une silhouette tapée au jugé.
    expect(calculateBMR({ ...SEPARE, body_fat_source: 'estimated' }))
      .toBe(Math.round(10 * 110 + 6.25 * 160 - 5 * 25 + 5));
  });

  it('mesuré, Katch EN DESSOUS → Mifflin (constat 02-01, P0)', () => {
    // Katch compte le tissu adipeux à zéro kcal : son erreur croît avec la masse
    // grasse. Servir Katch ici retirait des calories à quelqu'un qui en demandait déjà
    // moins. Mesuré sur ce corps : −10 kcal/j ; sur un H de 120 kg à 45 %MG : −322.
    expect(katch).toBeLessThan(mifflin);
    expect(calculateBMR({ ...bf, body_fat_source: 'measured' })).toBe(mifflin);
  });

  it('estimé, silhouette côté gras → Mifflin-St Jeor, alors que le %MG est bien là', () => {
    // Sur CE corps (F 33 %), Katch donne MOINS que Mifflin : côté gras, le %MG estimé
    // ne pilote pas le BMR — R6 lissée ne mélange que côté sec (cf. r6Lissee.test.ts).
    // ⚠️ Depuis le 2026-08-27, le chemin MESURÉ conclut pareil sur ce corps. Les deux
    // provenances ne divergent plus côté gras : c'est le correctif, pas une régression.
    expect(calculateBMR({ ...bf, body_fat_source: 'estimated' })).toBe(mifflin);
    expect(calculateBMR({ ...bf, body_fat_source: 'measured' })).toBe(mifflin);
    expect(bf.body_fat_pct).toBeGreaterThan(0);
  });

  it('provenance ABSENTE → même chemin que l\'estimé (le défaut va vers la prudence)', () => {
    expect(calculateBMR(bf)).toBe(mifflin);
  });

  it('une provenance INCONNUE ne rouvre pas Katch PUR (égalité, pas négation)', () => {
    // Une ligne cloud d'une version future, ou une valeur corrompue, ne doit pas
    // tomber du côté permissif. `katchEligible` teste l'ÉGALITÉ à 'measured' : tout
    // le reste emprunte le chemin estimé — mélange borné côté sec, Mifflin ici.
    const exotique = { ...bf, body_fat_source: 'dexa_2027' as unknown as BodyFatSource };
    expect(katchEligible(exotique)).toBe(false);
    expect(calculateBMR(exotique)).toBe(mifflin);
  });

  it('mesuré mais sans chiffre, ou chiffre nul → Mifflin', () => {
    expect(katchEligible({ body_fat_source: 'measured' })).toBe(false);
    expect(katchEligible({ body_fat_pct: 0, body_fat_source: 'measured' })).toBe(false);
  });
});

describe('2 — les cinq chemins du moteur suivent la même branche', () => {
  // `calculateBMR` prend le CORPS entier justement pour qu'aucun appelant ne puisse
  // passer le %MG en oubliant sa provenance. On le vérifie de bout en bout plutôt
  // qu'en relisant les appels : c'est le résultat servi qui compte.
  it('TDEE, cible servie et plan complet basculent ensemble', () => {
    // ⚠️ GABARIT CHANGÉ le 2026-08-27 (constat 02-01). Le corps du fichier (F 78 kg,
    // 33 %MG) est côté GRAS : depuis le correctif, les deux provenances y concluent
    // pareil, donc il ne peut plus prouver que la bascule se propage. Il faut un corps
    // où la provenance décide ENCORE — Katch au-dessus de Mifflin, mais de moins d'une
    // demi-bande. Trouvé par balayage (marge 29,4 kcal des deux côtés), pas au jugé.
    const SEPARE = { sex: 'male' as const, weight_kg: 110, height_cm: 160, age: 25, body_fat_pct: 31 };
    const mes = computePlan(corps('measured', SEPARE), T);
    const est = computePlan(corps('estimated', SEPARE), T);
    expect(mes.profile.tdee_kcal).not.toBe(est.profile.tdee_kcal);
    expect(est.profile.tdee_kcal).toBe(calculateTDEE(corps('estimated', SEPARE)));
    // La cible suit le TDEE (aucun plancher ne mord sur ce corps).
    expect(est.profile.target_kcal - mes.profile.target_kcal)
      .toBe(est.profile.tdee_kcal - mes.profile.tdee_kcal);
  });
});

describe('3 — un profil existant SANS provenance : ce qui bouge, et de combien', () => {
  // La demande du fondateur : « vérifier qu'un profil existant sans provenance
  // renseignée ne voit pas son TDEE changer de façon inattendue après migration ».
  // Il change — c'est l'objet du correctif — mais de façon EXPLICABLE : il vaut
  // exactement le TDEE Mifflin, et l'écart est borné.
  it('côté gras, son TDEE vaut EXACTEMENT celui d\'un %MG absent', () => {
    // Ce corps (F 33 %) est côté gras : le chiffre estimé n'y pilote pas le BMR.
    // Côté sec, R6 lissée le fait remonter — vers le haut uniquement, jamais
    // au-delà de Katch (cf. r6Lissee.test.ts, invariants §4).
    const legacy = recalcProfile(corps(undefined), T);
    const sansMG = recalcProfile(corps(undefined, { body_fat_pct: undefined }), T);
    expect(legacy.tdee_kcal).toBe(sansMG.tdee_kcal);
  });

  it('mais son %MG est CONSERVÉ — il reste stocké et affichable', () => {
    const legacy = recalcProfile(corps(undefined), T);
    expect(legacy.body_fat_pct).toBe(33);
    // Et la provenance n'est PAS backfillée : `undefined` veut dire « jamais
    // demandé », ce qui reste distinguable de « répondu au jugé ».
    expect(legacy.body_fat_source).toBeUndefined();
  });

  it('l\'écart vs `measured` a le signe de l\'ERREUR de Katch, et le plancher AMORTIT les baisses', () => {
    // Balayage sur les 12 valeurs du sélecteur de silhouettes, deux sexes.
    // ⚠️ RÉÉCRIT POUR R6 LISSÉE (2026-08-24) — la version d'avant vérifiait « six
    // silhouettes, un seul chiffre » et un écart monotone : deux affirmations de la
    // règle binaire, fausses depuis que le côté sec se mélange. Ce qui est vérifié
    // reste la FORME de l'écart, qui est ce qui le rend explicable :
    //   · quand Katch donne PLUS que Mifflin (silhouettes sèches), le profil sans
    //     provenance sert un mélange ≤ Katch : l'écart vs `measured` est ≤ 0 ;
    //   · quand Katch donne MOINS (silhouettes grasses), Mifflin est servi tel quel,
    //     donc l'écart est ≥ 0 — c'est l'asymétrie même de la règle ;
    //   · le BMR servi ne descend jamais sous Mifflin, quelle que soit la silhouette ;
    //   · et sur la CIBLE SERVIE, le plancher de sécurité amortit toujours la baisse.
    const ecartsTdee: number[] = [];
    const ecartsCible: number[] = [];
    for (const [sex, pcts] of [
      ['male', [10, 15, 20, 25, 30, 35]],
      ['female', [18, 23, 28, 33, 38, 43]],
    ] as const) {
      for (const pct of pcts) {
        const o = { sex, weight_kg: sex === 'male' ? 82 : 68, height_cm: sex === 'male' ? 180 : 166, age: 30, body_fat_pct: pct };
        const avant = recalcProfile(corps('measured', o), T);
        const apres = recalcProfile(corps(undefined, o), T);
        ecartsTdee.push(apres.tdee_kcal - avant.tdee_kcal);
        ecartsCible.push(apres.target_kcal - avant.target_kcal);
        const cle = `${sex} ${pct}%`;
        const b = { sex, weight_kg: o.weight_kg, height_cm: o.height_cm, age: 30, body_fat_pct: pct };
        const d = katchRaw(b) - mifflinRaw(b);
        if (d > 0) expect(apres.tdee_kcal - avant.tdee_kcal, cle).toBeLessThanOrEqual(0);
        else expect(apres.tdee_kcal - avant.tdee_kcal, cle).toBeGreaterThanOrEqual(0);
        // Jamais de baisse en estimé : le BMR servi reste ≥ Mifflin.
        expect(calculateBMR(b), cle).toBeGreaterThanOrEqual(Math.round(mifflinRaw(b)));
        // Une baisse de dépense n'est jamais répercutée en entier sur l'assiette.
        expect(apres.target_kcal - avant.target_kcal, cle)
          .toBeGreaterThanOrEqual(apres.tdee_kcal - avant.tdee_kcal);
      }
    }
    // Bornes MESURÉES (moteur, pas réplique) — elles se resserrent si le moteur
    // change, et c'est voulu : ce sont des chiffres qu'on doit pouvoir citer au
    // fondateur. Historique : −217 kcal de TDEE sous la règle binaire · −64 après R6
    // lissée (2026-08-24), le mélange rendant au corps sec l'essentiel de ce que la
    // règle binaire lui prenait.
    // ⚠️ **LA BORNE HAUTE TOMBE DE +363 À 0 le 2026-08-27** (constat 02-01), et ce zéro
    // est une propriété, pas un arrondi : le +363 mesurait exactement le défaut. Il
    // disait qu'un profil SANS provenance recevait jusqu'à 363 kcal/j de PLUS qu'un
    // profil `measured` au même corps — parce que le mesuré, lui, était condamné à
    // Katch même là où Katch se trompe. Les deux chemins servant désormais la même
    // asymétrie, l'estimé ne peut plus dépasser le mesuré : il prend au mieux le
    // mélange là où le mesuré prend Katch entier.
    expect([Math.min(...ecartsTdee), Math.max(...ecartsTdee)]).toEqual([-64, 0]);
    expect([Math.min(...ecartsCible), Math.max(...ecartsCible)]).toEqual([-48, 0]);
  });

  it('l\'avertissement one-shot part bien (ENGINE_REV a été incrémenté)', () => {
    // Sans bump, une cible qui bouge de plusieurs dizaines de kcal serait servie
    // SANS un mot — c'est la règle « toute correction qui déplace les cibles ».
    expect(ENGINE_REV).toBeGreaterThanOrEqual(6);
    const avant = recalcProfile(corps('measured'), T);
    const apres = recalcProfile({ ...avant, body_fat_source: undefined, engine_rev: 5 }, T);
    if (Math.abs(apres.target_kcal - avant.target_kcal) >= 100) {
      expect(apres.engine_notice).toBeDefined();
      expect(apres.engine_notice!.fromRev).toBe(5);
      expect(apres.engine_notice!.rev).toBe(ENGINE_REV);
    }
  });
});

describe('4 — OPTION A : le plancher de sécurité ne bouge PAS', () => {
  // C'est la promesse qui distingue ce chantier de l'option B. Le %MG déclaré
  // continue de porter la MASSE MAIGRE, donc le plancher d'énergie disponible, la
  // base protéique et le rythme de perte. Seul le métabolisme de base cesse de le
  // lire. Sans ce test, rien n'empêcherait `resolvedBodyFatPct` de se mettre un jour
  // à consulter la provenance « pour être cohérent » — et de déplacer 228 kcal.
  it('la masse maigre est IDENTIQUE quelle que soit la provenance', () => {
    expect(fatFreeMassKg(corps('measured'))).toBe(fatFreeMassKg(corps('estimated')));
    expect(fatFreeMassKg(corps(undefined))).toBe(fatFreeMassKg(corps('measured')));
  });

  it('à BMR et dépense sportive égaux, le plancher est identique', () => {
    const args = [1500, 300, 0, 9999] as const;
    expect(safetyFloorKcal(corps('estimated'), ...args)).toBe(safetyFloorKcal(corps('measured'), ...args));
  });

  it('sur 12 corps : le plancher BRUT ne bouge d\'aucun kcal, seul son PLAFOND suit', () => {
    // ⚠️ La formulation naïve de ce test (« le candidat `energy_availability` est
    // identique ») est FAUSSE, et c'est la mesure qui l'a dit : sur F 82 kg à 10 % de
    // MG, il passe de 2362 à 2306. Ce n'est pas le plancher qui a bougé — c'est son
    // PLAFOND. `energy_availability` vaut `min(30 × masse maigre + sport, maintenance)`
    // (§6 : un plancher de sécurité n'impose jamais un surplus), et la maintenance,
    // elle, suit bien la provenance. Sur un corps implaubible — 73,8 kg de masse maigre
    // pour 82 kg — le plafond mord, donc le candidat suit le TDEE.
    // Ce que l'option A promet est le terme de GAUCHE, et c'est lui qu'on vérifie.
    for (const pct of [10, 15, 20, 25, 30, 35]) {
      for (const sex of ['male', 'female'] as const) {
        const o = { sex, weight_kg: 82, height_cm: 178, age: 30, body_fat_pct: pct };
        const A = computePlan(corps('measured', o), T);
        const B = computePlan(corps(undefined, o), T);
        const cle = `${sex} ${pct}%`;
        const brut = (p: UserProfile) =>
          Math.round(EA_HARD_FLOOR * fatFreeMassKg(p) + exerciseKcalPerDay(p.sports, p.weight_kg));

        // ⚠️ Depuis le 2026-08-10, le candidat NE CONCOURT PLUS au-delà du seuil
        // d'adiposité (`safety.highAdiposity`) : il vaut alors 0. La promesse de
        // l'option A porte sur la PROVENANCE et rien d'autre — elle reste donc
        // vérifiable telle quelle, à ceci près que la valeur attendue devient 0 des
        // deux côtés. Écrire `.toBe(min(brut, tdee))` en dur ferait rougir ce test
        // pour une raison qui n'a rien à voir avec ce qu'il garde.
        const attendu = (p: UserProfile) =>
          highAdiposity(p) ? 0 : Math.min(brut(p), p.tdee_kcal);

        expect(brut(B.profile), cle).toBe(brut(A.profile));
        expect(B.clamp!.candidates.energy_availability, cle).toBe(attendu(B.profile));
        expect(A.clamp!.candidates.energy_availability, cle).toBe(attendu(A.profile));
      }
    }
  });
});

describe('5 — déterminisme : mêmes entrées, mêmes sorties', () => {
  it('deux recalculs du même profil donnent le même plan, à la clé près', () => {
    for (const src of ['measured', 'estimated', undefined] as const) {
      const a = recalcProfile(corps(src), T);
      const b = recalcProfile(corps(src), T);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });

  it('recalculer un profil DÉJÀ recalculé ne le déplace plus (idempotence)', () => {
    for (const src of ['measured', 'estimated', undefined] as const) {
      const un = recalcProfile(corps(src), T);
      const deux = recalcProfile(un, T);
      expect(deux.target_kcal).toBe(un.target_kcal);
      expect(deux.tdee_kcal).toBe(un.tdee_kcal);
    }
  });
});

describe('6 — le repère affiché ne peut plus annoncer des kcal qui ne seront pas servis', () => {
  const body = { sex: 'female' as const, age: 35, weight_kg: 80, height_cm: 170, neat_level: 'desk' as const };

  it('%MG estimé côté gras → impact 0 : rien ne bouge, rien à annoncer', () => {
    // À 40 % sur ce corps, Katch donne moins que Mifflin : côté gras, l'estimé ne
    // pilote rien, l'écran n'annonce aucun kcal — et c'est vrai.
    expect(bodyFatTdeeImpact(body, 40, 'estimated')).toBe(0);
    expect(bodyFatTdeeImpact(body, 40, undefined)).toBe(0);
  });

  it('%MG estimé côté sec → l\'impact est POSITIF, et c\'est celui qui sera servi', () => {
    // ⚠️ RÉÉCRIT POUR R6 LISSÉE — l'ancienne version exigeait 0 ici : c'était la
    // règle binaire. À 20 % sur ce corps, la silhouette indique nettement plus de
    // masse maigre que la moyenne du gabarit, le BMR glisse vers Katch et la dépense
    // MONTE. Le chiffre annoncé est servi : l'impact doit le dire, pas le taire.
    const impact = bodyFatTdeeImpact(body, 20, 'estimated');
    expect(impact).toBeGreaterThan(0);
    expect(bodyFatTdeeImpact(body, 20, undefined)).toBe(impact);
    // Et jamais négatif en estimé : le mélange ne descend jamais sous Mifflin.
    for (const pct of [15, 20, 25, 30, 35, 40, 45, 50]) {
      expect(bodyFatTdeeImpact(body, pct, 'estimated'), `${pct}%`).toBeGreaterThanOrEqual(0);
    }
  });

  it('%MG mesuré → l\'impact existe toujours et reste chiffrable', () => {
    expect(bodyFatTdeeImpact(body, 20, 'measured')).toBeGreaterThan(200);
    // Et l'estimé reste ≤ au mesuré à silhouette égale : le mélange est borné par Katch.
    expect(bodyFatTdeeImpact(body, 20, 'estimated'))
      .toBeLessThanOrEqual(bodyFatTdeeImpact(body, 20, 'measured'));
  });
});

describe('7 — le plafond de déficit à 25 % cesse d\'être dormant', () => {
  // Trouvé en contre-analysant un audit externe qui le déclarait « code mort ».
  // Il ne gagnait jamais TANT QUE la masse maigre était lue sur un %MG déclaré et
  // que le BMR était Katch. Sur un corps à très forte adiposité SANS provenance, le
  // BMR passe en Mifflin (haut, il suit le poids) pendant que le plancher d'énergie
  // disponible s'effondre avec la masse maigre : c'est alors le plafond des 25 % qui
  // définit le plancher. Ce chantier rend ce chemin COURANT — il mérite un verrou.
  it('sur un gabarit à forte adiposité, `deficit_cap` définit le plancher', () => {
    const p = makeProfile({
      sex: 'female', age: 40, weight_kg: 125, height_cm: 160,
      neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
      sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }],
    });
    const { clamp: _clamp } = computePlan(p, T);
    // ⚠️ `clamp` est optionnel depuis 02-02 : `undefined` = le moteur a REFUSÉ de
    // conclure (profil incomplet). Ce profil-ci est complet, donc il est là.
    const clamp = _clamp!;
    expect(clamp.source).toBe('deficit_cap');
    expect(clamp.candidates.deficit_cap).toBeGreaterThan(clamp.candidates.energy_availability);
    expect(clamp.candidates.deficit_cap).toBeGreaterThan(clamp.candidates.bmr);
  });
});

describe('8 — le SEUIL du sélecteur : la question n\'est posée qu\'au-delà de 35 % / 43 %', () => {
  // Décision du fondateur, 2026-08-06, prise APRÈS mesure du coût (cf. `safety.ts`).
  // Ce bloc existe pour deux raisons : figer le seuil, et surtout empêcher l'état
  // FANTÔME — une provenance « mesuré » qui survivrait à un %MG redescendu sous le
  // seuil déciderait de la formule sans que personne puisse la voir ni la changer.
  it('le seuil est le plafond du sélecteur, pas un nombre écrit deux fois', () => {
    expect(BF_CHART_MAX).toEqual({ male: 35, female: 43 });
    // Verrou de SOURCE UNIQUE. On ne peut pas importer le composant (il tire
    // `@expo/vector-icons`, que vitest ne résout pas), donc on lit son texte —
    // même méthode que `profileCols.test.ts` face au SQL. Ce qu'on interdit est
    // précis : que l'écran REDÉCLARE la table au lieu de la réexporter. Deux
    // tables de seuils auraient divergé, et c'est le seuil qui décide de la formule.
    const src = readFileSync(
      new URL('../../components/BodyFatPicker.tsx', import.meta.url), 'utf8');
    expect(src).toContain('export const CHART_MAX_PCT = BF_CHART_MAX;');
    expect(src).not.toMatch(/CHART_MAX_PCT[^=]*=\s*\{/);
  });

  it('la question n\'apparaît qu\'À PARTIR du seuil, bornes comprises', () => {
    expect(provenanceDemandee('male', 34.9)).toBe(false);
    expect(provenanceDemandee('male', 35)).toBe(true);
    expect(provenanceDemandee('female', 42.9)).toBe(false);
    expect(provenanceDemandee('female', 43)).toBe(true);
    // Un %MG absent ne pose pas de question non plus.
    expect(provenanceDemandee('male', undefined)).toBe(false);
  });

  it('« mesuré » ne SURVIT pas à un %MG redescendu sous le seuil', () => {
    // Le scénario exact : on répond « oui, avec un appareil » à 40 %, puis on corrige
    // son chiffre à 20 %. La question disparaît de l'écran — la réponse doit partir
    // avec elle, sinon Katch s'applique via un réglage devenu inatteignable.
    expect(provenanceRetenue('male', 40, 'measured')).toBe('measured');
    expect(provenanceRetenue('male', 20, 'measured')).toBeUndefined();
    expect(provenanceRetenue('female', 45, 'measured')).toBe('measured');
    expect(provenanceRetenue('female', 30, 'measured')).toBeUndefined();
  });

  it('« estimé » SURVIT, lui — et ce n\'est pas une incohérence', () => {
    // `estimated` et `undefined` calculent tous deux en Mifflin : le garder ne déplace
    // aucune cible. C'est une information vraie (« dit au jugé »), on ne la jette pas.
    expect(provenanceRetenue('male', 20, 'estimated')).toBe('estimated');
    expect(provenanceRetenue('female', 18, 'estimated')).toBe('estimated');
    expect(calculateBMR({ sex: 'male', weight_kg: 80, height_cm: 178, age: 30, body_fat_pct: 20, body_fat_source: 'estimated' }))
      .toBe(calculateBMR({ sex: 'male', weight_kg: 80, height_cm: 178, age: 30, body_fat_pct: 20 }));
  });

  it('conséquence ASSUMÉE : sous le seuil, une vraie mesure ne peut plus être déclarée', () => {
    // Ce test ne défend pas un idéal, il CHIFFRE le prix de l'arbitrage pour que
    // personne ne le redécouvre en croyant à un bug. H 75 kg, 12 % au DEXA.
    // ⚠️ Le prix a BAISSÉ avec R6 lissée (2026-08-24) : il valait ~72 kcal de BMR
    // sous la règle binaire ; le mélange en rend une partie au corps sec, il en
    // reste 44 — le mélange est borné par Katch mais n'y arrive pas sur ce corps
    // (w ≈ 0,39), et l'ordonnée de Katch est elle-même conservatrice (handoff §8).
    const corpsMaigre = { sex: 'male' as const, age: 25, weight_kg: 75, height_cm: 175, body_fat_pct: 12 };
    expect(provenanceDemandee('male', 12)).toBe(false);
    const servi = calculateBMR({ ...corpsMaigre, body_fat_source: provenanceRetenue('male', 12, 'measured') });
    const siKatch = calculateBMR({ ...corpsMaigre, body_fat_source: 'measured' });
    expect(servi).toBeLessThan(siKatch);
    expect(siKatch - servi).toBe(44);
  });
});
