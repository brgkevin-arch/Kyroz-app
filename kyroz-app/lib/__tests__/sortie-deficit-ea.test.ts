import { describe, it, expect } from 'vitest';
import { computePlan } from '../tdee';
import {
  lowEaEscalation, fatFreeMassKg, readLowEaRegistry,
  LOW_EA_BUDGET_WEEKS, LOW_EA_STEP_PER_WEEK, EA_HARD_FLOOR, EA_OPTIMAL,
} from '../safety';
import { makeProfile } from './helpers';
import { UserProfile } from '../types';

// ── Sortie de déficit après un long séjour en énergie disponible basse ───────
//
// Le moteur remonte le plancher de 0,5 kcal/kg de masse maigre par semaine au-delà
// de 12 semaines cumulées en zone basse, jusqu'à 35. Livré depuis P0.1 — mais
// AUCUN écran ne le disait : la cible d'une femme en sèche montait de quelques
// dizaines de kcal chaque semaine, dix semaines de suite, sans un mot. C'est la
// classe de bug de P3.3 (« le TDEE saute tout seul »), sauf que celui-ci est
// garanti par construction et non accidentel.
//
// Ces tests verrouillent la chose qui compte : **le chiffre annoncé est celui que
// la personne subit**. Un écran d'explication qui annonce le mauvais nombre est
// pire que pas d'écran du tout.

const jour = (i: number) => new Date(Date.UTC(2026, 0, 5) + i * 7 * 864e5).toISOString().slice(0, 10);

const ELLE = makeProfile({
  sex: 'female', age: 29, weight_kg: 62, height_cm: 166, body_fat_pct: 26,
  neat_level: 'desk', goal: 'cut',
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
});

/** Rejoue N ouvertures d'app hebdomadaires, comme dans la vraie vie. */
function vivre(p0: UserProfile, semaines: number) {
  let p = p0;
  const suivi: { semaine: number; cible: number; escalade: ReturnType<typeof lowEaEscalation> }[] = [];
  for (let i = 0; i < semaines; i++) {
    const r = computePlan(p, jour(i));
    suivi.push({ semaine: i + 1, cible: r.profile.target_kcal, escalade: r.low_ea_escalation ?? null });
    p = r.profile;
  }
  return suivi;
}

describe('le chiffre annoncé est le chiffre vécu', () => {
  it('la remontée annoncée vaut exactement la hausse hebdomadaire réelle de la cible', () => {
    const suivi = vivre(ELLE, 24);
    const actives = suivi.filter((s) => s.escalade && s.escalade.weeksToPlateau > 0);
    expect(actives.length, 'la remontée doit se déclencher dans la fenêtre observée').toBeGreaterThan(3);

    for (const s of actives) {
      const precedent = suivi[s.semaine - 2];
      if (!precedent) continue;
      const hausseReelle = s.cible - precedent.cible;
      // Tolérance de 1 kcal : le plancher est arrondi à l'entier à chaque semaine,
      // pas la remontée annoncée. Au-delà, c'est un mensonge à l'écran.
      expect(Math.abs(hausseReelle - s.escalade!.weeklyKcal), `semaine ${s.semaine}`)
        .toBeLessThanOrEqual(1);
    }
  });

  it('la remontée est calculée sur SON corps, pas sur une constante d\'écran', () => {
    const petite = { ...ELLE, weight_kg: 50, body_fat_pct: 22 } as UserProfile;
    const grande = { ...ELLE, weight_kg: 85, body_fat_pct: 32 } as UserProfile;
    const semaines = LOW_EA_BUDGET_WEEKS + 2;
    const a = lowEaEscalation(petite, semaines)!;
    const b = lowEaEscalation(grande, semaines)!;
    expect(a.weeklyKcal).toBeLessThan(b.weeklyKcal);
    expect(a.weeklyKcal).toBe(Math.round(LOW_EA_STEP_PER_WEEK * fatFreeMassKg(petite)));
    expect(b.weeklyKcal).toBe(Math.round(LOW_EA_STEP_PER_WEEK * fatFreeMassKg(grande)));
  });

  it('la fin promise arrive vraiment, et la remontée s\'arrête là', () => {
    const suivi = vivre(ELLE, 40);
    const premiere = suivi.find((s) => s.escalade)!;
    // L'écran promet `weeksToPlateau` semaines. On vérifie que la cible cesse bien
    // de monter à ce terme — promettre une fin qui n'arrive pas serait pire que se taire.
    const termine = suivi.find((s) => s.escalade && s.escalade.weeksToPlateau === 0)!;
    expect(termine, 'le plafond doit être atteint').toBeTruthy();
    expect(termine.semaine - premiere.semaine).toBeLessThanOrEqual(premiere.escalade!.weeksToPlateau + 1);

    const apres = suivi.filter((s) => s.semaine > termine.semaine);
    for (const s of apres) {
      expect(s.cible, `semaine ${s.semaine} : la cible ne doit plus bouger`).toBe(termine.cible);
      expect(s.escalade?.weeksToPlateau).toBe(0);
    }
    // Et le seuil s'est bien arrêté à l'optimum, pas au-delà.
    expect(termine.escalade!.eaPerKgFfm).toBe(EA_OPTIMAL);
  });
});

describe('qui reçoit l\'explication', () => {
  it('personne tant que le budget de 12 semaines n\'est pas dépassé', () => {
    for (let w = 0; w <= LOW_EA_BUDGET_WEEKS; w++) {
      expect(lowEaEscalation(ELLE, w), `${w} semaines`).toBeNull();
    }
    expect(lowEaEscalation(ELLE, LOW_EA_BUDGET_WEEKS + 1)).not.toBeNull();
  });

  it('jamais un homme : son plancher ne remonte pas, il n\'y a rien à expliquer', () => {
    const lui = { ...ELLE, sex: 'male' } as UserProfile;
    expect(lowEaEscalation(lui, 30)).toBeNull();
    // Et vérifié de bout en bout : sa cible ne bouge pas d'un kcal en 24 semaines.
    const suivi = vivre({ ...lui, weight_kg: 78, body_fat_pct: 18 } as UserProfile, 24);
    expect(new Set(suivi.map((s) => s.cible)).size).toBe(1);
  });

  it('jamais une femme ménopausée déclarée : même raison', () => {
    expect(lowEaEscalation({ ...ELLE, is_post_menopausal: true } as UserProfile, 30)).toBeNull();
  });
});

describe('cohérence avec le producteur unique', () => {
  it('une explication implique toujours le drapeau — mais plus l\'inverse', () => {
    // ⚠️ ÉQUIVALENCE DEVENUE IMPLICATION LE 2026-07-31, et ce n'est pas un
    // relâchement : les deux signaux ont cessé de dire la même chose.
    //  · `LOW_EA_BUDGET_EXCEEDED` est un fait sur l'EXPOSITION : plus de 12 semaines
    //    cumulées en zone basse. Il reste levé quoi qu'il arrive au plan.
    //  · l'escalade est un fait sur le PLAN : « ta cible monte ». Depuis le
    //    relèvement NEAT, la cible peut passer au-dessus du plancher escaladé — le
    //    plancher monte alors sans l'emmener, et il n'y a rien à expliquer.
    // Annoncer une remontée qui n'a pas lieu était précisément le mensonge corrigé
    // ce jour-là (mesuré : 23 kcal/j annoncés, 0 vécu, à la semaine 14).
    const suivi: { flags: string[]; escalade: unknown }[] = [];
    let p: UserProfile = ELLE;
    for (let i = 0; i < 24; i++) {
      const r = computePlan(p, jour(i));
      suivi.push({ flags: r.flags, escalade: r.low_ea_escalation });
      p = r.profile;
    }
    for (const [i, s] of suivi.entries()) {
      if (s.escalade) {
        expect(s.flags, `semaine ${i + 1}`).toContain('LOW_EA_BUDGET_EXCEEDED');
      }
    }
    // Le sens qui compte est bien exercé : l'explication FINIT par arriver, elle
    // n'a pas simplement disparu du parcours.
    expect(suivi.some((s) => s.escalade), 'l\'explication doit se déclencher').toBe(true);
  });

  it('le décompte annoncé est celui qui a servi à calculer le plancher', () => {
    // L'écran ne doit pas pouvoir raconter une autre histoire que le moteur : le
    // nombre de semaines de dépassement se déduit du registre ANTÉRIEUR, celui-là
    // même qui a produit le plancher du jour.
    let p: UserProfile = ELLE;
    for (let i = 0; i < 20; i++) {
      const r = computePlan(p, jour(i));
      if (r.low_ea_escalation) {
        const registre = readLowEaRegistry(r.profile.low_ea_weeks);
        const attendu = EA_HARD_FLOOR + r.low_ea_escalation.weeksOverBudget * LOW_EA_STEP_PER_WEEK;
        expect(r.low_ea_escalation.eaPerKgFfm).toBe(Math.min(EA_OPTIMAL, attendu));
        // La semaine courante ne compte jamais dans son propre plancher.
        expect(r.low_ea_escalation.weeksOverBudget)
          .toBeLessThan(registre.weeks.length - LOW_EA_BUDGET_WEEKS + 1);
      }
      p = r.profile;
    }
  });
});
