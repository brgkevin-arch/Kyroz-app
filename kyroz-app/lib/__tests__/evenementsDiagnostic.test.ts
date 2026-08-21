import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Events } from '../analytics';

// ── LES DEUX ÉVÉNEMENTS DE DIAGNOSTIC — ce qui les rend légitimes ────────────
//
// Le rituel de lecture dit QUAND ça décroche ; `meal_swapped` et `recipe_disliked`
// commencent à dire POURQUOI. Trois choses les rendent posables, et aucune n'est
// évidente à la relecture — d'où ce fichier.
//
//  1. **Chacun porte un SEUIL écrit AVANT d'être posé** (§2 de l'arbitrage du
//     2026-08-10). Un événement sans seuil est une courbe que personne ne lira, et
//     `shopping_completed` a été écarté pour exactement ce motif.
//  2. **Ils ne portent PAS l'ID de recette.** Toutes les recettes servies respectent
//     déjà le régime de la personne ; sur un identifiant stable, une dizaine d'ID le
//     reconstituent — et « régime, restrictions » est dans l'interdit ABSOLU du §6.
//  3. **Ils comptent deux refus DIFFÉRENTS.** `dislikeMealCore` appelle `swapMeal`
//     sans passer par `swapMealCore` : un 👎 ne doit donc pas gonfler le compteur des
//     remplacements, sinon les deux seuils mesurent la même chose.
//
// ⚠️ Le périmètre §6 (aucune donnée de santé en propriété) est déjà compté par
// `analyticsPerimetre.test.ts`, qui verrouille aussi la LISTE des events. Ici on
// vérifie ce que ce compteur-là ne peut pas voir : le seuil, et le point de capture.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const metrics = lire('METRICS.md');
const plan = lire('app/(tabs)/plan.tsx')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('chaque nouvel événement a son seuil, écrit avant', () => {
  for (const [nom, event] of [['remplacement', Events.mealSwapped], ['👎', Events.recipeDisliked]] as const) {
    it(`« ${nom} » est nommé dans METRICS.md avec un seuil et une action`, () => {
      // Le seuil est ce qui distingue une mesure d'une courbe décorative. On exige
      // que l'événement apparaisse dans le tableau des seuils — pas seulement dans
      // la page — donc dans une ligne qui porte aussi « médiane ».
      const ligneSeuil = metrics
        .split('\n')
        .find((l) => l.includes(event) && l.includes('médiane'));
      expect(ligneSeuil, `ligne de seuil pour ${event}`).toBeTruthy();
    });
  }

  it('la page dit POURQUOI l’ID de recette n’est pas envoyé', () => {
    // Sans cette explication, la première session qui trouvera l'événement « trop
    // pauvre » rajoutera l'ID en croyant compléter un oubli.
    expect(metrics).toContain("l'ID de recette");
    expect(metrics).toMatch(/reconstitu\w+ le régime/i);
  });
});

describe('les deux refus sont comptés séparément', () => {
  it('le remplacement est capturé dans `swapMealCore`', () => {
    const bloc = plan.slice(plan.indexOf('const swapMealCore'), plan.indexOf('const dislikeMealCore'));
    expect(bloc).toContain('Events.mealSwapped');
    expect(bloc).not.toContain('Events.recipeDisliked');
  });

  it('le 👎 est capturé dans `dislikeMealCore`, et ne compte pas comme un remplacement', () => {
    // 🔴 LE PIÈGE : `dislikeMealCore` appelle `swapMeal` (le moteur), pas
    // `swapMealCore` (l'écran). Déplacer la capture dans le moteur ferait compter
    // chaque 👎 comme un remplacement — deux seuils sur la même donnée.
    const bloc = plan.slice(plan.indexOf('const dislikeMealCore'), plan.indexOf('const swapSelectedMeal'));
    expect(bloc).toContain('Events.recipeDisliked');
    expect(bloc).not.toContain('Events.mealSwapped');
    expect(bloc).toContain('swapMeal(');           // il passe bien par le moteur…
    expect(bloc).not.toContain('swapMealCore(');   // …et jamais par l'écran
  });

  it('aucun des deux ne part depuis le moteur', () => {
    // Le moteur est pur et testé sans réseau : y capturer quoi que ce soit le
    // rendrait dépendant du consentement, et ferait compter les simulations des
    // scripts de mesure comme des gestes d'utilisateur.
    const moteur = lire('lib/planEngine.ts');
    expect(moteur).not.toContain('capture(');
  });
});
