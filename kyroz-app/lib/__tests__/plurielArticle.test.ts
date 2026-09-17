import { describe, it, expect } from 'vitest';
import { getEffectiveRecipes } from '../recipes';
import { foodKeywordMatches, recipeContainsFood, sansArticle, singulier } from '../avoidance';

/**
 * LE PLURIEL ET L'ARTICLE DES ALIMENTS ÉVITÉS (corrigé le 2026-09-17).
 *
 * Né du retour du 2026-09-15 : « tofu » écartait 39 recettes, « tofus » et « le tofu »
 * zéro. Le champ le disait, mais il fallait comprendre pourquoi et réessayer.
 *
 * ⚠️ Le garde-fou qui compte n'est pas « le pluriel marche » : c'est que la forme DEVINÉE
 * ne morde pas plus large que le mot écrit. « pois » ne doit jamais attraper « poivron ».
 */
const CAT = getEffectiveRecipes();
const compte = (kw: string) => foodKeywordMatches(CAT, kw);

describe('ce que l’utilisateur écrit spontanément', () => {
  it('« tofus » et « le tofu » écartent exactement ce que « tofu » écarte', () => {
    const ref = compte('tofu');
    expect(ref, 'la sonde doit avoir du tofu à trouver').toBeGreaterThan(0);
    expect(compte('tofus')).toBe(ref);
    expect(compte('le tofu')).toBe(ref);
    expect(compte('du tofu')).toBe(ref);
  });

  it('l’article marche aussi devant une FAMILLE', () => {
    expect(compte('les fruits a coque')).toBe(compte('fruits a coque'));
    expect(compte('du poisson')).toBe(compte('poisson'));
  });

  it('un pluriel déjà écrit dans le catalogue continue de marcher', () => {
    expect(compte('poivrons')).toBe(compte('poivron'));
  });
});

describe('un mot n’en attrape pas un autre (2026-09-18)', () => {
  // Mesuré avant/après sur 38 mots : SEULS ces trois-là changent. « lentille »,
  // « pate », « œuf », « poisson », « riz », « poulet », « lait », « soja » : inchangés.
  it('« courge » ne retire plus les recettes à la COURGETTE', () => {
    expect(compte('courge')).toBe(31);          // 63 avant — dont 32 courgettes
    expect(compte('courgette')).toBe(32);
    expect(compte('courges')).toBe(31);
  });

  it('« pommes de terre » écarte enfin quelque chose — le catalogue écrit « Pomme de terre »', () => {
    expect(compte('pomme de terre')).toBe(23);
    expect(compte('pommes de terre')).toBe(23); // 0 avant : le pluriel était sur le PREMIER mot
  });

  it('« patate » est le mot courant pour la pomme de terre, et retire les deux', () => {
    expect(compte('patate')).toBe(49);          // 26 avant : la patate douce seulement
    expect(compte('patates')).toBe(49);
    // …et l'inverse n'est pas vrai : « pomme de terre » ne touche pas la patate douce.
    expect(compte('patate douce')).toBe(26);
  });

  it('AUCUN faux négatif : le pluriel du catalogue reste attrapé', () => {
    expect(compte('lentille')).toBe(compte('lentilles'));
    expect(compte('pate')).toBe(27);            // « pâtes complètes »
    expect(compte('oeuf')).toBe(64);
    expect(compte('poulet')).toBe(62);
    expect(compte('lait')).toBe(76);
  });
});

describe('ce que le repli ne doit PAS attraper', () => {
  it('« courges » n’attrape pas la COURGETTE — le singulier deviné exige un mot ENTIER', () => {
    // Le piège est réel et vient du catalogue : « courge » est le préfixe de « courgette ».
    // Ancré au seul début de mot, le singulier deviné retirerait tous les plats à la
    // courgette à qui n'aime pas la courge. C'est le défaut `bœuf` ⊃ `œuf`, à l'envers.
    const mot = (r: typeof CAT[number], m: string) =>
      new RegExp(`(?:^|[^a-z])${m}(?![a-z])`).test(r.ingredients.map((i) => i.name.toLowerCase()).join(' '));
    const courgetteSeule = CAT.filter((r) => mot(r, 'courgette') && !mot(r, 'courge'));
    expect(courgetteSeule.length, 'la sonde doit avoir des plats à la courgette').toBeGreaterThan(0);
    for (const r of courgetteSeule.slice(0, 20)) expect(recipeContainsFood(r, 'courges'), r.name_fr).toBe(false);
    // …et la sonde sait dire OUI : « courges » attrape bien la courge quand elle est là.
    const courge = CAT.filter((r) => mot(r, 'courge'));
    if (courge.length > 0) expect(recipeContainsFood(courge[0], 'courges')).toBe(true);
  });

  it('un mot court en -s n’est pas déplié du tout : « pois » reste « pois »', () => {
    // Protégé par la LONGUEUR, pas par la règle du mot entier — les deux gardes existent.
    expect(singulier('pois')).toBeNull();
    const poivronSansPois = CAT.filter((r) => {
      const noms = r.ingredients.map((i) => i.name.toLowerCase()).join(' ');
      return noms.includes('poivron') && !noms.includes('pois');
    });
    expect(poivronSansPois.length).toBeGreaterThan(0);
    for (const r of poivronSansPois.slice(0, 10)) expect(recipeContainsFood(r, 'pois'), r.name_fr).toBe(false);
  });

  it('« œuf » et « œufs » n’attrapent toujours pas le bœuf', () => {
    const boeuf = CAT.filter((r) => r.ingredients.some((i) => (i.ref ?? '').startsWith('boeuf')) &&
      !r.ingredients.some((i) => (i.ref ?? '').startsWith('oeuf')));
    expect(boeuf.length).toBeGreaterThan(0);
    for (const r of boeuf.slice(0, 20)) {
      expect(recipeContainsFood(r, 'œuf'), r.name_fr).toBe(false);
      expect(recipeContainsFood(r, 'œufs'), r.name_fr).toBe(false);
    }
  });

  it('les mots courts en -s ne sont pas des pluriels', () => {
    expect(singulier('jus')).toBeNull();
    expect(singulier('ris')).toBeNull();
    expect(singulier('tofus')).toBe('tofu');
    expect(singulier('tofu')).toBeNull();
  });

  it('sansArticle ne touche pas un mot qui n’en porte pas', () => {
    expect(sansArticle('tofu')).toBe('tofu');
    expect(sansArticle('le tofu')).toBe('tofu');
    expect(sansArticle("l'avocat")).toBe('avocat');
    expect(sansArticle('lentilles')).toBe('lentilles');
  });
});
