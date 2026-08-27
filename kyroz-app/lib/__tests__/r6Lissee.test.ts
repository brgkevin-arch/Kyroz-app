// ── R6 LISSÉE — le BMR d'un %MG estimé glisse vers Katch, jamais l'inverse ──────
//
// Décision fondateur du 2026-08-24 (handoff « Mifflin vs Katch », deux avis IA
// convergents, 540 corps simulés + 8 sources vérifiées), `ENGINE_REV` 7 → 8.
//
// Ce que ce fichier défend, et pourquoi chaque bloc existe :
//
//  1. les 11 VECTEURS du handoff §5, au kcal près — y compris les valeurs BRUTES
//     (`mifflinRaw`, `katchRaw`) : si une formule se met à arrondir en interne,
//     c'est ici que ça rougit (spec : l'arrondi half-up ne s'applique qu'au servi) ;
//  2. les INVARIANTS du §4 — jamais de baisse en estimé, jamais au-delà de Katch,
//     côté gras intouchable, non-régression `measured` — balayés sur une grille de
//     1 344 corps, pas affirmés sur trois exemples ;
//  3. la CONTINUITÉ en poids : le seuil dur qu'on remplace sautait de ±70 kcal sur
//     une pesée de ±500 g — la fenêtre 0,5 → 1,5 bande borne le pas à 15 kcal ;
//  4. l'INVARIANCE NEAT/sport : la bande se compare en BMR précisément pour que la
//     bascule ne dépende ni du facteur d'activité ni des séances ;
//  5. la MIGRATION rev 7 → 8 : la cible ne peut que monter, et l'avertissement
//     one-shot part sans recevoir un texte de la rev 7 (cause laissée vide).
//
// ⚠️ VÉRIFIÉ PAR MUTATION le 2026-08-24 — un test qu'on n'a jamais vu rougir ne
// prouve rien. Trois mutations jouées, relevé OBSERVÉ (pas espéré) :
//   M1 · `BLEND_START` 0,5 → 1,0 (la fenêtre alternative REJETÉE au §6 du handoff)
//        → 6 rouges : constantes, vecteurs, encadrement de fenêtre, continuité,
//        plus les blocs 3 et 8 de bodyFatSource.test.ts.
//   M2 · bande multipliée par le facteur NEAT (« bande en TDEE ») → 4 rouges,
//        dont l'invariance NEAT/sport et les vecteurs.
//   M3 · mélange autorisé côté gras (garde `d ≤ 0,5 bande → Mifflin` retirée)
//        → 8 rouges, dont « côté gras intouchable / jamais de baisse » (bloc 3)
//        et quatre tests de bodyFatSource.test.ts.

import { describe, it, expect } from 'vitest';
import {
  BF_UNCERTAINTY_PTS, BLEND_START, BLEND_WIDTH, KATCH_INTERCEPT, KATCH_SLOPE,
  ENGINE_REV, NEAT_PAL, bandeBmr, calculateBMR, calculateTDEE, katchRaw,
  melangeVersKatch, mifflinRaw, recalcProfile,
} from '../tdee';
import type { BmrBody } from '../tdee';
import { exerciseKcalPerDay } from '../sport';
import { makeProfile } from './helpers';
import { BodyFatSource, NeatLevel, Sex, SportSession } from '../types';

const T = '2026-08-24';

const corps = (
  sex: Sex, weight_kg: number, height_cm: number, age: number,
  body_fat_pct: number, body_fat_source?: BodyFatSource,
): BmrBody => ({ sex, weight_kg, height_cm, age, body_fat_pct, body_fat_source });

describe('1 — les constantes de la spec, figées', () => {
  it('bande, fenêtre et pente sont ceux du handoff', () => {
    expect(BF_UNCERTAINTY_PTS).toBe(5);
    expect(BLEND_START).toBe(0.5);
    expect(BLEND_WIDTH).toBe(1.0);
    expect(KATCH_INTERCEPT).toBe(370);
    expect(KATCH_SLOPE).toBe(21.6);
    // La bande vaut 1,08 × poids — en BMR, jamais en TDEE (cf. bloc 5).
    expect(bandeBmr(75)).toBeCloseTo(81, 9);
    expect(bandeBmr(100)).toBeCloseTo(108, 9);
  });
});

describe('2 — les 11 vecteurs du handoff §5, au kcal près', () => {
  // `w: null` = la colonne « w » du handoff est vide (branche `measured`).
  const V: Array<{
    nom: string; b: BmrBody; mifflin: number; katch: number; w: number | null; servi: number;
  }> = [
    { nom: 'H 75 · 178 · 30 a · 12 % estimé — zone de mélange (l\'ex-« falaise »)',
      b: corps('male', 75, 178, 30, 12, 'estimated'), mifflin: 1717.50, katch: 1795.60, w: 0.464, servi: 1754 },
    { nom: 'H 82 · 180 · 35 a · 15 % estimé — zone de mélange',
      b: corps('male', 82, 180, 35, 15, 'estimated'), mifflin: 1775.00, katch: 1875.52, w: 0.635, servi: 1839 },
    { nom: 'H 95 · 182 · 30 a · 18 % estimé — zone de mélange, gros gabarit musclé',
      b: corps('male', 95, 182, 30, 18, 'estimated'), mifflin: 1942.50, katch: 2052.64, w: 0.573, servi: 2006 },
    { nom: 'F 58 · 165 · 30 a · 20 % estimé — zone de mélange, femme',
      b: corps('female', 58, 165, 30, 20, 'estimated'), mifflin: 1300.25, katch: 1372.24, w: 0.649, servi: 1347 },
    { nom: 'F 68 · 170 · 28 a · 18 % estimé — bascule complète (Katch pur)',
      b: corps('female', 68, 170, 28, 18, 'estimated'), mifflin: 1441.50, katch: 1574.42, w: 1.0, servi: 1574 },
    { nom: 'F 62 · 165 · 35 a · 28 % estimé — d > 0 mais sous le seuil ⇒ Mifflin',
      b: corps('female', 62, 165, 35, 28, 'estimated'), mifflin: 1315.25, katch: 1334.22, w: 0, servi: 1315 },
    { nom: 'H 80 · 176 · 40 a · 25 % estimé — côté gras léger ⇒ Mifflin',
      b: corps('male', 80, 176, 40, 25, 'estimated'), mifflin: 1705.00, katch: 1666.00, w: 0, servi: 1705 },
    { nom: 'H 110 · 178 · 45 a · 38 % estimé — côté gras fort ⇒ Mifflin, jamais de baisse',
      b: corps('male', 110, 178, 45, 38, 'estimated'), mifflin: 1992.50, katch: 1843.12, w: 0, servi: 1993 },
    { nom: 'F 95 · 165 · 45 a · 43 % estimé — silhouette plafond ⇒ Mifflin',
      b: corps('female', 95, 165, 45, 43, 'estimated'), mifflin: 1595.25, katch: 1539.64, w: 0, servi: 1595 },
    { nom: 'H 110 · 178 · 45 a · 38 % MESURÉ — non-régression `measured`',
      b: corps('male', 110, 178, 45, 38, 'measured'), mifflin: 1992.50, katch: 1843.12, w: null, servi: 1843 },
    { nom: 'H 75 · 178 · 30 a · 20 % estimé — même corps que le 1er, silhouette + grasse',
      b: corps('male', 75, 178, 30, 20, 'estimated'), mifflin: 1717.50, katch: 1666.00, w: 0, servi: 1718 },
  ];

  it('formules brutes, poids de mélange et BMR servi', () => {
    for (const v of V) {
      expect(mifflinRaw(v.b), `${v.nom} — mifflin_raw`).toBeCloseTo(v.mifflin, 2);
      expect(katchRaw(v.b), `${v.nom} — katch_raw`).toBeCloseTo(v.katch, 2);
      if (v.w !== null) expect(melangeVersKatch(v.b), `${v.nom} — w`).toBeCloseTo(v.w, 3);
      expect(calculateBMR(v.b), `${v.nom} — servi`).toBe(v.servi);
    }
  });

  it('le sous-seuil et la bascule complète encadrent bien la fenêtre 0,5 → 1,5 bande', () => {
    // F 62 (d = 18,97 ; 0,5 bande = 33,48) est SOUS l'entrée ; F 68 (d = 132,92 ;
    // 1,5 bande = 110,16) est AU-DELÀ de la sortie. Si la fenêtre glisse, ces deux
    // corps changent de camp avant les autres.
    const sous = corps('female', 62, 165, 35, 28, 'estimated');
    expect(katchRaw(sous) - mifflinRaw(sous)).toBeLessThan(BLEND_START * bandeBmr(62));
    const plein = corps('female', 68, 170, 28, 18, 'estimated');
    expect(katchRaw(plein) - mifflinRaw(plein))
      .toBeGreaterThan((BLEND_START + BLEND_WIDTH) * bandeBmr(68));
  });
});

// Grille de balayage des invariants : 2 sexes × 6 poids × 4 tailles × 4 âges ×
// 7 %MG = 1 344 corps. Les %MG débordent volontairement les clamps ([5;60] H,
// [12;65] F via `leanBodyMass`) : les invariants doivent tenir clamp compris.
const GRILLE: BmrBody[] = [];
for (const sex of ['male', 'female'] as const) {
  for (const weight_kg of [55, 68, 82, 95, 110, 125]) {
    for (const height_cm of [155, 168, 180, 192]) {
      for (const age of [18, 30, 45, 60]) {
        for (const body_fat_pct of [8, 12, 18, 24, 30, 38, 50]) {
          GRILLE.push({ sex, weight_kg, height_cm, age, body_fat_pct });
        }
      }
    }
  }
}

describe('3 — invariants §4, balayés sur 1 344 corps', () => {
  it('estimé (et provenance absente) : jamais sous Mifflin, jamais au-delà de Katch', () => {
    for (const b of GRILLE) {
      for (const source of ['estimated', undefined] as const) {
        const bb = { ...b, body_fat_source: source };
        const servi = calculateBMR(bb);
        const cle = `${b.sex} ${b.weight_kg}kg ${b.height_cm}cm ${b.age}a ${b.body_fat_pct}% (${source})`;
        // Invariant 1 — jamais de baisse : le %MG estimé ne peut que faire monter.
        expect(servi, cle).toBeGreaterThanOrEqual(Math.round(mifflinRaw(bb)));
        const d = katchRaw(bb) - mifflinRaw(bb);
        if (d > 0) {
          // Invariant 2 — jamais au-delà de Katch quand Katch est au-dessus.
          expect(servi, cle).toBeLessThanOrEqual(Math.round(katchRaw(bb)));
        } else {
          // Invariant 3 — côté gras intouchable, quel que soit |d|.
          expect(servi, cle).toBe(Math.round(mifflinRaw(bb)));
        }
      }
    }
  });

  it('non-régression `measured` : Katch exactement, sur toute la grille', () => {
    for (const b of GRILLE) {
      const bb = { ...b, body_fat_source: 'measured' as const };
      expect(calculateBMR(bb), `${b.sex} ${b.weight_kg}kg ${b.body_fat_pct}%`)
        .toBe(Math.round(katchRaw(bb)));
    }
  });
});

describe('4 — continuité en poids : plus de falaise de ±70 kcal', () => {
  // L'ancien seuil dur sautait de +67 kcal sur une pesée de ±500 g au voisinage du
  // seuil. La fenêtre borne le pas : mesuré ≤ 14 kcal, spec ≤ 15. Les deux profils
  // traversent TOUTE la fenêtre sur la plage balayée (entrée ET sortie).
  const profils: Array<{ nom: string; b: (w: number) => BmrBody }> = [
    { nom: 'H 178 · 30 a · 12 % estimé', b: (w) => corps('male', w, 178, 30, 12, 'estimated') },
    { nom: 'F 165 · 30 a · 20 % estimé', b: (w) => corps('female', w, 165, 30, 20, 'estimated') },
  ];

  it('|Δ BMR servi| ≤ 15 kcal pour Δ poids = 500 g, à profil constant', () => {
    for (const { nom, b } of profils) {
      let traverse = false;
      for (let w = 45; w < 120; w += 0.5) {
        const pas = calculateBMR(b(w + 0.5)) - calculateBMR(b(w));
        expect(Math.abs(pas), `${nom} @ ${w} kg`).toBeLessThanOrEqual(15);
        if (melangeVersKatch(b(w)) > 0 && melangeVersKatch(b(w)) < 1) traverse = true;
      }
      // Prouver que la sonde sait dire OUI : la plage balaye bien la zone de mélange
      // (sinon le test vérifierait la continuité de Mifflin seule, vraie d'avance).
      expect(traverse, nom).toBe(true);
    }
  });
});

describe('5 — invariance NEAT / sport : la bande se compare en BMR', () => {
  // Comparer en TDEE ferait dépendre la BASCULE du facteur NEAT et des séances :
  // deux personnes au même corps changeraient de formule en changeant de métier.
  const base = corps('male', 82, 180, 35, 15, 'estimated');
  const seances: SportSession[] = [{ type: 'musculation', sessions_per_week: 5, minutes_per_session: 90 }];

  it('w et BMR servi sont identiques quel que soit le NEAT et le sport', () => {
    const wRef = melangeVersKatch(base);
    expect(wRef).toBeGreaterThan(0); // corps en zone de mélange, sinon le test est creux
    const bmrRef = calculateBMR(base);
    for (const neat of Object.keys(NEAT_PAL) as NeatLevel[]) {
      for (const sports of [undefined, [], seances]) {
        const bb = { ...base, neat_level: neat, sports };
        expect(melangeVersKatch(bb), neat).toBe(wRef);
        expect(calculateBMR(bb), neat).toBe(bmrRef);
        // Et le TDEE incorpore EXACTEMENT ce BMR-là : le mélange se fait avant le
        // NEAT et le sport, il ne les relit pas.
        expect(calculateTDEE({ ...base, neat_level: neat, sports }), neat)
          .toBe(Math.round(bmrRef * NEAT_PAL[neat] + exerciseKcalPerDay(sports, base.weight_kg)));
      }
    }
  });
});

describe('6 — migration rev 7 → 8 : la cible monte, et l\'avertissement dit le vrai', () => {
  // F 68 · 170 · 28 a · 18 % estimé, maintien : la bascule est complète (w = 1) et la
  // correction passe en entier — le corps du handoff §1 « le gain réel est hors déficit ».
  const p = makeProfile({
    sex: 'female', age: 28, weight_kg: 68, height_cm: 170,
    body_fat_pct: 18, body_fat_source: 'estimated',
    neat_level: 'desk', goal: 'maintain', macro_mode: 'auto',
  });

  it('l\'avertissement one-shot part, sans recevoir un texte de la rev 7', () => {
    // ⚠️ Épinglé exprès : un bump doit faire venir quelqu'un LIRE ce test.
    // 9 depuis le 2026-08-27 — retrait progressif des planchers au seuil
    // d'adiposité (contre-audit CA-2-01). Le trajet rev 7 → courant testé ici
    // ne change pas de nature : sa cause reste indéfinie.
    expect(ENGINE_REV).toBe(9);
    const apres = recalcProfile(p, T);
    // Sous l'ancienne règle (rev 7), ce corps calculait en Mifflin pur.
    const ancienBmr = Math.round(mifflinRaw(p));
    const ancienTdee = Math.round(ancienBmr * NEAT_PAL.desk);
    const migre = recalcProfile(
      { ...apres, engine_rev: 7, tdee_kcal: ancienTdee, target_kcal: ancienTdee, engine_notice: undefined }, T,
    );
    expect(migre.target_kcal).toBeGreaterThan(ancienTdee);
    expect(migre.engine_notice).toBeDefined();
    expect(migre.engine_notice!.rev).toBe(ENGINE_REV);
    expect(migre.engine_notice!.fromRev).toBe(7);
    // Pas de cause rev 7 : les textes « floor_lifted » / « goal_merged » seraient
    // des mensonges pour quelqu'un dont la cible n'a bougé que par R6.
    expect(migre.engine_notice!.cause).toBeUndefined();
    expect(migre.engine_notice!.to).toBeGreaterThan(migre.engine_notice!.from);
  });

  it('déterminisme et idempotence sur un corps en zone de mélange', () => {
    const un = recalcProfile(p, T);
    const deux = recalcProfile(un, T);
    expect(deux.tdee_kcal).toBe(un.tdee_kcal);
    expect(deux.target_kcal).toBe(un.target_kcal);
    expect(recalcProfile(p, T).tdee_kcal).toBe(un.tdee_kcal);
  });
});
