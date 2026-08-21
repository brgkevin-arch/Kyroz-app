import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShoppingList } from '../shoppingList';
import { getFridgeTracking } from '../fridgeTracking';
import type { MealPlan } from '../types';
import type { PantryItem } from '../pantry';

// ── LE FRIGO N'EST PLUS SOUSTRAIT PAR DÉFAUT ────────────────────────────────
//
// 🔴 LE DÉFAUT EST STRUCTUREL, PAS UNE HYPOTHÈSE SUR LES USAGES — c'est ce qui
// justifie de changer un défaut sans attendre de données (mesuré le 2026-08-21) :
//
//   · `buildShoppingList` **masque entièrement** un article que le frigo dit
//     couvert — il ne l'affiche pas « à 0 », il le fait DISPARAÎTRE ;
//   · le frigo se CRÉDITE par un geste qu'on fait toujours (cocher en magasin) ;
//   · il se DÉBITE par un geste qu'on peut sauter (« J'ai cuisiné »).
//
// ⇒ L'inventaire ne peut dériver que vers la SUR-estimation, et sa conséquence est
// un manque silencieux, découvert au moment de cuisiner. L'erreur inverse — racheter
// ce qu'on a — se voit et se décoche.
//
// Ce fichier tient les deux moitiés : la MÉCANIQUE (ce que le calcul fait) et le
// CÂBLAGE (que l'écran ne le déclenche que si le réglage est actif).

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

describe('ce que le frigo fait DISPARAÎTRE quand on le soustrait', () => {
  const semaine = plan(repas('r1', [ingredient('Courgette', 300)]));

  it('un article entièrement couvert n’apparaît NULLE PART', () => {
    // Ce n'est pas « affiché à 0 » ni « barré » : la ligne n'existe pas. C'est
    // exactement pourquoi un frigo périmé ne se remarque pas — il n'y a rien à voir.
    const avec = buildShoppingList(semaine, [stock('Courgette', 500)]);
    expect(avec.items.map((i) => i.name)).not.toContain('Courgette');
  });

  it('sans frigo, la liste montre l’intégralité de ce que le plan demande', () => {
    const sans = buildShoppingList(semaine, []);
    expect(sans.items.map((i) => i.name)).toContain('Courgette');
    expect(sans.items.find((i) => i.name === 'Courgette')?.quantity).toBe(300);
  });
});

describe('le réglage est ÉTEINT par défaut', () => {
  it('sans préférence enregistrée, le frigo n’est pas soustrait', () => {
    // Le défaut choisit la panne qui SE VOIT (racheter) contre celle qui se cache
    // (manquer). Même raisonnement asymétrique que le cran NEAT le plus prudent.
    expect(getFridgeTracking()).toBe(false);
  });

  it('la préférence est chargée au layout RACINE, pas dans l’écran', () => {
    // Une valeur d'appareil oubliée dans ce chargement groupé repart sur son défaut
    // à chaque démarrage, et ça ne se voit nulle part (CLAUDE.md §11).
    expect(lire('app/_layout.tsx')).toContain('loadFridgeTracking()');
  });
});

describe('l’écran Courses n’écrit dans le frigo que si le suivi est actif', () => {
  it('la liste ne charge le garde-manger que sous condition', () => {
    expect(courses).toMatch(/suivreFrigo \? await loadPantry\(\) : \[\]/);
  });

  it('les TROIS gestes qui créditent ou débitent sont gardés', () => {
    // Cocher un article, tout cocher, tout décocher. En oublier un laisserait le
    // frigo se remplir en silence alors que le réglage annonce qu'on l'ignore —
    // et il redeviendrait faux le jour où on rallume le suivi.
    expect(courses).toContain('if (!suivreFrigo) return;');
    expect(courses).toContain('if (suivreFrigo && toAdd.length)');
    expect(courses).toContain('if (suivreFrigo && toRemove.length)');
  });

  it('basculer le réglage INVALIDE la liste en cache', () => {
    // Sans ça, l'interrupteur ne changerait rien à l'écran jusqu'à la prochaine
    // clôture : un réglage qui ne pilote rien (A23).
    const bloc = courses.slice(courses.indexOf('const basculerSuiviFrigo'));
    expect(bloc.slice(0, 500)).toContain('removeItem(LIST_KEY)');
  });

  it('les articles déjà cochés survivent à la bascule', () => {
    // Basculer au milieu d'un rayon ne doit pas effacer le travail du magasin.
    const bloc = courses.slice(courses.indexOf('const basculerSuiviFrigo'));
    expect(bloc.slice(0, 500)).toContain('coches.has(i.name)');
  });
});

describe('aucune phrase ne promet ce que le réglage a désactivé', () => {
  it('la ligne d’aide des Courses est CONDITIONNÉE au suivi', () => {
    // 🔴 TROUVÉ À L'ÉCRAN, pas dans le diff : « coche un article → il part direct dans
    // ton frigo » était vraie depuis toujours, et fausse à la seconde où le suivi est
    // devenu optionnel — affichée douze pixels sous l'interrupteur éteint qui la
    // dément. Une phrase d'aide est une affirmation sur le code.
    const bloc = courses.slice(courses.indexOf('style={s.hint}'));
    expect(bloc.slice(0, 400)).toContain('suivreFrigo');
    expect(courses).toContain('part direct dans ton frigo');   // la version « suivi actif »
    expect(courses).toContain('Coche ce que tu as déjà');      // la version « suivi éteint »
  });

  it('l’état vide du Frigo ne promet plus l’automatisme non plus', () => {
    // TROISIÈME phrase trouvée à l'écran dans le même chantier : « coche tes articles
    // dans l'onglet Courses, ils arrivent ici automatiquement ». ➡️ Quand un réglage
    // coupe un MÉCANISME, chercher toutes les phrases qui le DÉCRIVENT, pas seulement
    // le code qui l'exécute.
    const frigo = sansCommentaires(lire('app/(tabs)/garde-manger.tsx'));
    const bloc = frigo.slice(frigo.indexOf('style={s.emptySub}'));
    expect(bloc.slice(0, 400)).toContain('suivreFrigo');
    expect(frigo).toContain('ils arrivent ici automatiquement');
    expect(frigo).toContain('ce que tu peux cuisiner tout de suite');
  });
});

describe('le Frigo dit ce que le réglage change', () => {
  it('quand le suivi est éteint, l’écran le dit et nomme où l’activer', () => {
    // Sinon quelqu'un qui remplit son frigo se demande pourquoi sa liste l'ignore,
    // et conclut que le frigo est cassé.
    const frigo = sansCommentaires(lire('app/(tabs)/garde-manger.tsx'));
    expect(frigo).toContain('!suivreFrigo &&');
    expect(frigo).toMatch(/ne le déduisent pas/);
  });
});
