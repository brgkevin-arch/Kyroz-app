import { describe, it, expect } from 'vitest';
import { chainProgress, isMilestone, nextMilestone, streakMessage, celebrationCopy, advanceStreak, nextFreezeRecharge } from '../streak';
import { Streak } from '../types';

describe('chainProgress (chaînon de 7)', () => {
  it('se remplit 1→7 la première semaine', () => {
    expect(chainProgress(0)).toEqual({ filled: 0, total: 7 });
    expect(chainProgress(1)).toEqual({ filled: 1, total: 7 });
    expect(chainProgress(7)).toEqual({ filled: 7, total: 7 });
  });
  it('repart à 1 après une semaine pleine', () => {
    expect(chainProgress(8)).toEqual({ filled: 1, total: 7 });
    expect(chainProgress(14)).toEqual({ filled: 7, total: 7 });
    expect(chainProgress(15)).toEqual({ filled: 1, total: 7 });
  });
});

describe('isMilestone', () => {
  it('paliers exacts uniquement (un reset à 1 ne célèbre pas)', () => {
    expect(isMilestone(1)).toBe(false);
    expect(isMilestone(3)).toBe(true);
    expect(isMilestone(7)).toBe(true);
    expect(isMilestone(8)).toBe(false);
    expect(isMilestone(14)).toBe(true);
    expect(isMilestone(100)).toBe(true);
  });
  it('au-delà de 100 : multiples de 100', () => {
    expect(isMilestone(200)).toBe(true);
    expect(isMilestone(150)).toBe(false);
  });
});

describe('nextMilestone', () => {
  it('prochain palier croissant', () => {
    expect(nextMilestone(0)).toBe(3);
    expect(nextMilestone(3)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(99)).toBe(100);
    expect(nextMilestone(100)).toBe(200);
  });
});

describe('streakMessage', () => {
  it('gère le pluriel (« 1 jour », pas « 1 jours »)', () => {
    expect(streakMessage(6)).toContain('1 jour ');
    expect(streakMessage(5)).toContain('2 jours');
  });
  it('célèbre le cap des 7 jours (North Star)', () => {
    expect(streakMessage(7)).toMatch(/7 jours atteint/);
  });
  it('après 7 : pointe le palier suivant', () => {
    expect(streakMessage(10)).toContain('14');
  });
});

describe('celebrationCopy', () => {
  // ⚠️ Ce test citait le TEXTE générique (« hors norme »), donc il verrouillait une
  // formule que la relecture du 2026-08-26 a dû réécrire : « hors norme » comparait
  // à une norme, ce que CLAUDE.md §5 exclut. Ce qu'il voulait vraiment vérifier,
  // c'est que les paliers CONNUS ont leur texte à eux et que le générique prend le
  // relais au-delà — pas les mots employés. Le vocabulaire, lui, est tenu par le
  // verrou de microcopie en bas de ce fichier.
  it('copy dédiée aux paliers connus, générique au-delà', () => {
    const connus = [3, 7, 14, 30, 60].map((n) => celebrationCopy(n).body);
    expect(new Set(connus).size, 'deux paliers connus partagent le même texte').toBe(connus.length);
    expect(celebrationCopy(300).body).toBe(celebrationCopy(500).body);   // le générique
    expect(connus).not.toContain(celebrationCopy(300).body);
  });
  // Ces deux-là vérifiaient `title` quand le titre portait le nombre. Depuis E22
  // c'est le CHIFFRE qui est l'objet visuel, donc l'assertion suit le champ qui
  // porte réellement l'information à l'écran — sinon elle continuerait de passer
  // sur un titre que plus personne n'affiche.
  it('le nombre de jours arrive à l’écran, palier connu ou non', () => {
    expect(celebrationCopy(7).jours).toBe('7');
    expect(celebrationCopy(300).jours).toBe('300');
  });
  it('accorde le libellé', () => {
    expect(celebrationCopy(7).libelle).toBe('jours d’affilée');
    expect(celebrationCopy(1).libelle).toBe('jour d’affilée');
  });
});

const TODAY = '2026-06-20', YDAY = '2026-06-19', DBEF = '2026-06-18';
const base = (o: Partial<Streak> = {}): Streak =>
  ({ current_streak_days: 0, longest_streak_days: 0, last_active_date: '', freeze_available: true, ...o });

describe('advanceStreak — bouclier de série', () => {
  it("déjà actif aujourd'hui → inchangé (même référence, pas d'écriture)", () => {
    const cur = base({ current_streak_days: 3, last_active_date: TODAY });
    const step = advanceStreak(cur, TODAY, YDAY, DBEF);
    expect(step.streak).toBe(cur);
    expect(step.froze).toBe(false);
  });

  it('actif hier → +1', () => {
    const step = advanceStreak(base({ current_streak_days: 3, last_active_date: YDAY }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(4);
    expect(step.froze).toBe(false);
    expect(step.streak.last_active_date).toBe(TODAY);
  });

  it('1 jour manqué + bouclier dispo → série GELÉE (préservée), bouclier consommé', () => {
    const step = advanceStreak(base({ current_streak_days: 4, last_active_date: DBEF, freeze_available: true }), TODAY, YDAY, DBEF);
    expect(step.froze).toBe(true);
    expect(step.streak.current_streak_days).toBe(4);   // préservée
    expect(step.streak.freeze_available).toBe(false);  // consommé
    expect(step.streak.last_active_date).toBe(TODAY);
    expect(step.reachedMilestone).toBeNull();          // jamais de célébration sur un gel
  });

  it('1 jour manqué SANS bouclier → reset à 1 (nouveau bouclier)', () => {
    const step = advanceStreak(base({ current_streak_days: 4, last_active_date: DBEF, freeze_available: false }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(1);
    expect(step.froze).toBe(false);
    expect(step.streak.freeze_available).toBe(true);
  });

  it('2+ jours manqués → reset à 1 même avec bouclier', () => {
    const step = advanceStreak(base({ current_streak_days: 10, last_active_date: '2026-06-10', freeze_available: true }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(1);
    expect(step.froze).toBe(false);
  });

  it('le bouclier se recharge au palier de 7 jours', () => {
    const step = advanceStreak(base({ current_streak_days: 6, last_active_date: YDAY, freeze_available: false }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(7);
    expect(step.streak.freeze_available).toBe(true);
    expect(step.reachedMilestone).toBe(7);
  });

  it('reste sans bouclier hors palier 7', () => {
    const step = advanceStreak(base({ current_streak_days: 3, last_active_date: YDAY, freeze_available: false }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(4);
    expect(step.streak.freeze_available).toBe(false);
  });

  it('profil legacy (freeze_available undefined) → traité comme dispo', () => {
    const cur: Streak = { current_streak_days: 4, longest_streak_days: 4, last_active_date: DBEF };
    const step = advanceStreak(cur, TODAY, YDAY, DBEF);
    expect(step.froze).toBe(true);
    expect(step.streak.current_streak_days).toBe(4);
  });

  it('nextFreezeRecharge = prochain multiple de 7', () => {
    expect(nextFreezeRecharge(4)).toBe(7);
    expect(nextFreezeRecharge(7)).toBe(14);
    expect(nextFreezeRecharge(0)).toBe(7);
  });
});

// ── VERROU : la microcopie de série ne met pas la pression ───────────────────
//
// CLAUDE.md §5 n'autorise la série qu'à une condition, écrite le 2026-07-30 : les
// mécaniques de rétention passent si elles « rassurent au lieu de mettre la
// pression », et le test à appliquer est *« est-ce que ça compare l'utilisateur à
// quelqu'un d'autre, ou est-ce que ça l'aide à ne pas décrocher ? »*
//
// Cette règle était écrite et personne ne la comptait. Relecture des textes du
// 2026-08-26 : trois messages ne la respectaient pas — « Ne casse pas la chaîne »
// (une injonction), « Tu es dans le club des réguliers » (un club suppose les
// autres), « Une régularité hors norme. Respect. » (une norme, puis un jugement).
// Une règle écrite dans le fichier de référence reste décorative tant qu'aucun test
// ne la compte. Celui-ci la compte.
describe('la série constate, elle n’exige pas et elle ne compare pas', () => {
  /** Tous les textes que la série peut servir, paliers compris. */
  const tousLesTextes = (): string[] => {
    const out: string[] = [];
    for (let j = 0; j <= 130; j++) out.push(streakMessage(j));
    for (const n of [3, 7, 14, 30, 60, 100, 200]) {
      const c = celebrationCopy(n);
      out.push(c.body, c.libelle);
    }
    return out;
  };

  // Vocabulaire d'INJONCTION : le texte demande de ne pas échouer.
  const INJONCTIONS = /ne casse pas|ne rate pas|ne lâche pas|ne perds pas|tiens bon|il faut que|tu dois/i;
  // Vocabulaire de COMPARAISON : le texte situe l'utilisateur par rapport aux autres.
  const COMPARAISONS = /club|hors norme|record|classement|mieux que|meilleur que|comme les autres|élite|top \d/i;
  // Vocabulaire de JUGEMENT : le texte note la personne au lieu de constater le fait.
  const JUGEMENTS = /respect\b|bravo|félicitations|impressionnant|exceptionnel/i;

  it('aucune injonction', () => {
    for (const t of tousLesTextes()) expect(INJONCTIONS.test(t), `« ${t} »`).toBe(false);
  });

  /**
   * ⚠️ LA SEULE EXCEPTION, et elle est DATÉE. « Une régularité hors norme. Respect. »
   * a été réécrite par la relecture du 2026-08-26 puis REMISE par le fondateur, en
   * connaissance de la remarque. C'est le palier des 100 jours et au-delà.
   *
   * Elle est inscrite ici plutôt que le vocabulaire retiré de la liste : une règle
   * qu'on desserre pour faire passer un cas ne garde plus rien, alors qu'une
   * exception nommée se relit. Et le test ci-dessous vérifie qu'elle correspond
   * encore à un texte réel — une exception qui survit à sa cause redevient un trou.
   */
  const EXCEPTION = 'Une régularité hors norme. Respect.';
  const saufException = () => tousLesTextes().filter((t) => t !== EXCEPTION);

  it('aucune comparaison aux autres', () => {
    for (const t of saufException()) expect(COMPARAISONS.test(t), `« ${t} »`).toBe(false);
  });

  it('aucun jugement de la personne', () => {
    for (const t of saufException()) expect(JUGEMENTS.test(t), `« ${t} »`).toBe(false);
  });

  it('l’exception du fondateur existe encore — sinon elle n’a plus à être listée', () => {
    expect(tousLesTextes(), 'l’exception ne correspond à aucun texte servi').toContain(EXCEPTION);
    // Et elle ne vaut QUE pour le palier au-delà de 100 : nulle part ailleurs.
    expect(celebrationCopy(200).body).toBe(EXCEPTION);
    for (const n of [3, 7, 14, 30, 60]) expect(celebrationCopy(n).body).not.toBe(EXCEPTION);
  });

  // Le pendant positif : la règle interdit la pression, elle n'interdit pas de
  // parler. Un test qui ne vérifie que des absences resterait vert si quelqu'un
  // vidait tous les messages.
  it('les paliers disent quand même quelque chose', () => {
    for (const n of [3, 7, 14, 30, 60, 100]) {
      expect(celebrationCopy(n).body.length, `palier ${n}`).toBeGreaterThan(20);
    }
    expect(streakMessage(7)).toContain('7 jours');
  });
});
