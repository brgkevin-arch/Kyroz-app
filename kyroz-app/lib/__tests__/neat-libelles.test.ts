import { describe, it, expect } from 'vitest';
import {
  NEAT_ORDER, NEAT_LABEL, NEAT_HINT, NEAT_SHORT, NEAT_PAL, DEFAULT_NEAT_LEVEL, computePlan,
} from '../tdee';
import { makeProfile } from './helpers';
import { NeatLevel } from '../types';

// ── Libellés du niveau NEAT ─────────────────────────────────────────────────
//
// On ne teste pas ici de l'orthographe : on verrouille le RAPPORT entre ce que la
// question fait dire à l'utilisateur et ce que le moteur en fait. Un cran de NEAT
// vaut ~90 kcal/j depuis le resserrement de la table (2026-07-31 : 1,30 / 1,35 /
// 1,40 / 1,45, contre 1,20 / 1,28 / 1,36 / 1,45) : la rédaction de ces quatre
// lignes reste une pièce du moteur, pas de l'habillage — simplement moins
// tranchante qu'avant, ce qui est le bénéfice recherché.

const TODAY = '2026-07-28';

/** Le profil de mesure du bloc NEAT_LABEL : H 30 ans, 85 kg, 4× muscu, sèche. */
const cas = makeProfile({
  sex: 'male', age: 30, weight_kg: 85, height_cm: 180, body_fat_pct: 20,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  goal: 'cut',
});

const planAt = (neat: NeatLevel) => computePlan({ ...cas, neat_level: neat }, TODAY);

describe('enjeu du réglage — ce que la rédaction protège', () => {
  it('un cran reste significatif, mais ne fait plus basculer le plan', () => {
    // ⚠️ SEUIL ABAISSÉ DE 100 À 80 LE 2026-07-31 — un choix, pas un assouplissement
    // pour faire passer la suite. 80 et non 60 : la mesure donne 92 sur les trois
    // crans de ce gabarit, donc une bande [80, 150) laisse 13 % de marge sous la
    // valeur réelle au lieu de 53 %. Un seuil trop lâche laisserait passer un
    // resserrement futur de la table sans que rien ne rougisse.
    // La table est passée d'un pas de 0,08 à un pas de
    // 0,05 (1,30 / 1,35 / 1,40 / 1,45) : elle devait rester MONOTONE après le
    // relèvement de `desk` à 1,30, sans franchir le plafond de 1,45 au-delà duquel
    // les niveaux classiques incluent l'exercice déjà compté par les MET.
    // Conséquence VOULUE : se tromper d'un cran coûte deux fois moins cher qu'avant.
    for (let i = 0; i < NEAT_ORDER.length - 1; i++) {
      const a = NEAT_ORDER[i], b = NEAT_ORDER[i + 1];
      const delta = planAt(b).profile.tdee_kcal - planAt(a).profile.tdee_kcal;
      expect(delta, `${a} → ${b}`).toBeGreaterThanOrEqual(80);
      // …et l'écart reste BORNÉ : un cran ne doit jamais peser autant qu'un objectif
      // entier (les deltas de GOAL_CONFIG vont de −300 à +400).
      expect(delta, `${a} → ${b}`).toBeLessThan(150);
    }
  });

  it('le plancher ne tient plus lieu de cible, à AUCUN cran', () => {
    // ⚠️ CE TEST AFFIRME MAINTENANT L'INVERSE DE CE QU'IL AFFIRMAIT, et c'est la
    // raison d'être du relèvement de `desk`. Avant : `desk` était le seul cran où
    // le plancher mordait, et le déficit y était rogné (−180 au lieu de −300).
    // Mesuré ensuite : à 1,20 le déficit demandé n'était servi À AUCUNE masse maigre
    // (de 30 à 80 kg) — le garde-fou tenait lieu de cible pour la majorité des
    // comptes, et « sèche = −300 kcal/j » était une promesse jamais tenue.
    const deficit = (n: NeatLevel) => planAt(n).profile.target_kcal - planAt(n).profile.tdee_kcal;
    for (const n of NEAT_ORDER) {
      expect(planAt(n).flags, n).not.toContain('FLOOR_APPLIED');
      expect(deficit(n), n).toBe(-300);   // l'objectif demandé, servi en entier
      // Le plancher n'a pas disparu : il reste SOUS la cible, prêt à mordre si le
      // corps change. Ce n'est pas un garde-fou retiré, c'est un garde-fou qui
      // cesse d'être la valeur par défaut.
      expect(planAt(n).floor_kcal, n).toBeLessThan(planAt(n).profile.target_kcal);
    }
  });

  it('le défaut servi est bien le cran le plus prudent', () => {
    // La question vit dans le profil, pas à l'onboarding : le défaut est ce que la
    // majorité reçoit réellement. Il doit être le PLUS BAS de la table.
    expect(NEAT_PAL[DEFAULT_NEAT_LEVEL]).toBe(Math.min(...Object.values(NEAT_PAL)));
    expect(NEAT_ORDER[0]).toBe(DEFAULT_NEAT_LEVEL);
  });
});

describe('rédaction — anti-inflation', () => {
  // Le piège corrigé : l'indication du cran 2 était « Bureau avec déplacements,
  // courses, ménage ». Les courses et le ménage, c'est tout le monde — le texte
  // invitait un employé de bureau à monter d'un cran, soit +130 kcal/j et la fin du
  // plancher. Ces mots ne peuvent donc apparaître QUE dans le cran le plus bas,
  // où ils coupent l'inflation au lieu de la nourrir.
  const BANALITES = ['course', 'courses', 'ménage', 'ménages'];

  // Comparaison par MOT ENTIER et pas par sous-chaîne : « déménagement » contient
  // « ménage », et le niveau `physical` a le droit de citer les déménageurs.
  const mots = (s: string) => s.toLowerCase().split(/[^a-zà-öø-ÿ]+/i).filter(Boolean);

  it('les activités que TOUT LE MONDE fait ne sont citées qu\'au premier cran', () => {
    for (const lvl of NEAT_ORDER) {
      if (lvl === DEFAULT_NEAT_LEVEL) continue;
      const vocabulaire = new Set(mots(`${NEAT_LABEL[lvl]} ${NEAT_HINT[lvl]}`));
      for (const mot of BANALITES) {
        expect(vocabulaire.has(mot), `${lvl} ne doit pas citer « ${mot} »`).toBe(false);
      }
    }
    // …et elles sont bien citées quelque part : les rayer partout laisserait la
    // personne qui fait ses courses sans savoir où se ranger.
    const bas = new Set(mots(`${NEAT_LABEL[DEFAULT_NEAT_LEVEL]} ${NEAT_HINT[DEFAULT_NEAT_LEVEL]}`));
    expect(BANALITES.some((m) => bas.has(m))).toBe(true);
  });

  it('aucun libellé ne parle de sport : le NEAT et les séances sont deux questions', () => {
    // Un libellé qui évoque l'entraînement ferait compter les séances DEUX fois —
    // une fois dans le multiplicateur NEAT, une fois dans les MET nets.
    const SPORT = ['séance', 'seance', 'entraîn', 'entrain', 'sport', 'muscu', 'cardio'];
    for (const lvl of NEAT_ORDER) {
      const texte = `${NEAT_LABEL[lvl]} ${NEAT_HINT[lvl]} ${NEAT_SHORT[lvl]}`.toLowerCase();
      for (const mot of SPORT) {
        expect(texte, `${lvl} ne doit pas évoquer « ${mot} »`).not.toContain(mot);
      }
    }
  });

  it('chaque cran est reconnaissable sans s\'auto-évaluer', () => {
    // Ancrage = un fait (métier, posture de la journée). Un cran dont l'indication
    // ne cite aucun repère concret redevient un adjectif flatteur.
    for (const lvl of NEAT_ORDER) {
      expect(NEAT_HINT[lvl].length, lvl).toBeGreaterThan(20);
    }
  });
});

describe('intégrité de la table', () => {
  it('les trois tables couvrent exactement les mêmes crans', () => {
    for (const table of [NEAT_LABEL, NEAT_HINT, NEAT_SHORT, NEAT_PAL]) {
      expect(Object.keys(table).sort()).toEqual([...NEAT_ORDER].sort());
    }
  });

  it('les libellés sont distincts et non vides', () => {
    for (const table of [NEAT_LABEL, NEAT_HINT, NEAT_SHORT]) {
      const vals = NEAT_ORDER.map((l) => (table as Record<NeatLevel, string>)[l]);
      expect(new Set(vals).size).toBe(NEAT_ORDER.length);
      for (const v of vals) expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('la forme courte tient sur une ligne de résumé', () => {
    // Elle sert la ligne « Sport & activité » du profil, en `numberOfLines={1}` et
    // PRÉFIXÉE par le nombre de sports. Budget mesuré à 375 pt : ~36 caractères en
    // tout, donc 22 pour le niveau une fois retiré « Aucun sport · » (14). Vérifié
    // à l'écran : 32 caractères s'affichaient « journées assises, en dépl… ».
    const PREFIXE_MAX = 'Aucun sport · '.length;
    for (const lvl of NEAT_ORDER) {
      expect(PREFIXE_MAX + NEAT_SHORT[lvl].length, lvl).toBeLessThanOrEqual(36);
      // Et elle ne doit pas dire autre chose que le libellé complet : même famille
      // de mots, sinon le résumé et l'option se contredisent à l'écran.
      expect(NEAT_SHORT[lvl], lvl).not.toBe(NEAT_LABEL[lvl]);
    }
  });

  it('l\'ordre affiché est celui des multiplicateurs croissants', () => {
    const pals = NEAT_ORDER.map((l) => NEAT_PAL[l]);
    expect(pals).toEqual([...pals].sort((a, b) => a - b));
  });
});
