import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShoppingList } from '../shoppingList';
import type { MealPlan } from '../types';
import type { PantryItem } from '../pantry';

// ── LA RÉSERVE SE REMPLIT À LA CLÔTURE, ET ELLE EST TOUJOURS SOUSTRAITE ──────
//
// Ce fichier remplace `frigoOptionnel.test.ts` (2026-08-24). L'interrupteur
// « Tenir compte du frigo » a été retiré, et il faut comprendre POURQUOI ce
// retrait n'est pas un retour en arrière — sinon la prochaine session le
// remettra, avec les mêmes arguments qui étaient justes en leur temps :
//
//   · `buildShoppingList` **masque entièrement** un article que la réserve dit
//     couvert — il ne l'affiche pas « à 0 », il le fait DISPARAÎTRE. Toujours vrai ;
//   · ce qui était dangereux, c'est que la réserve se CRÉDITAIT à chaque case
//     cochée dans les rayons (geste qu'on fait, défait, refait) et ne se DÉBITAIT
//     qu'en cuisine (geste qu'on pouvait sauter). Elle ne pouvait que sur-estimer.
//
// ⇒ Les deux moitiés ont bougé : elle ne se crédite plus qu'à la CLÔTURE d'une
// sortie — une fois, quand les courses sont réellement faites — et elle se débite
// toute seule dès qu'un repas est réputé mangé (`lib/repasAuto.ts`). La dérive
// n'a plus de moteur, donc la soustraction n'a plus besoin d'interrupteur.
//
// Le fichier tient les deux moitiés : la MÉCANIQUE (ce que le calcul fait) et le
// CÂBLAGE (que l'écran écrive au bon moment, et à un seul).

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const courses = sansCommentaires(lire('app/(tabs)/courses.tsx'));

const ingredient = (name: string, quantity_g: number) => ({ name, quantity_g, unit: 'g' }) as any;
const repas = (id: string, ings: any[]) =>
  ({ id, day: 1, type: 'lunch', portions: 1, recipe: { id, name_fr: id, ingredients: ings } }) as any;
const plan = (...meals: any[]) => ({ id: 'p', days: 1, meals }) as unknown as MealPlan;
const stock = (name: string, quantity: number): PantryItem =>
  ({ name, quantity, unit: 'g', category: 'légumes' });

describe('ce que la réserve fait DISPARAÎTRE quand on la soustrait', () => {
  const semaine = plan(repas('r1', [ingredient('Courgette', 300)]));

  it('un article entièrement couvert n’apparaît NULLE PART', () => {
    // Ce n'est pas « affiché à 0 » ni « barré » : la ligne n'existe pas. C'est
    // exactement pourquoi une réserve périmée ne se remarque pas — il n'y a rien
    // à voir. Le fait n'a pas changé ; c'est sa CAUSE qui a été retirée.
    const avec = buildShoppingList(semaine, [stock('Courgette', 500)]);
    expect(avec.items.map((i) => i.name)).not.toContain('Courgette');
  });

  it('une couverture partielle n’achète que le reste', () => {
    const avec = buildShoppingList(semaine, [stock('Courgette', 200)]);
    expect(avec.items.find((i) => i.name === 'Courgette')?.quantity).toBe(100);
  });

  it('réserve vide, la liste montre l’intégralité de ce que le plan demande', () => {
    const sans = buildShoppingList(semaine, []);
    expect(sans.items.find((i) => i.name === 'Courgette')?.quantity).toBe(300);
  });
});

describe('l’écran Courses soustrait TOUJOURS, sans condition', () => {
  it('la liste charge la réserve à chaque calcul', () => {
    expect(courses).toContain('const pantry = await loadPantry();');
    expect(courses).toContain('buildShoppingList(plan, pantry)');
  });

  it('plus aucun interrupteur de suivi ne subsiste', () => {
    // Un réglage retiré dont il reste une variable est un réglage qui revient :
    // la prochaine session trouve le nom, en déduit qu'il manque une case, et la
    // remet. On compte donc son ABSENCE, pas seulement le comportement.
    expect(courses).not.toMatch(/suivreFrigo|fridgeTracking/);
    expect(lire('app/_layout.tsx')).not.toContain('loadFridgeTracking');
  });
});

describe('UN SEUL moment écrit dans la réserve : la clôture', () => {
  it('cocher, tout cocher et tout décocher n’y touchent pas', () => {
    // Les trois gestes du magasin. Si l'un d'eux réécrivait le stock, la réserve
    // suivrait les hésitations d'un rayon — et c'est très exactement le défaut qui
    // avait rendu la soustraction dangereuse.
    for (const geste of ['const toggle = async', 'const checkAll = async', 'const reset = async']) {
      const bloc = courses.slice(courses.indexOf(geste));
      expect(bloc.slice(0, 400), geste).not.toMatch(/loadPantry|savePantry|addOrMerge|subtractQuantity/);
    }
  });

  it('« Courses terminées » range les articles cochés', () => {
    const bloc = courses.slice(courses.indexOf('const terminer = async'));
    expect(bloc).toContain('visible(i) && i.checked && !isStaple(i.name)');
    expect(bloc).toContain('addOrMerge(pantry,');
    expect(bloc).toContain('savePantry(pantry)');
  });

  it('le rangement se fait AVANT que le cache de la liste soit vidé', () => {
    // Sinon la liste est recalculée sur une réserve qui n'a pas encore reçu les
    // achats : elle revient entière, puis se vide une seconde plus tard. L'ordre
    // n'est pas un détail de style, c'est ce qui rend la clôture crédible.
    const bloc = courses.slice(courses.indexOf('const terminer = async'));
    expect(bloc.indexOf('savePantry(pantry)')).toBeLessThan(bloc.indexOf('removeItem(LIST_KEY)'));
  });

  it('les condiments n’entrent jamais en réserve', () => {
    const bloc = courses.slice(courses.indexOf('const terminer = async'));
    // Le filtre doit tomber AVANT le premier `addOrMerge` : posé après, il ne
    // filtrerait plus rien de ce qui est déjà rangé.
    expect(bloc.indexOf('!isStaple(i.name)')).toBeGreaterThan(-1);
    expect(bloc.indexOf('!isStaple(i.name)')).toBeLessThan(bloc.indexOf('addOrMerge(pantry,'));
  });
});

describe('aucune phrase ne promet ce que le code ne fait plus', () => {
  it('la ligne d’aide des Courses décrit les DEUX temps du geste', () => {
    // 🔴 CETTE PHRASE A DÉJÀ MENTI DEUX FOIS : « il part direct dans ton frigo »,
    // vraie jusqu'au jour où le suivi est devenu optionnel, puis conditionnée à un
    // réglage qui n'existe plus. Une phrase d'aide est une affirmation sur le code.
    const bloc = courses.slice(courses.indexOf('style={s.hint}'));
    expect(bloc.slice(0, 400)).toContain('« Courses terminées » range le tout dans ta réserve');
    expect(courses).not.toContain('part direct dans ton frigo');
  });

  it('l’état vide de la Réserve nomme la clôture, pas le cochage', () => {
    const reserve = sansCommentaires(lire('app/(tabs)/reserve.tsx'));
    const bloc = reserve.slice(reserve.indexOf('style={s.emptySub}'));
    expect(bloc.slice(0, 400)).toContain('Courses terminées');
    expect(reserve).not.toContain('ils arrivent ici automatiquement');
  });

  it('plus un seul « frigo » dans ce que l’utilisateur LIT', () => {
    // Le mot est resté dans des commentaires historiques, à dessein — un renommage
    // qui efface ses traces se relit comme s'il n'avait jamais eu lieu. Ce qui est
    // compté ici, c'est l'INTERFACE : `sansCommentaires` sur les cinq onglets.
    for (const ecran of ['plan', 'courses', 'reserve', 'recettes', 'profil']) {
      expect(sansCommentaires(lire(`app/(tabs)/${ecran}.tsx`)), ecran).not.toMatch(/[Ff]rigo/);
    }
  });
});
