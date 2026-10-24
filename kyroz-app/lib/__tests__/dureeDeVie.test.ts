import { describe, expect, it } from 'vitest';
import { RECIPE_INGREDIENTS, RAW_RECIPES } from '../recipeData';
import { categorize, conservationDe, isStaple } from '../pantry';
import { DUREE_DE_VIE, FERME_PAR_DEFAUT, SOURCES_DUREE, SURGELES, dureeDe, tientJusquau } from '../dureeDeVie';

/**
 * La table des durées de vie (2026-10-24, « une table sourcée et plus précise ») : chaque aliment
 * PÉRISSABLE du catalogue y a sa ligne, chaque ligne cite une source qui existe, et le moteur n'y
 * lit jamais une durée plus longue que la borne basse des sources.
 */
describe('durée de vie des aliments', () => {
  const servis = new Set<string>();
  for (const r of RAW_RECIPES) for (const i of r.ingredients ?? []) if (i.ref) servis.add(i.ref);
  const perissables = Object.entries(RECIPE_INGREDIENTS)
    .filter(([ref, ing]) => servis.has(ref) && !isStaple(ing.name) && !SURGELES.includes(ref)
      && conservationDe({ name: ing.name, quantity: 1, unit: ing.unit, category: categorize(ing.name) }) === 'frais')
    .map(([ref]) => ref);

  it('chaque aliment rangé au frais (hors surgelés) a sa durée de vie', () => {
    expect(perissables.length).toBeGreaterThan(40);
    expect(perissables.filter((ref) => !DUREE_DE_VIE[ref])).toEqual([]);
  });

  it('chaque ligne cite au moins une source, et chaque source citée existe', () => {
    for (const [ref, d] of Object.entries(DUREE_DE_VIE)) {
      expect(d.sources.length, ref).toBeGreaterThan(0);
      for (const n of d.sources) expect(SOURCES_DUREE[n], `${ref} cite [${n}]`).toBeTruthy();
    }
  });

  it('les durées sont des fourchettes lisibles, et un congelable dit pour combien de mois', () => {
    for (const [ref, d] of Object.entries(DUREE_DE_VIE)) {
      for (const f of [d.ferme, d.entame]) if (f) expect(f[0] <= f[1] && f[0] >= 0, ref).toBe(true);
      if (d.congeler === true) expect(d.mois, ref).toBeTruthy();
      expect(d.ferme || d.entame, `${ref} : ni fermé ni entamé`).toBeTruthy();
    }
  });

  it('le moteur retient la borne BASSE : fermé, puis entamé à partir du jour d\'ouverture', () => {
    // Filet de poulet : 1 à 2 jours fermé, 2 jours entamé → 1 jour, quel que soit le jour d'ouverture.
    expect(tientJusquau(DUREE_DE_VIE.poulet_filet, Infinity)).toBe(1);
    expect(tientJusquau(DUREE_DE_VIE.poulet_filet, 0)).toBe(1);
    // Mozzarella : 7 jours fermée, 5 entamée → ouverte le jour 1, elle tient jusqu'au jour 6.
    expect(tientJusquau(DUREE_DE_VIE.mozzarella, 1)).toBe(6);
    // Sans durée publique fermée (similis) : le défaut prudent, puis l'entame.
    expect(tientJusquau(DUREE_DE_VIE.steak_soja, Infinity)).toBe(FERME_PAR_DEFAUT);
    expect(tientJusquau(DUREE_DE_VIE.steak_soja, 2)).toBe(5);
  });

  it('un surgelé n\'est jamais un reste à sauver', () => {
    for (const ref of SURGELES) expect(dureeDe(ref), ref).toBeUndefined();
  });
});
