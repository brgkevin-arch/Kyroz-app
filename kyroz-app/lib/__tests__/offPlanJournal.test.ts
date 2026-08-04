import { describe, it, expect, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OffPlanEntry, OFF_PLAN_KEY, MAX_AGE_DAYS, MAX_ENTRIES,
  pruneJournal, upsertEntry, resolveEntry, removeEntry, removeAt, newestFirst,
  describeOutcome, journalSummary, loadJournal, saveJournal, recordOffPlan, resolveOffPlan, forgetOffPlan,
} from '../offPlanJournal';
import { todayStamp } from '../weight';

const e = (date: string, day: number, kcal = 400, extra: Partial<OffPlanEntry> = {}): OffPlanEntry =>
  ({ date, day, kcal, ...extra });

// Date locale décalée de n jours (négatif = passé), au format 'YYYY-MM-DD'.
const decale = (n: number): string => {
  const d = new Date(todayStamp() + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(async () => {
  await AsyncStorage.removeItem(OFF_PLAN_KEY);
});

describe('E6 — journal des écarts hors plan', () => {
  // ⚠️ LE garde-fou du module. `plan.day_extras[jour]` est un slot UNIQUE : un
  // second écart posé sur le même jour ÉCRASE le premier dans le moteur. Un
  // journal qui empilerait afficherait un total que le moteur n'a jamais compté.
  it('un second écart sur le même jour REMPLACE le premier (comme day_extras)', () => {
    let j = upsertEntry([], e('2026-08-05', 3, 600, { label: 'Pizza · 300 g' }), '2026-08-05');
    j = upsertEntry(j, e('2026-08-05', 3, 250, { label: 'Kebab' }), '2026-08-05');
    expect(j).toHaveLength(1);
    expect(j[0].kcal).toBe(250);
    expect(j[0].label).toBe('Kebab');
  });

  it('deux jours de plan distincts le même jour calendaire font DEUX écarts', () => {
    let j = upsertEntry([], e('2026-08-05', 3, 600), '2026-08-05');
    j = upsertEntry(j, e('2026-08-05', 5, 250), '2026-08-05');
    expect(j).toHaveLength(2);
    expect(j.map((x) => x.kcal)).toEqual([600, 250]); // trié par jour de plan
  });

  it('resolveEntry inscrit ce que le recalage a repris', () => {
    const j = resolveEntry([e('2026-08-05', 3, 600)], '2026-08-05', 3, 450);
    expect(j[0].absorbed).toBe(450);
  });

  it("resolveEntry n'invente aucune entrée quand l'écart n'existe pas", () => {
    const j = resolveEntry([e('2026-08-05', 3)], '2026-08-04', 3, 450);
    expect(j).toHaveLength(1);
    expect(j[0].absorbed).toBeUndefined();
  });

  it('removeEntry ne retire que le couple date+jour visé', () => {
    const j = removeEntry([e('2026-08-05', 3), e('2026-08-05', 5), e('2026-08-04', 3)], '2026-08-05', 3);
    expect(j).toEqual([e('2026-08-05', 5), e('2026-08-04', 3)]);
  });

  it('removeAt retire par rang de la liste affichée', () => {
    expect(removeAt([e('a', 1), e('b', 2), e('c', 3)], 1).map((x) => x.date)).toEqual(['a', 'c']);
  });

  it('newestFirst inverse la liste sans la muter', () => {
    const src = [e('2026-08-01', 1), e('2026-08-05', 1)];
    expect(newestFirst(src).map((x) => x.date)).toEqual(['2026-08-05', '2026-08-01']);
    expect(src.map((x) => x.date)).toEqual(['2026-08-01', '2026-08-05']);
  });
});

describe('E6 — ce que la phrase a le droit de dire', () => {
  // ⚠️ Décision inconnue (app quittée avant l'arbitrage) : l'écran n'affiche RIEN.
  // Combler par « journée gardée » serait affirmer ce qu'on n'a pas observé.
  it('sans décision connue, aucune phrase', () => {
    expect(describeOutcome(e('2026-08-05', 3))).toBeNull();
  });

  it('0 kcal repris = journée gardée telle quelle', () => {
    expect(describeOutcome(e('2026-08-05', 3, 600, { absorbed: 0 }))).toBe('Journée gardée telle quelle.');
  });

  it('le sujet de la phrase est le PLAN, pas la personne', () => {
    const phrase = describeOutcome(e('2026-08-05', 3, 600, { absorbed: 450 })) ?? '';
    expect(phrase).toContain('450');
    expect(phrase).toContain('repris');
    // Règle produit (CLAUDE.md §10) : un suivi rassure, il ne met pas en dette.
    for (const interdit of ['retard', 'rattraper', 'dépassé', 'écart de trop', 'tu as']) {
      expect(phrase.toLowerCase()).not.toContain(interdit);
    }
  });
});

describe('E6 — le résumé de la ligne de menu ne compte pas', () => {
  it('vide → aucune promesse', () => {
    expect(journalSummary([])).toBe("Aucun pour l'instant");
  });

  // ⚠️ LE garde-fou de la règle produit : « 7 écarts ce mois-ci » affiché sur le
  // Profil est un score que personne n'a demandé à voir. Une entrée ou douze sur
  // la même période doivent donner LE MÊME texte.
  it('une entrée et douze sur la même période donnent le même texte', () => {
    const une = [e('2026-07-12', 1)];
    const douze = [e('2026-07-12', 1), ...Array.from({ length: 11 }, (_, i) => e('2026-07-20', i % 7 + 1))];
    expect(journalSummary(douze)).toBe(journalSummary(une));
    expect(journalSummary(une)).toBe('Depuis le 12 juillet');
  });

  it('la période part de la PLUS ANCIENNE entrée, quel que soit l\'ordre', () => {
    expect(journalSummary([e('2026-07-20', 1), e('2026-07-12', 1)])).toBe('Depuis le 12 juillet');
  });
});

describe('E6 — bornes du journal', () => {
  it(`garde exactement ${MAX_AGE_DAYS} jours et coupe au-delà`, () => {
    const j = pruneJournal([e(decale(-MAX_AGE_DAYS), 1), e(decale(-MAX_AGE_DAYS - 1), 1)]);
    expect(j).toHaveLength(1);
    expect(j[0].date).toBe(decale(-MAX_AGE_DAYS));
  });

  it(`plafonne à ${MAX_ENTRIES} entrées en gardant les PLUS RÉCENTES`, () => {
    // Un écart par jour sur les 210 derniers jours : la borne d'âge en laisse 181,
    // sous le plafond de nombre — on force donc le plafond avec des jours de plan.
    const liste: OffPlanEntry[] = [];
    for (let d = 0; d < 60; d++) for (let jour = 1; jour <= 7; jour++) liste.push(e(decale(-d), jour, d));
    const j = pruneJournal(liste);
    expect(j).toHaveLength(MAX_ENTRIES);
    // Le plus ancien survivant est plus récent que le plus ancien fourni.
    expect(j[0].date > decale(-59)).toBe(true);
    expect(j[j.length - 1].date).toBe(decale(0));
  });
});

describe('E6 — persistance locale', () => {
  it('aller-retour disque', async () => {
    await saveJournal([e(decale(-1), 2, 300, { label: 'Resto', absorbed: 120 })]);
    const lu = await loadJournal();
    expect(lu).toHaveLength(1);
    expect(lu[0]).toMatchObject({ day: 2, kcal: 300, label: 'Resto', absorbed: 120 });
  });

  it('journal illisible → liste vide, jamais une exception', async () => {
    await AsyncStorage.setItem(OFF_PLAN_KEY, '{pas du json');
    await expect(loadJournal()).resolves.toEqual([]);
  });

  it('le cycle réel : poser → décider → afficher', async () => {
    await recordOffPlan(4, 600, 'Pizza · 300 g');
    await resolveOffPlan(4, 450);
    const [entree] = await loadJournal();
    expect(entree).toMatchObject({ date: todayStamp(), day: 4, kcal: 600, label: 'Pizza · 300 g', absorbed: 450 });
    expect(describeOutcome(entree)).toBe('Tes repas suivants en ont repris 450 kcal.');
  });

  it("annuler l'écart l'efface du journal (il ne s'est rien passé)", async () => {
    await recordOffPlan(4, 600, 'Pizza · 300 g');
    await recordOffPlan(6, 200);
    await forgetOffPlan(4);
    const restant = await loadJournal();
    expect(restant.map((x) => x.day)).toEqual([6]);
  });

  it("un écart estimé au clavier n'a pas de libellé (et pas une chaîne vide)", async () => {
    await recordOffPlan(1, 350);
    const [entree] = await loadJournal();
    expect('label' in entree).toBe(false);
  });
});
