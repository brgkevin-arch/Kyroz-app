import { describe, it, expect } from 'vitest';
import { decideProfileHydration, normalizeCalorieBank, normalizeMeals, normalizeProfileActivity, normalizeVariety, reconcileCloudSports } from '../syncGuard';
import { offsetsForPlan, servedWeekdays } from '../calorieBank';
import { SportSession, UserProfile } from '../types';

const SPORTS: SportSession[] = [
  { type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 },
  { type: 'course', sessions_per_week: 2, minutes_per_session: 30 },
]; // total = 6 séances/semaine

// Garde-fou anti-écrasement du profil (problème C du brief macros-calories).
// La règle clé : un profil local NON confirmé poussé (dirty) ne doit jamais être
// écrasé par le cloud — sinon un push rejeté en silence = onboarding/édition perdus.
describe('decideProfileHydration', () => {
  it('local dirty → keep_local, MÊME si le cloud a une ligne (le garde-fou)', () => {
    expect(decideProfileHydration({ hasCloud: true, hasLocal: true, localDirty: true })).toBe('keep_local');
    expect(decideProfileHydration({ hasCloud: false, hasLocal: true, localDirty: true })).toBe('keep_local');
  });

  it('local propre + cloud présent → pull_cloud (réinstall / multi-appareils)', () => {
    expect(decideProfileHydration({ hasCloud: true, hasLocal: true, localDirty: false })).toBe('pull_cloud');
    expect(decideProfileHydration({ hasCloud: true, hasLocal: false, localDirty: false })).toBe('pull_cloud');
  });

  it('cloud vide + local présent → push_local', () => {
    expect(decideProfileHydration({ hasCloud: false, hasLocal: true, localDirty: false })).toBe('push_local');
  });

  it('rien des deux côtés → noop', () => {
    expect(decideProfileHydration({ hasCloud: false, hasLocal: false, localDirty: false })).toBe('noop');
  });

  it('dirty mais pas de local (flag résiduel post-logout) → le cloud peut hydrater', () => {
    expect(decideProfileHydration({ hasCloud: true, hasLocal: false, localDirty: true })).toBe('pull_cloud');
  });
});

// Fix P3.3 « TDEE qui saute » — cohérence sports ↔ training_days_per_week.
// La cause racine : les deux entrées d'activité peuvent diverger et faire basculer
// `calculateTDEE` (MET → multiplicateur) en silence. On la rend impossible.
describe('normalizeProfileActivity (P3.3)', () => {
  it('sports renseigné → recale training_days_per_week sur le total des séances', () => {
    const p = normalizeProfileActivity({ sports: SPORTS, training_days_per_week: 0 });
    expect(p!.training_days_per_week).toBe(6); // 4 + 2, plus jamais 0 avec des sports
  });

  it('compteur déjà cohérent → renvoie l\'objet TEL QUEL (pas de recopie inutile)', () => {
    const p = { sports: SPORTS, training_days_per_week: 6 };
    expect(normalizeProfileActivity(p)).toBe(p);
  });

  it('sports vide + compteur > 0 → intouché (profil legacy légitime, pas la divergence)', () => {
    const p = { sports: [], training_days_per_week: 3 };
    expect(normalizeProfileActivity(p)).toBe(p);
    expect(normalizeProfileActivity({ training_days_per_week: 4 })!.training_days_per_week).toBe(4);
  });

  it('null → null (pas de profil chargé)', () => {
    expect(normalizeProfileActivity(null)).toBeNull();
  });
});

describe('reconcileCloudSports (P3.3)', () => {
  it('cloud sans sports + local avec sports → préserve les séances locales', () => {
    const cloud = { sports: undefined, training_days_per_week: 6 };
    const merged = reconcileCloudSports(cloud as any, { sports: SPORTS });
    expect(merged.sports).toEqual(SPORTS); // le cloud vide n'efface PAS le sport local
  });

  it('cloud sports = [] (ligne partielle) + local renseigné → préserve le local', () => {
    const merged = reconcileCloudSports({ sports: [] } as any, { sports: SPORTS });
    expect(merged.sports).toEqual(SPORTS);
  });

  it('cloud A JETON de sports → le cloud fait foi (multi-appareils réel)', () => {
    const cloudSports: SportSession[] = [{ type: 'velo', sessions_per_week: 3, minutes_per_session: 60 }];
    const merged = reconcileCloudSports({ sports: cloudSports } as any, { sports: SPORTS });
    expect(merged.sports).toEqual(cloudSports); // on n'écrase pas un vrai sport cloud par le local
  });

  it('ni l\'un ni l\'autre → cloud tel quel (reste sur le repli legacy, pas un bug)', () => {
    const cloud = { training_days_per_week: 3 };
    expect(reconcileCloudSports(cloud as any, { sports: [] })).toBe(cloud);
  });

  it('chaîné : pull cloud sans sports → sports préservé PUIS compteur recalé (le TDEE ne saute plus)', () => {
    // Scénario exact du bug : ligne cloud dégradée (sports perdu), local sain.
    const cloud = { sports: undefined, training_days_per_week: 6 };
    const healed = normalizeProfileActivity(reconcileCloudSports(cloud as any, { sports: SPORTS }));
    expect(healed!.sports).toEqual(SPORTS);       // MET conservé → calcul précis
    expect(healed!.training_days_per_week).toBe(6); // cohérent avec les séances
  });
});

// ── Préférence de variété hors barème ────────────────────────────────────────
// Trouvée sur un profil réel : `variety: 'high'`, valeur qui n'a jamais existé dans
// l'énumération. Elle était doublement invisible — le moteur retombait sur
// « équilibré » sans le dire, et l'éditeur n'affichait aucune carte sélectionnée.
describe('normalizeVariety — un réglage fantôme ne doit pas survivre au chargement', () => {
  it('« high » devient « max » (le cran de variété le plus haut, intention sans ambiguïté)', () => {
    expect(normalizeVariety({ variety: 'high' as never })!.variety).toBe('max');
  });

  it('« low » devient « repetitive »', () => {
    expect(normalizeVariety({ variety: 'low' as never })!.variety).toBe('repetitive');
  });

  it('toute autre valeur inconnue retombe sur « balanced » — le défaut de l’onboarding', () => {
    expect(normalizeVariety({ variety: 'wtf' as never })!.variety).toBe('balanced');
    expect(normalizeVariety({ variety: '' as never })!.variety).toBe('balanced');
  });

  it('une valeur VALIDE est rendue telle quelle, sans recopier l’objet', () => {
    for (const v of ['repetitive', 'balanced', 'max'] as const) {
      const p = { variety: v };
      expect(normalizeVariety(p)).toBe(p);   // même référence : aucun rendu inutile
    }
  });

  it('ne fabrique pas une valeur quand le champ est absent (≠ « pas d’info »)', () => {
    const p = { weight_kg: 80 };
    expect(normalizeVariety(p)).toBe(p);
    expect(normalizeVariety(null)).toBeNull();
  });

  it('laisse le reste du profil intact', () => {
    const out = normalizeVariety({ variety: 'high' as never, weight_kg: 84, goal: 'cut' as const });
    expect(out).toEqual({ variety: 'max', weight_kg: 84, goal: 'cut' });
  });
});

// ── `meals` qui n'est pas un tableau ─────────────────────────────────────────
// Vu sur un profil RÉEL : `meals: 4`. Le moteur l'absorbait (`Array.isArray`), mais
// l'écran « Paramètres des repas » crashait sur `meals.includes` — réglage mort.
describe('normalizeMeals — un `meals` non-tableau tuait un écran entier', () => {
  it('le NOMBRE 4 devient les 4 repas — exactement ce que le moteur servait déjà', () => {
    expect(normalizeMeals({ meals: 4 as never })!.meals).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });

  it('un nombre plus petit garde les N premiers repas (l’intention « N repas »)', () => {
    expect(normalizeMeals({ meals: 3 as never })!.meals).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(normalizeMeals({ meals: 1 as never })!.meals).toEqual(['breakfast']);
  });

  it('un nombre absurde est borné, jamais propagé', () => {
    expect(normalizeMeals({ meals: 99 as never })!.meals).toHaveLength(4);
    expect(normalizeMeals({ meals: 0 as never })!.meals).toHaveLength(4);
    expect(normalizeMeals({ meals: -2 as never })!.meals).toHaveLength(4);
  });

  it('toute autre forme inexploitable retombe sur les 4 repas', () => {
    expect(normalizeMeals({ meals: 'brunch' as never })!.meals).toHaveLength(4);
    expect(normalizeMeals({ meals: [] as never })!.meals).toHaveLength(4);
    expect(normalizeMeals({ meals: ['brunch'] as never })!.meals).toHaveLength(4);
  });

  it('un tableau VALIDE est rendu tel quel, sans recopier l’objet', () => {
    const p = { meals: ['breakfast', 'dinner'] as const };
    expect(normalizeMeals(p as never)).toBe(p);
  });

  it('ne fabrique rien quand le champ est absent', () => {
    const p = { weight_kg: 84 };
    expect(normalizeMeals(p)).toBe(p);
    expect(normalizeMeals(null)).toBeNull();
  });
});


// ── Écart orphelin de « Jours plus copieux » (2026-08-18) ────────────────────
//
// Le défaut MESURÉ : « Sam +600 » posé, puis samedi retiré du plan. Le moteur
// servait une semaine plate ([2000 ×5]) pendant que la ligne du Profil continuait
// d'annoncer « Sam +600 » — et l'écart ressuscitait le jour où samedi revenait.
describe('normalizeCalorieBank — un écart orphelin ne doit pas survivre au chargement', () => {
  type P = Partial<UserProfile>;
  const base: P = { plan_weekdays: [1, 2, 3, 4, 5], plan_days: 5 };

  it('retire l’écart posé sur un jour ABSENT du plan', () => {
    const p = { ...base, calorie_bank: { '6': 600 } };
    expect(normalizeCalorieBank(p)!.calorie_bank).toBeUndefined();
  });

  it('garde l’écart posé sur un jour PRÉSENT dans le plan', () => {
    const p = { ...base, calorie_bank: { '3': 500 } };
    expect(normalizeCalorieBank(p)!.calorie_bank).toEqual({ '3': 500 });
  });

  it('ne garde que les jours servis quand les deux coexistent', () => {
    const p = { ...base, calorie_bank: { '3': 500, '6': 600 } };
    expect(normalizeCalorieBank(p)!.calorie_bank).toEqual({ '3': 500 });
  });

  it('retire une valeur nulle ou illisible — elle n’aurait rien servi non plus', () => {
    const p = { ...base, calorie_bank: { '3': 0, '4': NaN, '5': 300 } };
    expect(normalizeCalorieBank(p)!.calorie_bank).toEqual({ '5': 300 });
  });

  it('🔴 CONSERVATEUR : `plan_weekdays` absent ou vide = aucune information, on ne touche à RIEN', () => {
    // Sans cette garde, un profil chargé avant que les jours ne soient hydratés
    // perdrait son réglage — le normaliseur ferait plus de dégâts que le défaut.
    const sansJours: P = { calorie_bank: { '6': 600 } };
    expect(normalizeCalorieBank(sansJours)!.calorie_bank).toEqual({ '6': 600 });
    const joursVides: P = { plan_weekdays: [], calorie_bank: { '6': 600 } };
    expect(normalizeCalorieBank(joursVides)!.calorie_bank).toEqual({ '6': 600 });
  });

  it('rend l’IDENTITÉ quand rien ne change (pas de re-rendu ni de push inutile)', () => {
    const p = { ...base, calorie_bank: { '3': 500 } };
    expect(normalizeCalorieBank(p)).toBe(p);
  });

  it('un profil sans banque traverse sans être touché', () => {
    const p = { ...(base as object) };
    expect(normalizeCalorieBank(p)).toBe(p);
  });

  it('🔴 CE QUE LE NORMALISEUR GARDE = CE QUE LE MOTEUR SERT (anti-divergence)', () => {
    // C'est LA propriété qui manquait : l'affichage et la donnée lisaient une règle,
    // le moteur une autre. Si les deux se remettent à diverger, ce cas rougit.
    const p: P = { plan_weekdays: [1, 2, 3, 4, 5], plan_days: 5, calorie_bank: { '3': 500, '6': 600 } };
    const gardés = Object.keys(normalizeCalorieBank(p)!.calorie_bank ?? {});
    const servis = servedWeekdays(p.plan_weekdays, 5).map(String).filter((j) => p.calorie_bank![j]);
    expect(gardés).toEqual(servis);
    expect(Object.keys(offsetsForPlan(p.calorie_bank, p.plan_weekdays, 5))).toHaveLength(gardés.length);
  });
});

describe('servedWeekdays — la règle unique « ce jour compte-t-il ? »', () => {
  it('tronque à `days` : plan_weekdays peut être plus long que plan_days', () => {
    expect(servedWeekdays([1, 2, 3, 4, 5, 6, 0], 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('tolère l’absence et les bornes absurdes', () => {
    expect(servedWeekdays(undefined, 5)).toEqual([]);
    expect(servedWeekdays([1, 2], -3)).toEqual([]);
  });
});
