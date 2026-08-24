import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  heuresLimites, repasEchus, repasEchusVeille, getRepasAuto, FIN_DE_JOURNEE, minutesDepuisMinuit,
} from '../repasAuto';
import { BUILTIN_SLOTS } from '../mealSlots';
import type { Meal, MealSlot } from '../types';

// ── LES REPAS SE COCHENT TOUT SEULS QUAND LEUR HEURE EST PASSÉE ─────────────
//
// Décision fondateur du 2026-08-24. La règle : **un repas se coche quand le repas
// SUIVANT commence ; le dernier de la journée se coche à la fin de la journée.**
//
// ⚠️ Elle est lue sur les créneaux RÉELS du profil, jamais sur des heures écrites
// en dur : celui qui dîne à 22 h ou qui a créé un « shaker post-training » à 17 h
// obtient le bon comportement sans qu'on ait prévu son cas.
//
// ⚠️ ET JAMAIS MINUIT. `plan.tsx` efface le suivi de la journée au changement de
// date (`resetTracking`) : un dîner coché « à 00 h 00 » serait effacé dans la même
// seconde. D'où 23 h 59, et le solde de la veille au premier lancement du lendemain.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const plan = lire('app/(tabs)/plan.tsx');

const repas = (meal_type: string, over: Partial<Meal> = {}): Meal =>
  ({ id: meal_type, day: 1, meal_type, portions: 1, recipe: { id: 'r', ingredients: [] }, macros: {} , ...over }) as unknown as Meal;

describe('l’heure limite d’un repas est le DÉBUT du suivant', () => {
  const limites = heuresLimites(BUILTIN_SLOTS);

  it('les trois premiers créneaux passent la main au suivant', () => {
    expect(limites.get('breakfast')).toBe(13 * 60);   // le déjeuner commence
    expect(limites.get('lunch')).toBe(16 * 60);       // la collation commence
    expect(limites.get('snack')).toBe(20 * 60);       // le dîner commence
  });

  it('🔴 le dernier repas se coche à 23 h 59, JAMAIS à minuit', () => {
    // À minuit, `resetTracking` efface le suivi du jour : le statut serait posé et
    // effacé dans la même seconde, et la réserve débitée pour rien à l'écran.
    expect(limites.get('dinner')).toBe(FIN_DE_JOURNEE);
    expect(FIN_DE_JOURNEE).toBeLessThan(24 * 60);
  });

  it('un créneau créé après coup se range à son HEURE, pas à sa position', () => {
    // « Shaker post-training » ajouté en dernier dans la liste, mais à 17 h : sans
    // le tri, il hériterait de l'heure limite du petit-déjeuner.
    const slots: MealSlot[] = [
      ...BUILTIN_SLOTS,
      { id: 'shaker', label: 'Shaker', hour: 17, minute: 30, pool: 'snack' },
    ];
    const l = heuresLimites(slots);
    expect(l.get('snack')).toBe(17 * 60 + 30);   // la collation passe la main au shaker
    expect(l.get('shaker')).toBe(20 * 60);       // et le shaker au dîner
    expect(l.get('dinner')).toBe(FIN_DE_JOURNEE);
  });
});

describe('ce qui est échu, et ce qu’on ne touche jamais', () => {
  const jour = [repas('breakfast'), repas('lunch'), repas('snack'), repas('dinner')];

  it('à 13 h, seul le petit-déjeuner est échu', () => {
    expect(repasEchus(jour, BUILTIN_SLOTS, 13 * 60).map((m) => m.meal_type)).toEqual(['breakfast']);
  });

  it('à 12 h 59, rien ne l’est encore', () => {
    expect(repasEchus(jour, BUILTIN_SLOTS, 12 * 60 + 59)).toHaveLength(0);
  });

  it('en fin de journée, tout ce qui reste l’est', () => {
    expect(repasEchus(jour, BUILTIN_SLOTS, FIN_DE_JOURNEE)).toHaveLength(4);
  });

  it('🔴 un repas que l’utilisateur a TRANCHÉ n’est jamais repris', () => {
    // Mangé ou sauté : il a décidé, on ne repasse pas derrière lui.
    const tranches = [repas('breakfast', { status: 'eaten' }), repas('lunch', { status: 'skipped' })];
    expect(repasEchus(tranches, BUILTIN_SLOTS, FIN_DE_JOURNEE)).toHaveLength(0);
  });

  it('🔴 un repas FIXE n’est jamais coché', () => {
    // L'app ne le suit pas : il n'a même pas de bouton « J'ai cuisiné ». Le cocher
    // déduirait de la réserve des ingrédients qu'aucune recette de Kyroz ne décrit.
    const fixe = [repas('lunch', { fixed: true } as Partial<Meal>)];
    expect(repasEchus(fixe, BUILTIN_SLOTS, FIN_DE_JOURNEE)).toHaveLength(0);
    expect(repasEchusVeille(fixe)).toHaveLength(0);
  });

  it('la veille solde tout ce qui n’a pas été tranché, quelle que soit l’heure', () => {
    expect(repasEchusVeille(jour)).toHaveLength(4);
  });

  it('minutesDepuisMinuit lit l’heure LOCALE', () => {
    const d = new Date(2026, 7, 24, 19, 30);
    expect(minutesDepuisMinuit(d)).toBe(19 * 60 + 30);
  });
});

describe('le réglage : ALLUMÉ par défaut', () => {
  it('sans préférence enregistrée, l’auto-coche est actif', () => {
    // ⚠️ Défaut INVERSE de feu « Tenir compte du frigo », et c'est raisonné : un
    // repas coché à tort se VOIT sur le plan et se décoche d'une touche, là où une
    // réserve périmée faisait DISPARAÎTRE un article de la liste, en silence.
    expect(getRepasAuto()).toBe(true);
  });

  it('la préférence est chargée au layout RACINE, pas dans un écran', () => {
    // Une valeur d'appareil oubliée dans ce chargement groupé repart sur son défaut
    // à chaque démarrage, et ça ne se voit nulle part (CLAUDE.md §11).
    expect(lire('app/_layout.tsx')).toContain('loadRepasAuto()');
  });

  it('elle se règle depuis le Profil, et l’écran dit où', () => {
    expect(lire('app/(tabs)/profil.tsx')).toContain('useRepasAuto()');
    expect(lire('app/(tabs)/profil.tsx')).toContain('Repas cochés automatiquement');
  });
});

describe('l’auto-coche vaut EXACTEMENT « J’ai cuisiné »', () => {
  const bloc = plan.slice(plan.indexOf('const autoCocher'), plan.indexOf('useFocusEffect(useCallback(() => { autoCocher'));

  it('elle déduit de la réserve', () => {
    expect(bloc).toContain('deductIngredients(items, mealIngredients(m))');
    expect(bloc).toContain('savePantry(items)');
  });

  it('elle verrouille les macros et recale la journée', () => {
    expect(bloc).toContain("status: 'eaten' as MealStatus, locked_macros: m.macros");
    expect(bloc).toContain('rebalanceDay(profile,');
  });

  it('elle compte pour la série (décision fondateur)', () => {
    expect(bloc).toContain('markActiveToday()');
  });

  it('🔴 la mesure porte `auto: true` — sinon la north star devient un compteur d’installations', () => {
    // « Un jour actif = un jour où un repas a été CUISINÉ » (METRICS.md §1). Sans ce
    // drapeau, PostHog ne peut plus distinguer un geste d'une échéance.
    expect(bloc).toContain('capture(Events.mealCooked, { meal_type: m.meal_type, auto: true })');
  });

  it('elle DIT ce qu’elle a fait', () => {
    // Un statut qui change tout seul sans un mot se lit comme un bug.
    expect(bloc).toMatch(/toast\(/);
    expect(bloc).toContain("son heure était passée");
  });

  it('elle ne tourne pas quand le réglage est éteint', () => {
    expect(bloc).toContain('if (!plan || !profile || !repasAuto) return;');
  });
});

describe('🔴 le jour de plan est celui d’AUJOURD’HUI, jamais « le prochain »', () => {
  it('`idxDuJour` rend null quand le jour n’est pas un jour de plan', () => {
    // `todayIdx` retombe sur le prochain jour à venir pour ne pas ouvrir sur une
    // page vide : le réutiliser ici aurait fait manger les repas de LUNDI pendant
    // le week-end d'un plan du lundi au vendredi.
    const bloc = plan.slice(plan.indexOf('const idxDuJour'), plan.indexOf('const todayIdx'));
    expect(bloc).toContain('exact >= 0 ? exact + 1 : null');
    expect(plan).toContain('const jour = idxDuJour(new Date().getDay());');
    expect(plan).toContain('if (jour === null) return;');
  });
});

describe('🔴 la veille se solde AVANT que le suivi soit effacé', () => {
  it('l’ordre est explicite dans l’effet de changement de jour', () => {
    // `resetTracking` remet tous les repas à « planifié » : après lui, on ne sait
    // plus lesquels étaient dus, et le dîner de la veille ne quitterait jamais la
    // réserve. C'est le seul chemin pour un dîner coché à 23 h 59 app fermée.
    const bloc = plan.slice(plan.indexOf('resetTried.current = today;'));
    expect(bloc.indexOf('await solderLaVeille(plan)')).toBeLessThan(bloc.indexOf('resetTracking(profile, plan)'));
  });

  it('elle ne solde QUE la veille, et une seule fois', () => {
    const bloc = plan.slice(plan.indexOf('const solderLaVeille'));
    expect(bloc.slice(0, 900)).toContain("if (p.tracking_date !== hier) return;");
    expect(bloc.slice(0, 900)).toContain('if (await dejaSolde(hier)) return;');
    expect(bloc.slice(0, 900)).toContain('await marquerSolde(hier)');
  });

  it('elle ne crédite NI la série NI un statut', () => {
    // La série dit « tu as ouvert Kyroz ce jour-là » : la créditer après coup pour
    // un jour où personne n'a ouvert l'app en ferait un compteur de jours.
    const bloc = plan.slice(plan.indexOf('const solderLaVeille'), plan.indexOf('const load = async'));
    expect(bloc).not.toContain('markActiveToday');
    expect(bloc).not.toContain('setMealStatus');
  });
});
