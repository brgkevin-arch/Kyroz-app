import { describe, it, expect } from 'vitest';
import {
  ENGINE_REV, calculateBMR, katchEligible, katchRetenu, katchRaw, mifflinRaw,
  recalcProfile, bandeBmr, BLEND_START,
} from '../tdee';
import type { BmrBody } from '../tdee';
import { highAdiposity, HIGH_ADIPOSITY_PCT } from '../safety';
import { makeProfile } from './helpers';
import { Sex } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTAT 02-01 (P0) — « Katch-McArdle est servi à adiposité élevée dès que le
// %MG est mesuré ».
//
// 🔴 CE QUE LE DÉFAUT COÛTAIT. `calculateBMR` faisait `if (katchEligible(b)) return
// katchRaw(b)` : le %MG mesuré donnait un accès DIRECT à Katch, sans jamais demander
// si Katch avait un sens à cette adiposité. Or Katch compte le tissu adipeux à zéro
// kcal, donc son erreur croît avec la masse grasse. Mesuré sur le moteur, homme de
// 120 kg / 178 cm / 40 ans : BMR servi **−322 kcal/j** sous Mifflin à 45 % de MG,
// **−452** à 50 %. En plus du déficit demandé, et sans qu'aucun plancher ne le voie.
//
// 🔴 ET LA RECO PUBLIÉE DEMANDAIT DEUX RÈGLES DIFFÉRENTES SANS LE VOIR.
//  · « soumettre le chemin *mesuré* à la même asymétrie que le chemin *estimé* » — juste ;
//  · « au-dessus du seuil d'adiposité, servir Mifflin » — FAUX, et mesurément :
//    couper à un seuil FIXE introduit une marche de **571 kcal/j vers le BAS** chez les
//    gabarits lourds, à 30,01 % de MG. Elle ferait manger MOINS les corps que le constat
//    voulait protéger, et rouvrirait la discontinuité que `CA-2-01` venait de fermer.
//
// Ce fichier tient les deux moitiés : la propriété de sécurité (§1-2), et le
// contre-exemple qui interdit de « corriger » vers la reco publiée (§3).
// ─────────────────────────────────────────────────────────────────────────────

const GRILLE: BmrBody[] = [];
for (const sex of ['male', 'female'] as Sex[])
  for (const weight_kg of [50, 65, 80, 95, 110, 130, 160])
    for (const height_cm of [150, 162, 175, 188, 200])
      for (const age of [18, 30, 45, 65])
        for (let body_fat_pct = 5; body_fat_pct <= 60; body_fat_pct += 5)
          GRILLE.push({ sex, weight_kg, height_cm, age, body_fat_pct, body_fat_source: 'measured' });

describe('1 — la propriété de sécurité : un %MG mesuré ne peut plus faire baisser le BMR', () => {
  it('le cas du constat : H 120 kg à 45 % de MG ne perd plus 322 kcal/j', () => {
    const b: BmrBody = { sex: 'male', weight_kg: 120, height_cm: 178, age: 40,
      body_fat_pct: 45, body_fat_source: 'measured' };
    // La prémisse du constat, re-mesurée et non recopiée : Katch est bien 322 sous Mifflin.
    expect(Math.round(mifflinRaw(b)) - Math.round(katchRaw(b))).toBe(322);
    // Et ce n'est plus lui qui est servi.
    expect(katchRetenu(b)).toBe(false);
    expect(calculateBMR(b)).toBe(Math.round(mifflinRaw(b)));
  });

  it('sur 2 800 corps mesurés, le BMR servi n’est JAMAIS sous Mifflin', () => {
    let sousMifflinAvant = 0;
    for (const b of GRILLE) {
      const cle = `${b.sex} ${b.weight_kg}kg ${b.height_cm}cm ${b.age}a ${b.body_fat_pct}%`;
      expect(calculateBMR(b), cle).toBeGreaterThanOrEqual(Math.round(mifflinRaw(b)));
      if (Math.round(katchRaw(b)) < Math.round(mifflinRaw(b))) sousMifflinAvant++;
    }
    // ⚠️ La grille doit RÉELLEMENT contenir des corps que l'ancienne règle sous-servait,
    // sinon l'invariant ci-dessus serait vrai d'avance et ne prouverait rien.
    expect(sousMifflinAvant).toBeGreaterThan(500);
  });

  it('et il ne monte jamais au-dessus de Katch quand Katch est au-dessus', () => {
    for (const b of GRILLE) {
      if (katchRaw(b) <= mifflinRaw(b)) continue;
      expect(calculateBMR(b), `${b.sex} ${b.weight_kg}kg ${b.body_fat_pct}%`)
        .toBe(Math.round(katchRaw(b)));
    }
  });
});

describe('2 — aucune falaise : la bascule est continue par construction', () => {
  it('un dixième de point de %MG ne peut pas déplacer plus de 10 kcal de BMR', () => {
    // Balayage FIN autour de la zone où la bascule a lieu, sur des gabarits lourds —
    // c'est là que la règle du SEUIL produisait sa marche de 571 kcal/j.
    let pire = 0, pireCle = '';
    for (const sex of ['male', 'female'] as Sex[])
      for (const weight_kg of [80, 110, 140, 160])
        for (const height_cm of [150, 170, 190])
          for (const age of [25, 45, 65]) {
            let prec: number | null = null;
            for (let bf = 10; bf <= 55; bf += 0.1) {
              const b: BmrBody = { sex, weight_kg, height_cm, age,
                body_fat_pct: Math.round(bf * 10) / 10, body_fat_source: 'measured' };
              const v = calculateBMR(b);
              if (prec !== null && Math.abs(v - prec) > pire) {
                pire = Math.abs(v - prec);
                pireCle = `${sex} ${weight_kg}kg ${height_cm}cm ${age}a vers ${bf.toFixed(1)}%`;
              }
              prec = v;
            }
          }
    expect(pire, `pire marche : ${pireCle}`).toBeLessThanOrEqual(10);
  });
});

describe('3 — le contre-exemple : la reco publiée aurait fait manger MOINS', () => {
  // ⚠️ CE BLOC INTERDIT UNE « CORRECTION » VERS LA RECO PUBLIÉE. Quiconque remplace
  // `katchRetenu` par `!highAdiposity(b)` fait rougir ces trois tests, et lit pourquoi.
  const LOURD: BmrBody = { sex: 'male', weight_kg: 160, height_cm: 150, age: 65,
    body_fat_pct: 30.01, body_fat_source: 'measured' };

  it('au-dessus du seuil d’adiposité, Katch reste servi quand il sert PLUS', () => {
    expect(highAdiposity(LOURD)).toBe(true);
    expect(katchRaw(LOURD)).toBeGreaterThan(mifflinRaw(LOURD));
    expect(katchRetenu(LOURD)).toBe(true);
    expect(calculateBMR(LOURD)).toBe(Math.round(katchRaw(LOURD)));
  });

  it('la marche qu’aurait introduite le seuil se chiffre, et elle est énorme', () => {
    // Ce que la reco publiée aurait retiré à ce corps, en franchissant 30 % de MG.
    const marche = Math.round(katchRaw(LOURD)) - Math.round(mifflinRaw(LOURD));
    expect(marche).toBeGreaterThan(500);
  });

  it('le croisement des deux formules N’EST PAS le seuil d’adiposité', () => {
    // Le seuil est fixe (30 / 40 %). Le croisement, lui, dépend du gabarit — mesuré
    // de 6 à 52 % de MG. Couper au seuil coupe donc au mauvais endroit, des DEUX côtés.
    const croisements = new Set<number>();
    for (const sex of ['male', 'female'] as Sex[])
      for (const weight_kg of [50, 80, 110, 160])
        for (const height_cm of [150, 175, 200])
          for (const age of [18, 45, 65]) {
            let prec: number | null = null;
            for (let bf = 5; bf <= 60; bf++) {
              const b: BmrBody = { sex, weight_kg, height_cm, age, body_fat_pct: bf, body_fat_source: 'measured' };
              const s = Math.sign(katchRaw(b) - mifflinRaw(b));
              if (prec === 1 && s <= 0) croisements.add(bf);
              prec = s;
            }
          }
    const vals = [...croisements].sort((a, b) => a - b);
    // Au moins une dizaine de %MG de croisement distincts, et de part et d'autre des
    // DEUX seuils : aucun nombre fixe ne peut les représenter.
    expect(vals.length).toBeGreaterThan(8);
    expect(Math.min(...vals)).toBeLessThan(HIGH_ADIPOSITY_PCT.male);
    expect(Math.max(...vals)).toBeGreaterThan(HIGH_ADIPOSITY_PCT.female);
  });
});

describe('4 — mesuré ≠ estimé : la bande morte reste la seule différence', () => {
  // Gabarit trouvé par BALAYAGE (marge 29,4 kcal des deux côtés de la fenêtre) : Katch
  // dépasse Mifflin, mais de moins d'une demi-bande. Le mesuré prend Katch entier ;
  // l'estimé attend que l'écart sorte du bruit d'une silhouette (±5 pts).
  const B = { sex: 'male' as const, weight_kg: 110, height_cm: 160, age: 25, body_fat_pct: 31 };

  it('dans la bande morte, la provenance décide encore', () => {
    const d = katchRaw(B) - mifflinRaw(B);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(BLEND_START * bandeBmr(B.weight_kg));
    expect(calculateBMR({ ...B, body_fat_source: 'measured' })).toBe(Math.round(katchRaw(B)));
    expect(calculateBMR({ ...B, body_fat_source: 'estimated' })).toBe(Math.round(mifflinRaw(B)));
  });

  it('`katchEligible` reste le prédicat de PROVENANCE, il n’a pas changé de sens', () => {
    // Les deux prédicats sont distincts et le restent : l'un dit si le chiffre a le
    // droit d'alimenter Katch, l'autre si Katch est effectivement servi. Les fondre
    // ferait perdre la question « ce %MG est-il mesuré ? », que trois écrans posent.
    expect(katchEligible({ ...B, body_fat_source: 'measured' })).toBe(true);
    const gras = { ...B, body_fat_pct: 50, body_fat_source: 'measured' as const };
    expect(katchEligible(gras)).toBe(true);   // la provenance est bonne…
    expect(katchRetenu(gras)).toBe(false);    // …mais Katch ne sert plus.
  });
});

describe('5 — l’avertissement one-shot part, et il ne ment pas', () => {
  const T = '2026-08-27';

  it('ENGINE_REV a été incrémenté', () => {
    // ⚠️ Épinglé : la rev 10 déplace 344 406 profils du chemin « mesuré », dont
    // 300 397 de plus de 100 kcal/j. Sans bump, ils seraient servis SANS un mot.
    expect(ENGINE_REV).toBe(10);
  });

  it('un profil déplacé par la rev 10 reçoit la cause `measured_bmr`', () => {
    const p = makeProfile({ sex: 'male', weight_kg: 120, height_cm: 178, age: 40,
      body_fat_pct: 45, body_fat_source: 'measured', goal: 'cut', macro_mode: 'auto' });
    const apres = recalcProfile(p, T);
    // On simule un compte resté à la rev 9, avec la cible que la rev 9 lui servait.
    const ancien = Math.round(mifflinRaw(p) + 0); // repère, non utilisé dans l'assertion
    const migre = recalcProfile({ ...apres, engine_rev: 9, engine_notice: undefined,
      target_kcal: apres.target_kcal - 400 }, T);
    expect(migre.engine_notice).toBeDefined();
    expect(migre.engine_notice!.rev).toBe(ENGINE_REV);
    expect(migre.engine_notice!.cause).toBe('measured_bmr');
    expect(migre.engine_notice!.to).toBeGreaterThan(migre.engine_notice!.from);
    expect(ancien).toBeGreaterThan(0);
  });

  it('un profil ESTIMÉ ne reçoit JAMAIS `measured_bmr`', () => {
    // La cause interroge le moteur (`katchEligible`), elle ne lit pas le trajet : un
    // %MG estimé dont la cible monte pour une autre raison ne doit pas s'entendre dire
    // qu'on a corrigé sa mesure.
    const p = makeProfile({ sex: 'female', weight_kg: 68, height_cm: 170, age: 28,
      body_fat_pct: 18, body_fat_source: 'estimated', goal: 'maintain', macro_mode: 'auto' });
    const apres = recalcProfile(p, T);
    const migre = recalcProfile({ ...apres, engine_rev: 7, engine_notice: undefined,
      target_kcal: apres.target_kcal - 300 }, T);
    expect(migre.engine_notice).toBeDefined();
    expect(migre.engine_notice!.cause).not.toBe('measured_bmr');
  });

  it('un profil MESURÉ que la rev 10 n’a PAS déplacé ne reçoit pas `measured_bmr`', () => {
    // ⚠️ Le piège du tag posé à la main. « `body_fat_source` vaut measured et la cible
    // monte » aurait suffi à faire passer les tests ci-dessus — et aurait nommé une
    // cause fausse à tous les %MG mesurés dont la cible remonte pour autre chose. Ce
    // corps est mesuré ET sert Katch : la rev 10 ne l'a pas touché.
    const p = makeProfile({ sex: 'female', weight_kg: 70, height_cm: 168, age: 32,
      body_fat_pct: 15, body_fat_source: 'measured', goal: 'maintain', macro_mode: 'auto' });
    expect(katchRetenu(p)).toBe(true);   // Katch sert plus : rien à corriger ici
    const apres = recalcProfile(p, T);
    const migre = recalcProfile({ ...apres, engine_rev: 7, engine_notice: undefined,
      target_kcal: apres.target_kcal - 300 }, T);
    expect(migre.engine_notice).toBeDefined();
    expect(migre.engine_notice!.cause).not.toBe('measured_bmr');
  });

  it('`floor_lifted` ne peut pas être servi sur une HAUSSE', () => {
    // Son texte à l'écran dit « ton budget baisse ». Le servir sur une hausse est le
    // mensonge exact qu'`EngineNoticeCard` interdit.
    //
    // ⚠️ **CE TEST A DÉJÀ ÉTÉ ÉCRIT UNE FOIS POUR RIEN**, et seule la mutation l'a dit :
    // sa 1ʳᵉ version prenait un corps MESURÉ à 45 % de MG, qui reçoit `measured_bmr` —
    // renvoyée AVANT que `floor_lifted` soit seulement calculée. Le test passait sans
    // jamais atteindre la branche qu'il prétendait garder, et retirer le garde de signe
    // le laissait vert. Il faut donc un corps à forte adiposité que la rev 10 NE déplace
    // PAS : %MG estimé, donc `katchEligible` faux, donc `measured_bmr` muette.
    const p = makeProfile({ sex: 'male', weight_kg: 120, height_cm: 178, age: 40,
      body_fat_pct: 45, body_fat_source: 'estimated', goal: 'cut', macro_mode: 'auto' });
    expect(highAdiposity(p)).toBe(true);
    expect(katchEligible(p)).toBe(false);   // la garantie que `measured_bmr` ne sortira pas
    const apres = recalcProfile(p, T);
    const migre = recalcProfile({ ...apres, engine_rev: 6, engine_notice: undefined,
      target_kcal: apres.target_kcal - 400 }, T);
    expect(migre.engine_notice!.to).toBeGreaterThan(migre.engine_notice!.from);
    expect(migre.engine_notice!.cause).not.toBe('floor_lifted');
  });
});
