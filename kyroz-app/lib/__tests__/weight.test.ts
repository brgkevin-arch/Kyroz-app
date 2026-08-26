import { describe, it, expect } from 'vitest';
import {
  localStamp, todayStamp, upsertEntry, removeEntry, latest, checkinDue, lastDelta,
  loadWeights, saveWeights, frequencyDays, nextWeighInAt, WEIGH_IN_INTERVALS, WeightEntry,
  weighInSchedule, WEIGH_IN_AHEAD, WEIGH_IN_HOUR, historiquePesees, HISTORIQUE_MAX,
} from '../weight';

const day = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return localStamp(d);
};

describe('dates (heure locale — régression du bug de fuseau)', () => {
  it('todayStamp = localStamp(minuit local) — jamais de décalage UTC', () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    expect(todayStamp()).toBe(localStamp(d));
  });
  it('format YYYY-MM-DD zéro-paddé', () => {
    expect(localStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('upsertEntry (1 point par jour)', () => {
  it('écrase le point du même jour, garde la liste triée', () => {
    let list: WeightEntry[] = [];
    list = upsertEntry(list, 80);              // seed aujourd'hui
    list = upsertEntry(list, 75, day(-1));     // backfill hier
    list = upsertEntry(list, 90);              // aujourd'hui ré-écrasé
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ date: day(-1), weight_kg: 75 });
    expect(list[1]).toMatchObject({ date: day(0), weight_kg: 90 }); // le + récent à droite
  });

  it('note : trim, et absente si vide', () => {
    const withNote = upsertEntry([], 80, day(0), '  voyage  ');
    expect(withNote[0].note).toBe('voyage');
    const noNote = upsertEntry([], 80, day(0), '   ');
    expect(noNote[0].note).toBeUndefined();
  });
});

describe('latest / lastDelta', () => {
  it('latest = point le plus récent, null si vide', () => {
    expect(latest([])).toBeNull();
    const list = upsertEntry(upsertEntry([], 80, day(-3)), 78, day(0));
    expect(latest(list)?.weight_kg).toBe(78);
  });
  it('delta entre les 2 derniers points (arrondi 0.1)', () => {
    expect(lastDelta([])).toBeNull();
    const list = upsertEntry(upsertEntry([], 80, day(-7)), 79.65, day(0));
    expect(lastDelta(list)).toBe(-0.3);
  });
});

describe('removeEntry', () => {
  it('supprime le point de la date donnée, laisse le reste intact', () => {
    let list = upsertEntry(upsertEntry([], 80, day(-1)), 78, day(0));
    list = removeEntry(list, day(-1));
    expect(list).toHaveLength(1);
    expect(list[0].date).toBe(day(0));
  });
});

describe('loadWeights (auto-nettoyage)', () => {
  it('purge les points datés dans le futur (données héritées du bug de fuseau)', async () => {
    await saveWeights([
      { date: day(-1), weight_kg: 80 },
      { date: day(+1), weight_kg: 95 }, // impossible légitimement → purgé
      { date: day(0), weight_kg: 79 },
    ]);
    const list = await loadWeights();
    expect(list.map((e) => e.date)).toEqual([day(-1), day(0)]); // trié, sans le futur
  });
});

describe('checkinDue (cadence configurable)', () => {
  const at = (d: string): WeightEntry[] => [{ date: d, weight_kg: 80 }];
  it('pas de nag sans historique', () => {
    expect(checkinDue([], day(0))).toBe(false);
  });
  it('défaut 7 jours : dû à J+7, pas avant', () => {
    expect(checkinDue(at('2026-05-15'), '2026-05-21')).toBe(false); // J+6
    expect(checkinDue(at('2026-05-15'), '2026-05-22')).toBe(true);  // J+7
  });
  it('respecte un intervalle custom (quotidien / mensuel)', () => {
    expect(checkinDue(at('2026-05-15'), '2026-05-16', 1)).toBe(true);  // quotidien : J+1
    expect(checkinDue(at('2026-05-15'), '2026-06-13', 30)).toBe(false); // mensuel : J+29
    expect(checkinDue(at('2026-05-15'), '2026-06-14', 30)).toBe(true);  // mensuel : J+30
  });
});

describe('nextWeighInAt (programmation de la notif de pesée)', () => {
  const at9 = (d: Date) => d.getHours() === 9 && d.getMinutes() === 0;

  it('échéance normale : dernière pesée + cadence, à 9h locale', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);            // 15 mai, 10h
    const r = nextWeighInAt('2026-05-15', 'weekly', now);
    expect(localStamp(r)).toBe('2026-05-22');               // +7 jours
    expect(at9(r)).toBe(true);
  });

  it('en retard, avant 9h → aujourd\'hui 9h', () => {
    const now = new Date(2026, 5, 13, 7, 0, 0);             // 13 juin, 7h
    const r = nextWeighInAt('2026-01-01', 'weekly', now);   // échéance jan. = passée
    expect(localStamp(r)).toBe('2026-06-13');
    expect(at9(r)).toBe(true);
  });

  it('en retard, après 9h → demain 9h', () => {
    const now = new Date(2026, 5, 13, 14, 0, 0);            // 13 juin, 14h
    const r = nextWeighInAt('2026-01-01', 'monthly', now);
    expect(localStamp(r)).toBe('2026-06-14');
    expect(at9(r)).toBe(true);
  });

  it('sans historique : repart de maintenant + cadence', () => {
    const now = new Date(2026, 5, 13, 7, 0, 0);
    const r = nextWeighInAt(null, 'daily', now);
    expect(localStamp(r)).toBe('2026-06-14');               // now + 1 jour
    expect(at9(r)).toBe(true);
  });
});

// ── Le rappel de pesée ne doit pas s'éteindre ────────────────────────────────
// Le défaut corrigé : une seule notification `DATE`, ré-armée uniquement quand
// l'app s'ouvre. Qui décroche recevait UNE pesée puis plus rien. Ce que ces cas
// tiennent, c'est qu'AUCUNE cadence ne rend une programmation à occurrence unique.
describe('weighInSchedule — un rappel qui survit à quelqu’un qui n’ouvre plus l’app', () => {
  it('aucune cadence ne rend une seule occurrence datée', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const freq of ['daily', 'weekly', 'biweekly', 'monthly'] as const) {
      const p = weighInSchedule('2026-05-15', freq, now);
      const unique = p.kind === 'dates' && p.dates.length < 2;
      expect(`${freq}:${unique}`).toBe(`${freq}:false`);
    }
  });

  it('quotidien → déclencheur répétitif natif, à 9h', () => {
    const p = weighInSchedule('2026-05-15', 'daily', new Date(2026, 4, 15, 10, 0, 0));
    expect(p).toEqual({ kind: 'daily', hour: WEIGH_IN_HOUR, minute: 0 });
  });

  it('hebdo → le MÊME jour de semaine que la prochaine échéance', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);            // vendredi 15 mai
    const echeance = nextWeighInAt('2026-05-15', 'weekly', now);
    const p = weighInSchedule('2026-05-15', 'weekly', now);
    expect(p.kind).toBe('weekly');
    if (p.kind !== 'weekly') return;
    // 🔴 Convention d'expo/iOS : 1 = DIMANCHE, là où `getDay()` rend 0. L'oublier
    // décale le rappel d'un jour, une fois par semaine, sans rien casser d'autre.
    expect(p.weekday).toBe(echeance.getDay() + 1);
    expect(p.weekday).toBeGreaterThanOrEqual(1);
    expect(p.weekday).toBeLessThanOrEqual(7);
  });

  it('dimanche tombe sur 1, pas sur 0', () => {
    // 17 mai 2026 est un dimanche → pesée le 10, échéance hebdo le 17.
    const p = weighInSchedule('2026-05-10', 'weekly', new Date(2026, 4, 10, 10, 0, 0));
    expect(p).toMatchObject({ kind: 'weekly', weekday: 1 });
  });

  it('quinzaine / mois → une série datée, espacée de la cadence, à partir de l’échéance', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const freq of ['biweekly', 'monthly'] as const) {
      const p = weighInSchedule('2026-05-15', freq, now);
      expect(p.kind).toBe('dates');
      if (p.kind !== 'dates') continue;
      expect(p.dates).toHaveLength(WEIGH_IN_AHEAD);
      expect(localStamp(p.dates[0])).toBe(localStamp(nextWeighInAt('2026-05-15', freq, now)));
      const pas = frequencyDays(freq);
      for (let i = 1; i < p.dates.length; i++) {
        const ecart = Math.round((p.dates[i].getTime() - p.dates[i - 1].getTime()) / 86_400_000);
        expect(ecart).toBe(pas);
      }
      // Toutes à 9h : une pesée réclamée à 3h du matin n'est pas un rappel.
      expect(p.dates.every((d) => d.getHours() === WEIGH_IN_HOUR && d.getMinutes() === 0)).toBe(true);
    }
  });

  // Ce que la série doit garantir, c'est une COUVERTURE — pas un joli chiffre.
  // Le seuil est posé à 80 jours parce que c'est ce que la quinzaine sert
  // réellement (84) : viser 90 aurait été une promesse que le code ne tient pas,
  // et c'est ce test qui l'a dit avant que le commentaire ne parte en OTA.
  it('la série couvre au moins 80 jours — sinon elle s’éteint comme avant', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const [freq, mini] of [['biweekly', 80], ['monthly', 170]] as const) {
      const p = weighInSchedule('2026-05-15', freq, now);
      if (p.kind !== 'dates') throw new Error(`${freq} : série datée attendue`);
      const jours = (p.dates[p.dates.length - 1].getTime() - now.getTime()) / 86_400_000;
      expect(jours, freq).toBeGreaterThanOrEqual(mini);
    }
  });

  it('cadence absente = hebdo, comme partout ailleurs', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    expect(weighInSchedule('2026-05-15', undefined, now))
      .toEqual(weighInSchedule('2026-05-15', 'weekly', now));
  });
});

describe('frequencyDays', () => {
  it('mappe chaque cadence vers son intervalle', () => {
    expect(frequencyDays('daily')).toBe(1);
    expect(frequencyDays('weekly')).toBe(7);
    expect(frequencyDays('biweekly')).toBe(14);
    expect(frequencyDays('monthly')).toBe(30);
  });
  it('repli défaut (hebdo) si non défini', () => {
    expect(frequencyDays(undefined)).toBe(WEIGH_IN_INTERVALS.weekly);
  });
});

// ── Historique de la feuille « Suivi du poids » ──────────────────────────────
//
// Ce que ces tests tiennent, et pourquoi :
//  · le plafond existe (la liste ne grandit pas à l'infini) ;
//  · mais il ne doit RIEN changer aux écarts affichés. C'est le piège qui a
//    justifié la sortie du calcul hors du composant : couper d'abord, comparer
//    ensuite, ça fait afficher « — » (= « rien avant ça ») à la dernière ligne
//    d'un historique qui a pourtant des pesées plus anciennes.
describe('historiquePesees', () => {
  /** Série croissante en date, 1 kg d'écart par pesée — comme la stocke `upsertEntry`. */
  const serie = (n: number): WeightEntry[] =>
    Array.from({ length: n }, (_, i) => ({ date: day(i - n + 1), weight_kg: 80 + i }));

  it('rend les plus RÉCENTES en premier', () => {
    const h = historiquePesees(serie(4));
    expect(h.map((e) => e.weight_kg)).toEqual([83, 82, 81, 80]);
  });

  it('plafonne — sinon la liste grandit à chaque pesée', () => {
    expect(historiquePesees(serie(40)).length).toBe(HISTORIQUE_MAX);
    expect(HISTORIQUE_MAX).toBe(10);
  });

  it('rend tout quand la série est plus courte que le plafond', () => {
    expect(historiquePesees(serie(3)).length).toBe(3);
  });

  // 🔴 LE TEST QUI COMPTE. Sur 11 pesées, la 10ᵉ ligne (la plus ancienne montrée)
  // a bien une pesée avant elle : son écart doit être un CHIFFRE, jamais « — ».
  it("l'écart de la dernière ligne montrée se calcule sur la série entière, pas sur la tranche", () => {
    const h = historiquePesees(serie(11));
    expect(h.length).toBe(10);
    expect(h[9].delta).toBe(1);
    expect(h.every((e) => e.delta !== null)).toBe(true);
  });

  it('« — » est réservé à la toute PREMIÈRE pesée, et à elle seule', () => {
    const courte = historiquePesees(serie(3));
    expect(courte[2].delta).toBeNull();          // la première pesée de la série
    expect(courte.slice(0, 2).every((e) => e.delta !== null)).toBe(true);
    // Dès que la série dépasse le plafond, plus AUCUNE ligne ne peut être « — ».
    expect(historiquePesees(serie(15)).some((e) => e.delta === null)).toBe(false);
  });

  it('signe et arrondi : une reprise est positive, une perte négative, au dixième', () => {
    const h = historiquePesees([
      { date: day(-2), weight_kg: 80 },
      { date: day(-1), weight_kg: 79.35 },
      { date: day(0), weight_kg: 79.95 },
    ]);
    expect(h[0].delta).toBe(0.6);
    expect(h[1].delta).toBe(-0.7);
    expect(h[2].delta).toBeNull();
  });

  it('série vide ou plafond nul : rien, et pas un plantage', () => {
    expect(historiquePesees([])).toEqual([]);
    expect(historiquePesees(serie(5), 0)).toEqual([]);
    expect(historiquePesees(serie(5), -3)).toEqual([]);
  });

  it("ne touche pas à la liste qu'on lui passe", () => {
    const src = serie(4);
    const copie = [...src];
    historiquePesees(src);
    expect(src).toEqual(copie);
  });
});
