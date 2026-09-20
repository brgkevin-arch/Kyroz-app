import { describe, it, expect } from 'vitest';
import {
  localStamp, todayStamp, upsertEntry, removeEntry, latest, checkinDue, lastDelta,
  loadWeights, saveWeights, frequencyDays, nextWeighInAt, WEIGH_IN_INTERVALS, WeightEntry,
  weighInSchedule, WEIGH_IN_AHEAD, WEIGH_IN_HOUR, historiquePesees, HISTORIQUE_MAX,
  echeancePesee, weighInDayOf, weighInResume, JOURS_PESEE, WEIGH_IN_LABELS,
} from '../weight';
import { WeighInDay } from '../types';

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

describe('checkinDue (cadence + jour de rendez-vous)', () => {
  const at = (d: string): WeightEntry[] => [{ date: d, weight_kg: 80 }];
  it('pas de nag sans historique', () => {
    expect(checkinDue([], day(0))).toBe(false);
  });
  it('sans jour choisi : dû à J+7, pas avant — le comportement d’avant, au jour près', () => {
    expect(checkinDue(at('2026-05-15'), '2026-05-21')).toBe(false); // J+6
    expect(checkinDue(at('2026-05-15'), '2026-05-22')).toBe(true);  // J+7
  });
  it('respecte la cadence (quinzaine / 4 semaines)', () => {
    expect(checkinDue(at('2026-05-15'), '2026-05-28', 'biweekly')).toBe(false); // J+13
    expect(checkinDue(at('2026-05-15'), '2026-05-29', 'biweekly')).toBe(true);  // J+14
    expect(checkinDue(at('2026-05-15'), '2026-06-11', 'monthly')).toBe(false);  // J+27
    expect(checkinDue(at('2026-05-15'), '2026-06-12', 'monthly')).toBe(true);   // J+28
  });

  // 🔴 LE CAS QUI A MOTIVÉ LE CHANTIER. Le 2026-05-15 est un VENDREDI. Quelqu'un dont
  // le rendez-vous est le LUNDI ne doit pas attendre le vendredi suivant : la bannière
  // tombe le lundi 18, trois jours plus tard, et plus jamais un vendredi.
  it('avec un jour choisi, la bannière tombe CE jour-là — pas 7 jours après la pesée', () => {
    const lundi: WeighInDay = 1;
    expect(checkinDue(at('2026-05-15'), '2026-05-17', 'weekly', lundi)).toBe(false); // dimanche 17
    expect(checkinDue(at('2026-05-15'), '2026-05-18', 'weekly', lundi)).toBe(true);  // LUNDI 18
  });

  // Et l'inverse, qui est la promesse du réglage : se peser hors de son jour ne
  // déplace pas le rendez-vous suivant. Pesée le mardi 19, rendez-vous le lundi →
  // la bannière revient le lundi 25, six jours plus tard, pas le mardi 26.
  it('se peser un autre jour ne déplace pas le rendez-vous', () => {
    const lundi: WeighInDay = 1;
    expect(checkinDue(at('2026-05-19'), '2026-05-24', 'weekly', lundi)).toBe(false);
    expect(checkinDue(at('2026-05-19'), '2026-05-25', 'weekly', lundi)).toBe(true);
  });

  it('une pesée en retard laisse la bannière affichée (échéance déjà passée)', () => {
    expect(checkinDue(at('2026-01-01'), '2026-05-15', 'weekly', 1)).toBe(true);
  });
});

describe('echeancePesee — la dernière occurrence du jour choisi avant la cadence', () => {
  /** Écart en jours entre une pesée du vendredi 15 mai 2026 et son échéance. */
  const ecart = (freq: 'weekly' | 'biweekly' | 'monthly', jour: WeighInDay) => Math.round(
    (Date.parse(echeancePesee('2026-05-15', freq, jour) + 'T00:00:00')
      - Date.parse('2026-05-15T00:00:00')) / 86_400_000,
  );

  // 2026-05-15 = VENDREDI. Cadence hebdo → cible = vendredi 22, puis on recule
  // jusqu'au jour demandé.
  it('recale sur le jour demandé, sans jamais dépasser la cadence', () => {
    expect(echeancePesee('2026-05-15', 'weekly', 5)).toBe('2026-05-22'); // vendredi : pile
    expect(echeancePesee('2026-05-15', 'weekly', 1)).toBe('2026-05-18'); // lundi : le PROCHAIN lundi
    expect(echeancePesee('2026-05-15', 'weekly', 2)).toBe('2026-05-19'); // mardi
    expect(echeancePesee('2026-05-15', 'weekly', 6)).toBe('2026-05-16'); // samedi : dès demain
  });

  // 🔴 CE QUE LE SENS DE L'ARRONDI TIENT. Vers l'avant, un rendez-vous hebdomadaire
  // pouvait tomber à 10 ou 11 jours — « chaque lundi » qui attend une semaine et demie.
  it('jamais plus tard que la cadence, jamais plus de 6 jours plus tôt', () => {
    for (const jour of JOURS_PESEE.map((j) => j.value)) {
      for (const [freq, pas] of [['weekly', 7], ['biweekly', 14], ['monthly', 28]] as const) {
        const e = ecart(freq, jour);
        expect(e, `${freq} / jour ${jour}`).toBeLessThanOrEqual(pas);
        expect(e, `${freq} / jour ${jour}`).toBeGreaterThanOrEqual(pas - 6);
      }
    }
  });

  // En hebdomadaire, la règle DOIT se lire « chaque <jour> » : l'échéance est la
  // première occurrence du jour qui suit la pesée, quel que soit le jour de celle-ci.
  it('en hebdomadaire, c’est exactement « le prochain <jour> »', () => {
    for (const jourPesee of ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21'] as const) {
      for (const jour of JOURS_PESEE.map((j) => j.value)) {
        const e = echeancePesee(jourPesee, 'weekly', jour);
        const d = new Date(Date.parse(e + 'T00:00:00'));
        expect(d.getDay(), `pesée ${jourPesee} → ${e}`).toBe(jour);
        const jours = Math.round((d.getTime() - Date.parse(jourPesee + 'T00:00:00')) / 86_400_000);
        expect(jours, `pesée ${jourPesee} → ${e}`).toBeGreaterThanOrEqual(1);
        expect(jours, `pesée ${jourPesee} → ${e}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it('et l’échéance tombe TOUJOURS sur le jour demandé, quelle que soit la cadence', () => {
    for (const jour of JOURS_PESEE.map((j) => j.value)) {
      for (const freq of ['weekly', 'biweekly', 'monthly'] as const) {
        const d = new Date(Date.parse(echeancePesee('2026-05-15', freq, jour) + 'T00:00:00'));
        expect(d.getDay(), `${freq} / jour ${jour}`).toBe(jour);
      }
    }
  });

  // Se peser SON jour rend un espacement exact : le raccourci ne concerne que la
  // pesée hors rendez-vous, et une seule fois.
  it('se peser le jour du rendez-vous donne l’intervalle exact', () => {
    expect(ecart('weekly', 5)).toBe(7);
    expect(ecart('biweekly', 5)).toBe(14);
    expect(ecart('monthly', 5)).toBe(28);
  });
});

describe('weighInDayOf — le repli est le comportement d’avant, pas un défaut arbitraire', () => {
  it('sans jour choisi : celui de la dernière pesée', () => {
    expect(weighInDayOf(undefined, '2026-05-15')).toBe(5); // vendredi
  });
  it('un jour choisi gagne toujours', () => {
    expect(weighInDayOf(0, '2026-05-15')).toBe(0);
  });
  it('ni jour ni pesée : aujourd’hui (aucun rendez-vous ne peut être vide)', () => {
    const now = new Date(2026, 4, 17, 8, 0, 0); // dimanche
    expect(weighInDayOf(undefined, null, now)).toBe(0);
  });
  it('une valeur hors 0…6 ne passe pas pour un jour', () => {
    expect(weighInDayOf(9 as WeighInDay, '2026-05-15')).toBe(5);
    expect(weighInDayOf(1.5 as WeighInDay, '2026-05-15')).toBe(5);
  });
});

describe('weighInResume — ce que l’écran promet', () => {
  it('dit la cadence ET le jour', () => {
    expect(weighInResume('weekly', 0)).toBe('chaque semaine, le dimanche');
    expect(weighInResume('biweekly', 1)).toBe('toutes les 2 semaines, le lundi');
    expect(weighInResume(undefined, 6)).toBe('chaque semaine, le samedi');
  });
  // 🔴 « Chaque mois » aurait été FAUX de deux jours à chaque échéance : la cadence
  // vaut 28 jours pour que le jour choisi tienne. Le libellé doit le dire.
  it('la cadence de 28 jours s’annonce en semaines, jamais en mois', () => {
    expect(WEIGH_IN_LABELS.monthly).toBe('Toutes les 4 semaines');
    expect(weighInResume('monthly', 3)).toBe('toutes les 4 semaines, le mercredi');
  });
});

describe('nextWeighInAt (programmation de la notif de pesée)', () => {
  const at9 = (d: Date) => d.getHours() === 9 && d.getMinutes() === 0;

  it('échéance normale, sans jour choisi : dernière pesée + cadence, à 9h locale', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);            // vendredi 15 mai, 10h
    const r = nextWeighInAt('2026-05-15', 'weekly', undefined, now);
    expect(localStamp(r)).toBe('2026-05-22');               // +7 jours, même jour de semaine
    expect(at9(r)).toBe(true);
  });

  it('avec un jour choisi : l’échéance tombe ce jour-là', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);            // vendredi 15 mai
    const r = nextWeighInAt('2026-05-15', 'weekly', 1, now); // rendez-vous : lundi
    expect(localStamp(r)).toBe('2026-05-18');
    expect(at9(r)).toBe(true);
  });

  // 🔴 CE CAS A CHANGÉ LE 2026-09-20, ET C'EST VOULU. Avant : « en retard → demain 9h »,
  // donc un rappel un mardi pour un rendez-vous du dimanche. Un rendez-vous fixe qui
  // sonne n'importe quel jour n'est plus un rendez-vous ; la bannière de l'écran Plan,
  // elle, est déjà là (`checkinDue` lit l'échéance théorique, dans le passé).
  it('en retard : on vise le prochain jour de rendez-vous, pas le lendemain', () => {
    const now = new Date(2026, 5, 13, 14, 0, 0);             // samedi 13 juin, 14h
    const r = nextWeighInAt('2026-01-01', 'weekly', 1, now); // rendez-vous : lundi
    expect(localStamp(r)).toBe('2026-06-15');                // le lundi suivant
    expect(at9(r)).toBe(true);
  });

  it('en retard, le jour même avant 9h → aujourd’hui 9h (on ne saute pas une semaine)', () => {
    const now = new Date(2026, 5, 13, 7, 0, 0);              // samedi 13 juin, 7h
    const r = nextWeighInAt('2026-01-01', 'weekly', 6, now); // rendez-vous : samedi
    expect(localStamp(r)).toBe('2026-06-13');
    expect(at9(r)).toBe(true);
  });

  it('en retard, le jour même après 9h → la semaine suivante, jamais demain', () => {
    const now = new Date(2026, 5, 13, 14, 0, 0);             // samedi 13 juin, 14h
    const r = nextWeighInAt('2026-01-01', 'weekly', 6, now);
    expect(localStamp(r)).toBe('2026-06-20');
  });

  // 🔴 L'INVARIANT QUI REND LA DÉRIVE IMPOSSIBLE, et il a fallu une mutation pour
  // comprendre lequel écrire. Remplacer `weekday: jour + 1` par le jour de l'échéance
  // dans `weighInSchedule` ne faisait rougir AUCUN test — non par trou de couverture,
  // mais parce que les deux sont désormais le même nombre : toute date rendue par
  // `nextWeighInAt` tombe sur le jour choisi, y compris en retard et sans historique.
  // C'est CE fait qu'il faut compter, pas la ligne qui l'exprime.
  it('tombe TOUJOURS sur le jour choisi — toutes cadences, tous jours, en retard compris', () => {
    for (const jour of JOURS_PESEE.map((j) => j.value)) {
      for (const freq of ['weekly', 'biweekly', 'monthly'] as const) {
        for (const pesee of ['2026-05-15', '2026-05-18', '2026-01-01', null] as const) {
          for (const heure of [7, 14]) {
            const now = new Date(2026, 5, 13, heure, 0, 0);
            const r = nextWeighInAt(pesee, freq, jour, now);
            expect(r.getDay(), `${freq} / jour ${jour} / pesée ${pesee} / ${heure}h`).toBe(jour);
            expect(r.getTime(), 'une échéance programmée est toujours à venir').toBeGreaterThan(now.getTime());
          }
        }
      }
    }
  });

  it('sans historique : repart de maintenant + cadence, recalée sur le jour', () => {
    const now = new Date(2026, 5, 13, 7, 0, 0);              // samedi 13 juin
    const r = nextWeighInAt(null, 'weekly', 6, now);          // rendez-vous : samedi
    expect(localStamp(r)).toBe('2026-06-20');                 // le samedi suivant
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
    for (const freq of ['weekly', 'biweekly', 'monthly'] as const) {
      const p = weighInSchedule('2026-05-15', freq, 0, now);
      const unique = p.kind === 'dates' && p.dates.length < 2;
      expect(`${freq}:${unique}`).toBe(`${freq}:false`);
    }
  });

  // 🔴 LA CADENCE « CHAQUE JOUR » A ÉTÉ RETIRÉE LE 2026-09-20 (décision fondateur).
  // Avec elle est parti le seul déclencheur qui pouvait sonner un jour que personne
  // n'avait choisi — `weighInSchedule` ne rend plus jamais `kind: 'daily'`.
  it('aucune cadence ne rend un déclencheur quotidien', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const freq of ['weekly', 'biweekly', 'monthly'] as const) {
      expect(weighInSchedule('2026-05-15', freq, 0, now).kind).not.toBe('daily');
    }
  });

  // 🔴 CE TEST DISAIT « le MÊME jour de semaine que la prochaine échéance », ET C'EST
  // EXACTEMENT LÀ QUE LA DÉRIVE ENTRAIT : l'échéance bougeait avec les pesées en
  // retard, donc le `weekday` du déclencheur répétitif changeait avec elle — une fois
  // décalé, tous les rendez-vous suivants l'étaient. Il suit désormais le JOUR CHOISI.
  it('hebdo → le jour CHOISI, pas celui de la dernière pesée', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);               // vendredi 15 mai
    const p = weighInSchedule('2026-05-15', 'weekly', 1, now); // rendez-vous : lundi
    // 🔴 Convention d'expo/iOS : 1 = DIMANCHE, là où `getDay()` rend 0. L'oublier
    // décale le rappel d'un jour, une fois par semaine, sans rien casser d'autre.
    expect(p).toEqual({ kind: 'weekly', weekday: 2, hour: WEIGH_IN_HOUR, minute: 0 });
  });

  it('sans jour choisi, hebdo garde le jour de la dernière pesée (comportement d’avant)', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);               // vendredi 15 mai
    const p = weighInSchedule('2026-05-15', 'weekly', undefined, now);
    expect(p).toMatchObject({ kind: 'weekly', weekday: 6 });   // vendredi = 5 → expo 6
  });

  it('dimanche tombe sur 1, pas sur 0', () => {
    const p = weighInSchedule('2026-05-10', 'weekly', 0, new Date(2026, 4, 10, 10, 0, 0));
    expect(p).toMatchObject({ kind: 'weekly', weekday: 1 });
  });

  it('quinzaine / mois → une série datée, espacée de la cadence, à partir de l’échéance', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const freq of ['biweekly', 'monthly'] as const) {
      const p = weighInSchedule('2026-05-15', freq, 0, now);
      expect(p.kind).toBe('dates');
      if (p.kind !== 'dates') continue;
      expect(p.dates).toHaveLength(WEIGH_IN_AHEAD);
      expect(localStamp(p.dates[0])).toBe(localStamp(nextWeighInAt('2026-05-15', freq, 0, now)));
      const pas = frequencyDays(freq);
      for (let i = 1; i < p.dates.length; i++) {
        const ecart = Math.round((p.dates[i].getTime() - p.dates[i - 1].getTime()) / 86_400_000);
        expect(ecart).toBe(pas);
      }
      // Toutes à 9h : une pesée réclamée à 3h du matin n'est pas un rappel.
      expect(p.dates.every((d) => d.getHours() === WEIGH_IN_HOUR && d.getMinutes() === 0)).toBe(true);
    }
  });

  // 🔴 LA RAISON D'ÊTRE DU PAS DE 28 JOURS (et non 30). Une série programmée d'avance
  // n'est jamais relue par l'app : si ses occurrences glissent dans la semaine, le
  // rendez-vous du dimanche devient mardi, puis jeudi, chez quelqu'un qui n'ouvre plus
  // Kyroz. Le pas doit donc être un multiple de 7, et ce test le COMPTE.
  it('chaque occurrence de la série tombe sur le jour choisi — y compris la 6ᵉ', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const freq of ['biweekly', 'monthly'] as const) {
      for (const jour of JOURS_PESEE.map((j) => j.value)) {
        const p = weighInSchedule('2026-05-15', freq, jour, now);
        if (p.kind !== 'dates') throw new Error(`${freq} : série datée attendue`);
        for (const d of p.dates) expect(d.getDay(), `${freq} / jour ${jour} / ${localStamp(d)}`).toBe(jour);
      }
    }
  });

  // Ce que la série doit garantir, c'est une COUVERTURE — pas un joli chiffre.
  // Le seuil suit la mesure, il ne la précède pas : viser 90 aurait été une promesse
  // que le code ne tient pas, et c'est ce test qui l'avait dit avant que le
  // commentaire ne parte en OTA.
  //
  // 🔴 LES DEUX SEUILS ONT BAISSÉ LE 2026-09-20, ET C'EST CE TEST QUI L'A MESURÉ.
  // Deux causes, toutes deux voulues, et aucune des deux n'était dans mes prévisions :
  //  · la cadence la plus longue vaut 28 jours et non 30, pour que chaque occurrence
  //    retombe sur le jour choisi → 6 × 28 = 168 jours au lieu de 180 ;
  //  · et le RECALAGE sur le jour choisi ramène la première échéance jusqu'à 6 jours
  //    en arrière (84 → 78 pour la quinzaine, 168 → 162 pour les 4 semaines).
  // Le test boucle donc sur les SEPT jours possibles : le seuil doit tenir pour le
  // pire, pas pour le jour que j'avais pris en exemple.
  it('la série couvre au moins 78 jours, quel que soit le jour choisi', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    for (const [freq, mini] of [['biweekly', 78], ['monthly', 162]] as const) {
      for (const jour of JOURS_PESEE.map((j) => j.value)) {
        const p = weighInSchedule('2026-05-15', freq, jour, now);
        if (p.kind !== 'dates') throw new Error(`${freq} : série datée attendue`);
        // ⚠️ On compte depuis MINUIT, pas depuis `now` : mesurée à 10h contre une
        // échéance de 9h, la couverture perdait une heure et rendait 77,96 pour
        // 78 jours pleins — un seuil raté sur un arrondi, pas sur le code.
        const minuit = new Date(now); minuit.setHours(0, 0, 0, 0);
        const jours = Math.floor((p.dates[p.dates.length - 1].getTime() - minuit.getTime()) / 86_400_000);
        expect(jours, `${freq} / jour ${jour}`).toBeGreaterThanOrEqual(mini);
      }
    }
  });

  it('cadence absente = hebdo, comme partout ailleurs', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    expect(weighInSchedule('2026-05-15', undefined, 0, now))
      .toEqual(weighInSchedule('2026-05-15', 'weekly', 0, now));
  });
});

describe('frequencyDays', () => {
  it('mappe chaque cadence vers son intervalle', () => {
    expect(frequencyDays('weekly')).toBe(7);
    expect(frequencyDays('biweekly')).toBe(14);
    expect(frequencyDays('monthly')).toBe(28);
  });
  it('repli défaut (hebdo) si non défini', () => {
    expect(frequencyDays(undefined)).toBe(WEIGH_IN_INTERVALS.weekly);
  });

  // 🔴 LE VERROU DU JOUR DE PESÉE. Une cadence qui n'est pas un multiple de 7 fait
  // glisser le rendez-vous dans la semaine à chaque échéance — c'est ce qui a fait
  // passer la cadence mensuelle de 30 à 28 jours. Ajouter demain une cadence « tous
  // les 10 jours » casserait le réglage en silence : ce test la refuse d'abord.
  it('toutes les cadences sont des multiples de 7 — sinon le jour choisi dérive', () => {
    for (const [freq, jours] of Object.entries(WEIGH_IN_INTERVALS)) {
      expect(jours % 7, `${freq} = ${jours} jours`).toBe(0);
    }
  });

  // Et le minimum décidé par le fondateur : plus rien en dessous d'une fois par semaine.
  it('aucune cadence plus fréquente qu’une fois par semaine', () => {
    for (const [freq, jours] of Object.entries(WEIGH_IN_INTERVALS)) {
      expect(jours, `${freq}`).toBeGreaterThanOrEqual(7);
    }
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
