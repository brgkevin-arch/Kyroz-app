import { describe, it, expect } from 'vitest';
import { bankedDailyTargets, totalOffset } from '../calorieBank';
import { bankFloorKcal } from '../tdee';

/** Cible et plancher d'un profil masculin courant (82 kg, sèche). */
const BASE = 2165;
const FLOOR = 1800;

const somme = (a: number[]) => a.reduce((s, x) => s + x, 0);

describe('bankedDailyTargets — la semaine garde son total', () => {
  it('sans écart déclaré, rien ne bouge', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: {}, floorKcal: FLOOR });
    expect(r.targets).toEqual(Array(7).fill(BASE));
    expect(r.uncompensatedKcal).toBe(0);
  });

  it('« resto samedi +600 » : le jour monte, les 6 autres se partagent −600', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 6: 600 }, floorKcal: FLOOR });
    expect(r.targets[5]).toBe(BASE + 600);
    // 600 / 6 = 100 repris sur chacun des six autres jours.
    for (const i of [0, 1, 2, 3, 4, 6]) expect(r.targets[i]).toBe(BASE - 100);
    expect(r.uncompensatedKcal).toBe(0);
  });

  it('le TOTAL de la semaine est inchangé — c’est tout l’intérêt de la banque', () => {
    const sans = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: {}, floorKcal: FLOOR });
    const avec = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 6: 600 }, floorKcal: FLOOR });
    expect(somme(avec.targets)).toBe(somme(sans.targets));
  });

  it('un écart NÉGATIF marche aussi : « mardi je mange moins » rend des calories au reste', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 2: -300 }, floorKcal: FLOOR });
    expect(r.targets[1]).toBe(BASE - 300);
    for (const i of [0, 2, 3, 4, 5, 6]) expect(r.targets[i]).toBe(BASE + 50);
    expect(somme(r.targets)).toBe(BASE * 7);
  });

  it('deux écarts sur la même semaine se cumulent', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 6: 600, 7: 200 }, floorKcal: FLOOR });
    expect(r.targets[5]).toBe(BASE + 600);
    expect(r.targets[6]).toBe(BASE + 200);
    // 800 repris sur les 5 jours restants = 160 chacun.
    for (const i of [0, 1, 2, 3, 4]) expect(r.targets[i]).toBe(BASE - 160);
    expect(somme(r.targets)).toBe(BASE * 7);
  });

  it('marche sur un plan court (3 jours)', () => {
    const r = bankedDailyTargets({ days: 3, baseTargetKcal: BASE, offsets: { 3: 300 }, floorKcal: FLOOR });
    expect(r.targets[2]).toBe(BASE + 300);
    expect(r.targets[0]).toBe(BASE - 150);
    expect(r.targets[1]).toBe(BASE - 150);
  });
});

describe('bankedDailyTargets — le plancher de sécurité gagne toujours (§6)', () => {
  it('aucun jour ne descend sous le plancher, même pour un écart énorme', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 6: 5000 }, floorKcal: FLOOR });
    for (const t of r.targets) expect(t).toBeGreaterThanOrEqual(FLOOR);
  });

  it('ce qui n’a PAS pu être repris est DÉCLARÉ, pas avalé en silence', () => {
    // 6 jours × (2165 − 1800) = 2190 kcal reprenables au maximum.
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 6: 5000 }, floorKcal: FLOOR });
    expect(r.uncompensatedKcal).toBe(5000 - 6 * (BASE - FLOOR));
    expect(r.uncompensatedKcal).toBeGreaterThan(0);
  });

  it('un écart exactement reprenable ne laisse aucun reliquat', () => {
    const reprenable = 6 * (BASE - FLOOR); // 2190
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 6: reprenable }, floorKcal: FLOOR });
    expect(r.uncompensatedKcal).toBe(0);
    for (const i of [0, 1, 2, 3, 4, 6]) expect(r.targets[i]).toBe(FLOOR);
  });

  it('un écart NÉGATIF ne peut pas passer sous le plancher non plus', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets: { 2: -2000 }, floorKcal: FLOOR });
    expect(r.targets[1]).toBe(FLOOR);
  });

  it('un profil déjà AU plancher ne peut rien compenser — et le dit', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: FLOOR, offsets: { 6: 400 }, floorKcal: FLOOR });
    expect(r.targets[5]).toBe(FLOOR + 400);
    for (const i of [0, 1, 2, 3, 4, 6]) expect(r.targets[i]).toBe(FLOOR);
    expect(r.uncompensatedKcal).toBe(400);
  });
});

describe('bankedDailyTargets — cas limites', () => {
  it('un plan d’un seul jour : rien à compenser, l’écart est intégral', () => {
    const r = bankedDailyTargets({ days: 1, baseTargetKcal: BASE, offsets: { 1: 500 }, floorKcal: FLOOR });
    expect(r.targets).toEqual([BASE + 500]);
    expect(r.uncompensatedKcal).toBe(500);
  });

  it('TOUS les jours portent un écart → rien n’est compensé, et c’est DÉCLARÉ', () => {
    // Il n'y a aucun jour libre sur lequel emprunter. Le piège serait de répartir
    // sur tout le monde : on reprendrait sur chaque jour ce qu'on vient d'y
    // ajouter, annulant le choix de l'utilisateur en silence.
    const offsets = { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100, 7: 100 };
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: BASE, offsets, floorKcal: FLOOR });
    expect(r.targets).toEqual(Array(7).fill(BASE + 100));
    expect(r.uncompensatedKcal).toBe(700);
  });

  it('un écart posé sur un jour HORS du plan est ignoré', () => {
    const r = bankedDailyTargets({ days: 3, baseTargetKcal: BASE, offsets: { 7: 600 }, floorKcal: FLOOR });
    expect(r.targets).toEqual([BASE, BASE, BASE]);
    expect(r.uncompensatedKcal).toBe(0);
  });

  it('un plancher SUPÉRIEUR à la cible remonte les jours — d’où le clamp côté moteur', () => {
    // Comportement volontaire du module : « jamais sous le plancher » est absolu.
    // Mais l'appelant doit borner le plancher à la cible du profil, sinon il relève
    // la cible de quelqu'un qui n'a pas de banque. C'est la régression mesurée le
    // 2026-07-30 : +305 kcal/jour sur un profil en sèche (cf. planEngine.ts).
    const r = bankedDailyTargets({ days: 3, baseTargetKcal: 1600, offsets: {}, floorKcal: 1900 });
    expect(r.targets).toEqual([1900, 1900, 1900]);
  });

  it('days = 0 ne casse pas', () => {
    const r = bankedDailyTargets({ days: 0, baseTargetKcal: BASE, offsets: { 1: 500 }, floorKcal: FLOOR });
    expect(r.targets).toEqual([]);
  });

  it('déterministe : deux appels identiques rendent le même plan', () => {
    const args = { days: 7, baseTargetKcal: BASE, offsets: { 3: -200, 6: 700 }, floorKcal: FLOOR };
    expect(bankedDailyTargets(args)).toEqual(bankedDailyTargets(args));
  });

  it('les cibles sont des entiers (pas de kcal à virgule à l’écran)', () => {
    const r = bankedDailyTargets({ days: 7, baseTargetKcal: 2000, offsets: { 6: 500 }, floorKcal: FLOOR });
    for (const t of r.targets) expect(Number.isInteger(t)).toBe(true);
  });
});

describe('totalOffset', () => {
  it('somme les écarts des jours DANS le plan seulement', () => {
    expect(totalOffset({ 1: 100, 6: 600, 7: 900 }, 6)).toBe(700);
    expect(totalOffset({}, 7)).toBe(0);
  });
});

describe('bankFloorKcal — le plancher JOURNALIER de la banque', () => {
  const prof = (o: Record<string, unknown>) =>
    ({ sports: [], low_ea_weeks: undefined, ...o }) as unknown as Parameters<typeof bankFloorKcal>[0];

  it('vaut max(BMR, filet absolu) — et PAS le plancher d’énergie disponible', () => {
    // Marc, 82 kg, 12 % MG → masse maigre 72,2 kg → BMR Katch-McArdle ≈ 1929.
    // Le plancher EA (30 × 72,2 = 2165) vaut EXACTEMENT sa cible : s'en servir
    // laisserait 0 kcal empruntable. Mesuré le 2026-07-30, c'est ce qui rendait
    // la banque inutile pour tout profil en déficit. Cf. la doc de bankFloorKcal.
    const marc = prof({ sex: 'male', age: 28, weight_kg: 82, height_cm: 180, body_fat_pct: 12, tdee_kcal: 2315, target_kcal: 2165 });
    const f = bankFloorKcal(marc);
    expect(f).toBe(1929);
    expect(2165 - f).toBeGreaterThan(200); // il reste de quoi emprunter
  });

  it('ne descend jamais sous le filet absolu (1500 ♂ / 1200 ♀)', () => {
    // Gabarit minuscule : le BMR passe sous le filet, c'est le filet qui tient.
    const f = bankFloorKcal(prof({ sex: 'female', age: 25, weight_kg: 40, height_cm: 150, body_fat_pct: 20, tdee_kcal: 1300, target_kcal: 1200 }));
    expect(f).toBeGreaterThanOrEqual(1200);
  });

  it('un profil dont la cible EST son BMR ne peut rien emprunter — et c’est correct', () => {
    // Camille, 55 kg, 23 % MG : BMR = cible = 1285. On ne mange pas sous son BMR,
    // même un jour. La banque est alors inerte, et l'écran le dit.
    const camille = prof({ sex: 'female', age: 30, weight_kg: 55, height_cm: 165, body_fat_pct: 23, tdee_kcal: 1542, target_kcal: 1285 });
    expect(bankFloorKcal(camille)).toBe(1285);
    const r = bankedDailyTargets({
      days: 7, baseTargetKcal: 1285, offsets: { 6: 600 },
      floorKcal: Math.min(bankFloorKcal(camille), 1285),
    });
    expect(r.uncompensatedKcal).toBe(600);
  });

  it('déterministe et sans date : deux appels donnent le même plancher', () => {
    const p = prof({ sex: 'male', age: 35, weight_kg: 98, height_cm: 178, body_fat_pct: 24, tdee_kcal: 2375, target_kcal: 2575 });
    expect(bankFloorKcal(p)).toBe(bankFloorKcal(p));
  });
});
