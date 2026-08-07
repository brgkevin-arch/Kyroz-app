import { describe, it, expect } from 'vitest';
import {
  CITATIONS, REMINDER_PRESETS, REMINDER_PRESET_IDS, REMINDER_TITLES, WEIGH_IN_MESSAGES,
  ReminderPeriod, clampReminderTime, dayIndex, formatCitation, formatReminderTime,
  nextReminderAt, parseReminder, periodOf, pickCitation, pickReminderCopy, pickWeighInCopy,
  presetOf, serializeReminder,
} from '../reminder';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// Le rappel quotidien a changé de modèle : trois créneaux en dur (8h00 · 12h00 ·
// 18h30) sont devenus une heure LIBRE, et une phrase unique par créneau est
// devenue un jeu de messages qui tourne. Deux risques naissent de là, et aucun
// des deux ne se voit en relisant le diff :
//
//  1. **La reprise de l'ancien format.** `@kyroz:reminder` survit à la purge des
//     données : la clé de tous ceux qui avaient réglé leur rappel contient encore
//     `'morning'`. Un parseur qui ne connaîtrait que `'HH:MM'` rendrait `null` —
//     leur rappel s'éteindrait sans un mot, et personne ne le signalerait
//     puisqu'une notification qui n'arrive pas ne se remarque pas.
//
//  2. **Le message hors contexte.** Les trois créneaux GARANTISSAIENT le
//     contexte : on ne pouvait pas recevoir « prépare ton dîner » le matin. Avec
//     une heure libre, c'est `periodOf` qui le garantit — donc il faut le
//     mesurer sur les 24 heures, pas sur trois.
//
// S'y ajoutent deux règles du projet qui, jusqu'ici, n'étaient écrites nulle
// part ailleurs que dans de la prose : **pas d'émoji dans l'interface** (§8 —
// ces quatre-là étaient parmi les treize restants) et **un suivi rassure, il ne
// met pas la pression**. Une règle qu'aucun test ne compte reste décorative.

const HEURES = Array.from({ length: 24 }, (_, h) => h);

describe('heure du rappel — lecture et écriture de la préférence', () => {
  it('reprend l’ANCIEN format (créneaux) sur les heures qu’ils désignaient', () => {
    expect(parseReminder('morning')).toEqual({ hour: 8, minute: 0 });
    expect(parseReminder('midday')).toEqual({ hour: 12, minute: 0 });
    expect(parseReminder('evening')).toEqual({ hour: 18, minute: 30 });
  });

  it('« aucun rappel » se lit sur toutes ses écritures', () => {
    expect(parseReminder('off')).toBeNull();
    expect(parseReminder(null)).toBeNull();
    expect(parseReminder(undefined)).toBeNull();
    expect(parseReminder('')).toBeNull();
  });

  it('refuse ce qui n’est pas une heure plutôt que d’inventer une valeur', () => {
    for (const raw of ['n’importe quoi', '24:00', '12:60', '8h30', '8:5', '-1:00', '12:00:00']) {
      expect(parseReminder(raw), raw).toBeNull();
    }
  });

  it('aller-retour stockage : toute heure valide se relit à l’identique', () => {
    for (const hour of HEURES) {
      for (const minute of [0, 1, 30, 59]) {
        const time = { hour, minute };
        expect(parseReminder(serializeReminder(time))).toEqual(time);
      }
    }
  });

  it('« aucun rappel » s’écrit off, jamais une heure', () => {
    expect(serializeReminder(null)).toBe('off');
    expect(serializeReminder({ hour: 8, minute: 0 })).toBe('08:00');
    expect(serializeReminder({ hour: 23, minute: 5 })).toBe('23:05');
  });

  it('borne toute saisie dans un cadran réel', () => {
    expect(clampReminderTime(25, 0)).toEqual({ hour: 23, minute: 0 });
    expect(clampReminderTime(-3, 0)).toEqual({ hour: 0, minute: 0 });
    expect(clampReminderTime(8, 99)).toEqual({ hour: 8, minute: 59 });
    expect(clampReminderTime(8, -5)).toEqual({ hour: 8, minute: 0 });
    expect(clampReminderTime(NaN, NaN)).toEqual({ hour: 0, minute: 0 });
    expect(clampReminderTime(8.9, 30.7)).toEqual({ hour: 8, minute: 30 });
  });

  it('affiche à la française — minutes pavées, heure non', () => {
    expect(formatReminderTime({ hour: 8, minute: 0 })).toBe('8h00');
    expect(formatReminderTime({ hour: 18, minute: 30 })).toBe('18h30');
    expect(formatReminderTime({ hour: 0, minute: 5 })).toBe('0h05');
  });

  it('la puce de raccourci ne s’allume que sur son heure EXACTE', () => {
    for (const id of REMINDER_PRESET_IDS) expect(presetOf(REMINDER_PRESETS[id])).toBe(id);
    // Une minute d'écart = heure perso : aucune puce allumée.
    expect(presetOf({ hour: 8, minute: 1 })).toBeNull();
    expect(presetOf({ hour: 18, minute: 0 })).toBeNull();
    expect(presetOf(null)).toBeNull();
  });
});

describe('le message colle au moment de la journée', () => {
  it('les 24 heures tombent dans un créneau, et aux bonnes bornes', () => {
    const attendu = (h: number): ReminderPeriod => {
      if (h >= 5 && h <= 10) return 'matin';
      if (h >= 11 && h <= 14) return 'midi';
      if (h >= 15 && h <= 17) return 'apresmidi';
      return 'soir';
    };
    for (const h of HEURES) expect(periodOf({ hour: h, minute: 30 }), `${h}h`).toBe(attendu(h));
  });

  it('la nuit finit la journée précédente, elle n’en commence pas une', () => {
    // 1h du matin ne doit pas annoncer « ta journée commence ».
    expect(periodOf({ hour: 1, minute: 0 })).toBe('soir');
    expect(periodOf({ hour: 4, minute: 59 })).toBe('soir');
    expect(periodOf({ hour: 5, minute: 0 })).toBe('matin');
  });

  it('chaque créneau a de quoi tourner, sans doublon', () => {
    for (const [periode, titres] of Object.entries(REMINDER_TITLES)) {
      expect(titres.length, periode).toBeGreaterThanOrEqual(3);
      expect(new Set(titres).size, periode).toBe(titres.length);
      for (const t of titres) expect(t.length, periode).toBeGreaterThan(0);
    }
  });

  it('le titre reste ancré au moment, quelle que soit la citation', () => {
    // C'est TOUT le rôle du titre : la citation, elle, ne sait pas quelle heure
    // il est. Un rappel de 20h ne doit pas annoncer une journée qui commence.
    for (let j = 0; j < 60; j++) {
      expect(REMINDER_TITLES.soir, `j${j}`).toContain(pickReminderCopy({ hour: 20, minute: 0 }, j).title);
      expect(REMINDER_TITLES.matin, `j${j}`).toContain(pickReminderCopy({ hour: 8, minute: 0 }, j).title);
    }
  });
});

describe('les citations — ce qui porte un nom doit le mériter', () => {
  it('aucune signature vide ou fantôme', () => {
    for (const c of CITATIONS) {
      expect(c.texte.length, c.texte).toBeGreaterThan(10);
      // `auteur` est OPTIONNEL, mais pas facultativement vide : une chaîne vide
      // afficherait « … — » avec un tiret qui ne mène à personne.
      if ('auteur' in c) expect(c.auteur, c.texte).toBeTruthy();
    }
  });

  it('une maxime sans auteur ne porte AUCUN tiret de signature', () => {
    // Le garde-fou contre l'attribution glissée dans le texte : « … — Hippocrate »
    // écrit à la main passerait sous le radar du champ `auteur`.
    for (const c of CITATIONS.filter((x) => !x.auteur)) {
      expect(formatCitation(c), c.texte).not.toMatch(/—/);
    }
  });

  it('la signature s’affiche quand il y en a une', () => {
    const signee = CITATIONS.find((c) => c.auteur)!;
    expect(formatCitation(signee)).toBe(`${signee.texte} — ${signee.auteur}`);
    expect(CITATIONS.filter((c) => c.auteur).length).toBeGreaterThanOrEqual(5);
  });

  it('assez de citations pour ne pas tourner en boucle, et aucune en double', () => {
    expect(CITATIONS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(CITATIONS.map((c) => c.texte)).size).toBe(CITATIONS.length);
  });

  // ⚠️ L'ordre du tableau EST l'ordre des jours. Rangé par famille, il servait
  // trois philosophes d'affilée puis neuf jours de maximes — invisible dans le
  // fichier, flagrant sur un aperçu de 14 jours. Le bouclage compte : la dernière
  // et la première se suivent aussi, un 31 décembre comme un autre jour.
  it('signées et maximes s’alternent — jamais 3 de la même famille de suite', () => {
    const suites: string[] = [];
    for (let i = 0; i < CITATIONS.length; i++) {
      const trois = [0, 1, 2].map((k) => CITATIONS[(i + k) % CITATIONS.length]);
      if (trois.every((c) => !!c.auteur) || trois.every((c) => !c.auteur)) {
        suites.push(trois.map((c) => c.texte.slice(0, 28)).join(' / '));
      }
    }
    expect(suites).toEqual([]);
  });

  it('le couple titre + citation ne se répète pas avant un mois', () => {
    // ⚠️ Ce test tient une propriété ARITHMÉTIQUE, pas une liste : le cycle vaut
    // le produit des deux compteurs seulement s'ils sont PREMIERS ENTRE EUX.
    // Il a rougi pour de vrai en retirant une citation (16 → 15, avec 3 titres) :
    // le cycle est tombé de 48 à 15 jours, alors que rien dans le diff ne parlait
    // de variété. Ajouter ou retirer une citation peut donc coûter deux tiers de
    // la rotation — c'est ce test qui le dira, personne ne le verrait à la relecture.
    const vus = new Set<string>();
    const heure = { hour: 8, minute: 0 };
    for (let j = 0; j < 30; j++) {
      const m = pickReminderCopy(heure, j);
      vus.add(`${m.title}|${m.body}`);
    }
    expect(vus.size).toBe(30);
  });
});

describe('rotation — le rappel ne répète pas la même phrase', () => {
  const HEURE = { hour: 8, minute: 0 };

  it('deux jours d’affilée ne donnent jamais le même message', () => {
    for (const heure of HEURES) {
      const time = { hour: heure, minute: 0 };
      for (let j = 0; j < 12; j++) {
        expect(pickReminderCopy(time, j), `${heure}h j${j}`)
          .not.toEqual(pickReminderCopy(time, j + 1));
      }
    }
  });

  it('tout le recueil passe, personne ne reste au fond du tiroir', () => {
    const vus = new Set<string>();
    for (let j = 0; j < CITATIONS.length; j++) vus.add(pickCitation(j).texte);
    expect(vus.size).toBe(CITATIONS.length);

    // Et les titres tournent aussi, dans chaque créneau.
    for (const periode of Object.keys(REMINDER_TITLES) as ReminderPeriod[]) {
      const time = { matin: { hour: 8, minute: 0 }, midi: { hour: 12, minute: 0 },
        apresmidi: { hour: 16, minute: 0 }, soir: { hour: 20, minute: 0 } }[periode];
      const titresVus = new Set<string>();
      for (let j = 0; j < REMINDER_TITLES[periode].length; j++) titresVus.add(pickReminderCopy(time, j).title);
      expect(titresVus.size, periode).toBe(REMINDER_TITLES[periode].length);
    }
  });

  it('le même jour redonne le MÊME message — ré-armer trois fois ne fait pas défiler', () => {
    expect(pickReminderCopy(HEURE, 20_000)).toEqual(pickReminderCopy(HEURE, 20_000));
  });

  it('un index négatif reste dans le jeu (horloge fantaisiste)', () => {
    for (const j of [-1, -4, -37]) {
      expect(CITATIONS, `j${j}`).toContainEqual(pickCitation(j));
      expect(REMINDER_TITLES.matin, `j${j}`).toContain(pickReminderCopy(HEURE, j).title);
      expect(WEIGH_IN_MESSAGES, `pesée j${j}`).toContainEqual(pickWeighInCopy(j));
    }
  });

  it('la pesée tourne aussi', () => {
    expect(WEIGH_IN_MESSAGES.length).toBeGreaterThanOrEqual(2);
    for (let j = 0; j < 6; j++) expect(pickWeighInCopy(j)).not.toEqual(pickWeighInCopy(j + 1));
  });
});

describe('index du jour — c’est lui qui fait tourner le message', () => {
  it('deux jours civils voisins sont à un cran l’un de l’autre', () => {
    expect(dayIndex(new Date(2026, 7, 8)) - dayIndex(new Date(2026, 7, 7))).toBe(1);
    // Changement d'heure français (dernier dimanche d'octobre) : la veille et le
    // lendemain restent à un cran — un calcul en millisecondes s'y casserait.
    expect(dayIndex(new Date(2026, 9, 26)) - dayIndex(new Date(2026, 9, 25))).toBe(1);
  });

  it('deux instants du MÊME jour donnent le même index', () => {
    expect(dayIndex(new Date(2026, 7, 7, 0, 1))).toBe(dayIndex(new Date(2026, 7, 7, 23, 59)));
  });
});

describe('prochaine occurrence — le texte vise le jour où il s’affichera', () => {
  it('l’heure encore à venir tombe aujourd’hui', () => {
    const now = new Date(2026, 7, 7, 6, 0);
    expect(nextReminderAt({ hour: 8, minute: 0 }, now)).toEqual(new Date(2026, 7, 7, 8, 0, 0, 0));
  });

  it('l’heure déjà passée tombe demain', () => {
    const now = new Date(2026, 7, 7, 9, 0);
    expect(nextReminderAt({ hour: 8, minute: 0 }, now)).toEqual(new Date(2026, 7, 8, 8, 0, 0, 0));
  });

  it('l’heure PILE compte pour demain (elle vient de passer)', () => {
    const now = new Date(2026, 7, 7, 8, 0, 0, 0);
    expect(nextReminderAt({ hour: 8, minute: 0 }, now)).toEqual(new Date(2026, 7, 8, 8, 0, 0, 0));
  });

  it('passe le mois sans se tromper de date', () => {
    const now = new Date(2026, 7, 31, 23, 0);
    expect(nextReminderAt({ hour: 8, minute: 0 }, now)).toEqual(new Date(2026, 8, 1, 8, 0, 0, 0));
  });
});

describe('les règles d’écriture s’appliquent AUSSI aux notifications', () => {
  // Tout ce qui peut s'AFFICHER : chaque titre × chaque citation, plus la pesée.
  const TOUS = [
    ...Object.values(REMINDER_TITLES).flat().map((title) => ({ title, body: '' })),
    ...CITATIONS.map((c) => ({ title: '', body: formatCitation(c) })),
    ...WEIGH_IN_MESSAGES,
  ];

  // Même motif que `typoDA` : symboles, pictogrammes, drapeaux, plus le
  // sélecteur de variante (U+FE0F) qui suit les emojis anciens comme ⚖️.
  const PICTO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

  it('aucun émoji — ces notifications en portaient quatre (💪 🍽️ 🔥 ⚖️)', () => {
    const coupables = TOUS.filter((m) => PICTO.test(m.title) || PICTO.test(m.body));
    expect(coupables.map((m) => m.title || m.body)).toEqual([]);
  });

  // ⚠️ Un rappel qui culpabilise fait fermer l'app, pas ouvrir le plan. L'ancien
  // texte disait « ne casse pas la chaîne » et « garder ta série » : la série est
  // une mécanique de rétention SOBRE (CLAUDE.md §5), elle ne devient une pression
  // que si on la brandit. On ne la brandit donc pas dans une notification.
  const CULPABILISANT = /\b(casse[rz]?|cassé|rate[rz]?|raté|échec|échoué|oublié|perdu|dernière chance|attention)\b/i;

  it('aucun message ne met la pression', () => {
    const coupables = TOUS.filter((m) => CULPABILISANT.test(m.title) || CULPABILISANT.test(m.body));
    expect(coupables.map((m) => `${m.title} — ${m.body}`)).toEqual([]);
  });

  // ⚠️ Le plafond du corps est passé de 110 à 140 en même temps que les citations
  // sont arrivées : une citation d'auteur ne se RACCOURCIT pas — la tronquer ou
  // la réécrire pour tenir dans une bannière ferait dire à Sénèque ce qu'il n'a
  // pas écrit. C'est le plafond qui cède, pas la citation. 140 ≈ trois lignes de
  // bannière iOS ; au-delà, le système coupe avec une ellipse.
  it('le corps tient dans une bannière de notification', () => {
    for (const m of TOUS) {
      expect(m.title.length, m.title).toBeLessThanOrEqual(40);
      expect(m.body.length, m.body).toBeLessThanOrEqual(140);
    }
  });
});
