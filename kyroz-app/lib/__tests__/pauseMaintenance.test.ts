// ── PAUSE À LA MAINTENANCE (2026-08-10) ─────────────────────────────────────
//
// Ce que ce fichier défend, et pourquoi chaque test existe :
//
//  1. la CADENCE : 8 semaines de déficit, puis UNE de pause. Pas deux — la première
//     version en servait deux, et ça ne se voyait NI à la relecture NI dans la suite ;
//  2. le PÉRIMÈTRE : une seule protection par personne. La pause va là où l'escalade
//     RED-S ne peut rien, jamais par-dessus elle ;
//  3. l'IDEMPOTENCE : deux recalculs le même jour donnent le même plan ;
//  4. la PROJECTION : la date annoncée compte les pauses. Sinon elle ment de ~11 % ;
//  5. le CHEMIN : la pause traverse les trois modes de macros, `manual` compris.

import { describe, it, expect } from 'vitest';
import {
  DIET_BREAK_AFTER_WEEKS, consecutiveDeficitWeeksBefore, dietBreakApplies, dietBreakDue,
  forgetCurrentWeek, readLowEaRegistry, weekStartStamp,
} from '../safety';
import { computePlan, recalcProfile, makeWeeklyProjector, planFloorKcal } from '../tdee';
import { addDaysStamp, datedGoalStatus, simulatedTrajectory } from '../datedGoal';
import { makeProfile } from './helpers';
import type { GoalTarget, UserProfile } from '../types';

/** Ancrage FIXE, et un LUNDI : les semaines du registre sont des lundis. */
const LUNDI = '2026-01-05';

/** Fait vivre `semaines` semaines réelles, une par recalcul, et rend ce qui a été servi. */
function vivre(p0: UserProfile, semaines: number) {
  let p = p0;
  const suivi: { semaine: number; stamp: string; cible: number; tdee: number; pause: boolean }[] = [];
  for (let i = 0; i < semaines; i++) {
    const stamp = addDaysStamp(LUNDI, 7 * i);
    const r = computePlan(p, stamp);
    p = r.profile;
    suivi.push({
      semaine: i, stamp, cible: p.target_kcal, tdee: p.tdee_kcal,
      pause: r.flags.includes('DIET_BREAK_WEEK'),
    });
  }
  return { suivi, profil: p };
}

/** Homme sédentaire en sèche — l'escalade RED-S ne l'a JAMAIS protégé (cf. dietBreakApplies). */
const LUI = () => makeProfile({
  sex: 'male', age: 35, weight_kg: 95, height_cm: 180, body_fat_pct: 22,
  goal: 'cut', macro_mode: 'auto', sports: [], training_days_per_week: 0,
  low_ea_weeks: [], deficit_weeks: undefined,
});

describe('cadence — 8 semaines de déficit, UNE de pause', () => {
  it('la première pause tombe à la 9ᵉ semaine, pas avant', () => {
    const { suivi } = vivre(LUI(), DIET_BREAK_AFTER_WEEKS + 1);
    for (let i = 0; i < DIET_BREAK_AFTER_WEEKS; i++) {
      expect(suivi[i].pause, `semaine ${i}`).toBe(false);
      expect(suivi[i].cible).toBeLessThan(suivi[i].tdee);
    }
    expect(suivi[DIET_BREAK_AFTER_WEEKS].pause).toBe(true);
    expect(suivi[DIET_BREAK_AFTER_WEEKS].cible).toBe(suivi[DIET_BREAK_AFTER_WEEKS].tdee);
  });

  it('🔴 la pause dure UNE semaine — la v1 en servait DEUX, en silence', () => {
    // Le défaut : `settleLowEaExposure` solde le temps écoulé depuis `since`, semaine
    // COURANTE comprise. Elle réinscrivait donc la semaine de pause au registre AVANT
    // même que le plan de pause soit calculé ; la semaine suivante voyait une série de
    // 9 et repartait pour un tour. Invisible à la relecture, invisible dans la suite —
    // seule une trace semaine par semaine l'a montré. `forgetCurrentWeek` le ferme.
    const { suivi } = vivre(LUI(), 30);
    const pauses = suivi.filter((s) => s.pause).map((s) => s.semaine);
    expect(pauses).toEqual([8, 17, 26]);
    // Deux pauses ne se touchent jamais.
    for (let i = 1; i < pauses.length; i++) {
      expect(pauses[i] - pauses[i - 1]).toBe(DIET_BREAK_AFTER_WEEKS + 1);
    }
  });

  it('`forgetCurrentWeek` retire la semaine courante, et elle seule', () => {
    const reg = { weeks: ['2025-12-29', '2026-01-05'], since: '2026-01-05' };
    const apres = forgetCurrentWeek(reg, LUNDI);
    expect(apres.weeks).toEqual(['2025-12-29']);
    expect(apres.since).toBe('2026-01-05'); // `since` n'est pas son affaire
    // Rien à retirer → MÊME référence (pas de recopie inutile).
    expect(forgetCurrentWeek(apres, LUNDI)).toBe(apres);
  });

  it('une semaine sans déficit CASSE la série — la pause n\'est pas un compteur cumulé', () => {
    // Quelqu'un qui passe en maintien trois semaines puis revient en sèche repart de
    // zéro : la pause protège d'un déficit CONTINU, pas d'un cumul sur l'année (c'est
    // le rôle de `low_ea_weeks`, et c'est ce qui distingue les deux registres).
    let p = LUI();
    for (let i = 0; i < 5; i++) p = computePlan(p, addDaysStamp(LUNDI, 7 * i)).profile;
    p = computePlan({ ...p, goal: 'maintain' }, addDaysStamp(LUNDI, 7 * 5)).profile;
    expect(consecutiveDeficitWeeksBefore(p.deficit_weeks, addDaysStamp(LUNDI, 7 * 6))).toBe(0);
  });
});

describe('périmètre — une seule protection par personne', () => {
  it('un homme y a droit à toute adiposité : il n\'avait RIEN', () => {
    for (const pct of [12, 22, 35]) {
      expect(dietBreakApplies({ sex: 'male', age: 35, weight_kg: 95, height_cm: 180, body_fat_pct: pct }), `${pct}%`)
        .toBe(true);
    }
  });

  it('une femme non ménopausée SOUS le seuil relève de l\'escalade, pas de la pause', () => {
    // Les empiler les fait se battre : pendant une pause le plan n'est plus restrictif,
    // donc `since` retombe à null et l'escalade n'arrive jamais à son terme — la carte
    // qui promet « ta cible montera de X par semaine jusqu'à la semaine N » devient
    // fausse. Trois tests de `sortie-deficit-ea` l'ont dit d'un coup.
    const elle = { sex: 'female' as const, age: 30, weight_kg: 70, height_cm: 165, body_fat_pct: 30 };
    expect(dietBreakApplies(elle)).toBe(false);
    expect(dietBreakDue(elle, { weeks: [], since: null }, LUNDI)).toBe(false);
  });

  it('… mais AU-DESSUS du seuil elle y a droit : l\'escalade n\'y protège plus rien', () => {
    // Depuis ENGINE_REV 7, `countsAsLowEaWeek` rend false au-dessus du seuil, donc son
    // budget ne se consomme plus, donc son plancher ne remonte jamais. Sans la pause,
    // elle n'aurait AUCUNE sortie de déficit — c'est le trou que ce chantier a ouvert.
    expect(dietBreakApplies({ sex: 'female', age: 30, weight_kg: 120, height_cm: 165, body_fat_pct: 45 }))
      .toBe(true);
  });

  it('une femme ménopausée déclarée y a droit : l\'escalade ne l\'a jamais couverte', () => {
    expect(dietBreakApplies({
      sex: 'female', age: 55, weight_kg: 70, height_cm: 165, body_fat_pct: 30, is_post_menopausal: true,
    })).toBe(true);
  });
});

describe('idempotence et chemins', () => {
  it('deux recalculs le MÊME jour servent le même plan', () => {
    // La semaine courante ne doit pas décider du plancher qui décide si elle compte.
    let p = LUI();
    for (let i = 0; i < DIET_BREAK_AFTER_WEEKS; i++) p = computePlan(p, addDaysStamp(LUNDI, 7 * i)).profile;
    const jour = addDaysStamp(LUNDI, 7 * DIET_BREAK_AFTER_WEEKS);
    const a = computePlan(p, jour);
    const b = computePlan(a.profile, jour);
    expect(b.profile.target_kcal).toBe(a.profile.target_kcal);
    expect(b.flags.includes('DIET_BREAK_WEEK')).toBe(true);
    expect(readLowEaRegistry(b.profile.deficit_weeks).weeks)
      .toEqual(readLowEaRegistry(a.profile.deficit_weeks).weeks);
  });

  it('la pause traverse le mode `manual` — le chemin qui a déjà servi à contourner un plancher', () => {
    let p = LUI();
    for (let i = 0; i < DIET_BREAK_AFTER_WEEKS; i++) p = computePlan(p, addDaysStamp(LUNDI, 7 * i)).profile;
    const manuel = computePlan(
      { ...p, macro_mode: 'manual' }, addDaysStamp(LUNDI, 7 * DIET_BREAK_AFTER_WEEKS),
    );
    expect(manuel.flags).toContain('DIET_BREAK_WEEK');
    // ⚠️ `toBe(tdee)` serait FAUX ici, et pas d'un bug : en mode manual la cible se
    // recompose en GRAMMES pour rejoindre le plancher, et l'arrondi au gramme la place
    // à quelques kcal au-dessus (mesuré : 2479 pour 2477). Ce qui compte est qu'elle
    // ne soit plus en déficit.
    expect(manuel.profile.target_kcal).toBeGreaterThanOrEqual(manuel.profile.tdee_kcal);
    expect(manuel.profile.target_kcal - manuel.profile.tdee_kcal).toBeLessThan(10);
  });

  it('la pause ne se déclenche PAS sur un objectif sans déficit', () => {
    // Sinon le plancher rejoindrait la cible et lèverait un drapeau pour un plan que
    // rien ne contraint — le piège que `underweightCapped` avait déjà payé.
    const { suivi } = vivre(makeProfile({ ...LUI(), goal: 'lean_bulk' }) as UserProfile, 20);
    expect(suivi.some((s) => s.pause)).toBe(false);
  });

  it('nomme `diet_break` comme source du plancher, pas un minimum physiologique', () => {
    let p = LUI();
    for (let i = 0; i < DIET_BREAK_AFTER_WEEKS; i++) p = computePlan(p, addDaysStamp(LUNDI, 7 * i)).profile;
    const r = computePlan(p, addDaysStamp(LUNDI, 7 * DIET_BREAK_AFTER_WEEKS));
    expect(r.clamp!.source).toBe('diet_break');
  });
});

describe('la date annoncée compte les pauses', () => {
  it('la trajectoire SIMULÉE porte des paliers plats, un toutes les 9 semaines', () => {
    // 🔴 Sans ça, la date annoncée décrit une sèche sans aucune pause quand le moteur en
    // servira une toutes les 9 semaines. C'est le défaut A15/P1.6 rejoué, et §10
    // l'interdit nommément : un suivi se dessine sur ce que le moteur SERT.
    //
    // ⚠️ On lit la trajectoire elle-même plutôt que de comparer deux corps témoins.
    // La version d'origine opposait une femme ménopausée à une non ménopausée (seules
    // séparées par `dietBreakApplies`) — sauf que le témoin n'était pas PROJETABLE, donc
    // le test rendait `null` et ne mesurait rien. Un palier plat dans le journal est la
    // preuve DIRECTE que le simulateur sert la pause ; il ne dépend d'aucun témoin.
    const p = recalcProfile(makeProfile({
      ...LUI(),
      goal_target: {
        target_weight_kg: 85, target_date: addDaysStamp(LUNDI, 7 * 60),
        start_weight_kg: 95, start_date: LUNDI,
      },
    }) as UserProfile, LUNDI);
    const journal = simulatedTrajectory(p, p.goal_target!, LUNDI, makeWeeklyProjector(p));
    expect(journal.length).toBeGreaterThan(DIET_BREAK_AFTER_WEEKS + 2);

    // Un palier = une semaine où le poids ne bouge pas d'un gramme.
    const paliers: number[] = [];
    for (let i = 1; i < journal.length; i++) {
      if (Math.abs(journal[i].weightKg - journal[i - 1].weightKg) < 1e-9) paliers.push(i);
    }
    expect(paliers.length, `paliers aux semaines ${paliers.join(', ')}`).toBeGreaterThan(0);
    // Le premier tombe juste APRÈS 8 semaines de déficit — pas au démarrage.
    expect(paliers[0]).toBe(DIET_BREAK_AFTER_WEEKS + 1);
    // Et ils sont espacés de 9, jamais collés (la pause dure UNE semaine, cf. plus haut).
    for (let i = 1; i < paliers.length; i++) {
      expect(paliers[i] - paliers[i - 1]).toBe(DIET_BREAK_AFTER_WEEKS + 1);
    }
  });

  it('une pause n\'est pas un ARRÊT : la trajectoire garde une date', () => {
    // À la maintenance le rythme vaut ~0, et le test « à l'arrêt » du simulateur
    // renvoyait `Infinity` — donc « aucune date » — pour une semaine PRÉVUE, sur une
    // sèche parfaitement saine. Mesuré en écrivant le mécanisme.
    const p = recalcProfile(makeProfile({
      ...LUI(),
      goal_target: {
        target_weight_kg: 85, target_date: addDaysStamp(LUNDI, 7 * 40),
        start_weight_kg: 95, start_date: LUNDI,
      },
    }) as UserProfile, LUNDI);
    const st = datedGoalStatus(
      p.goal_target, p, LUNDI, p.tdee_kcal, planFloorKcal(p, LUNDI), makeWeeklyProjector(p),
    )!;
    expect(st.projectable).toBe(true);
    expect(st.projectedDate).toBeTruthy();
  });
});

describe('le registre reste sain', () => {
  it('ne contient que des lundis, et reste borné', () => {
    const { profil } = vivre(LUI(), 40);
    const { weeks } = readLowEaRegistry(profil.deficit_weeks);
    expect(weeks.length).toBeGreaterThan(0);
    for (const w of weeks) expect(weekStartStamp(w), w).toBe(w);
    expect(weeks.length).toBeLessThanOrEqual(60);
  });
});
