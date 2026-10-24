import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { categorize, conservationDe, isStaple } from '../pantry';
import { buildLocalPlan } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { FORMATS, SANS_FORMAT, achatPour, quantiteRangee } from '../formatsVendus';
import { makeProfile } from './helpers';
import { DietaryRestriction } from '../types';

/**
 * ── Le format vendu (2026-10-02, décision fondateur « Liste + réserve ») ────
 *
 * La réserve reçoit le paquet ENTIER. La liste, elle, montre le BESOIN depuis le 2026-10-24
 * (décision fondateur, `listeEnGrammes.test.ts`) ; seule la pièce dit combien en prendre.
 * Trois propriétés tiennent la promesse, et chacune a son bloc :
 *   1. chaque ingrédient du catalogue a un format, ou une raison écrite de ne pas en avoir ;
 *   2. le format choisi couvre le besoin, avec le moins de surplus possible ;
 *   3. ce qui entre en réserve est ce que la ligne annonçait, jamais moins que le besoin.
 */
const article = (ref: string, quantity: number) =>
  ({ name: RECIPE_INGREDIENTS[ref].name, quantity, unit: RECIPE_INGREDIENTS[ref].unit });

describe('format vendu : couverture du catalogue', () => {
  it('chaque ingrédient a un format, ou est un condiment, ou dit pourquoi il n’en a pas', () => {
    const orphelins = Object.entries(RECIPE_INGREDIENTS)
      .filter(([ref, def]) => !FORMATS[ref] && !SANS_FORMAT[ref] && !isStaple(def.name))
      .map(([ref]) => ref);
    expect(orphelins, `ingrédient sans format : ajoute-le à FORMATS (ou à SANS_FORMAT, avec sa raison)`).toEqual([]);
  });

  it('aucun format pour une ref qui n’existe pas (une faute de frappe ne sert personne)', () => {
    const inconnues = [...Object.keys(FORMATS), ...Object.keys(SANS_FORMAT)].filter((r) => !RECIPE_INGREDIENTS[r]);
    expect(inconnues).toEqual([]);
  });

  it('les VRAIES listes de courses trouvent un format pour chaque article', () => {
    // Les noms de la liste viennent des recettes : on prouve qu’ils retombent bien sur
    // leur ref, sur des plans servis, et pas seulement sur la table.
    const sansAchat = new Set<string>();
    let articles = 0;
    for (const restrictions of [[], ['vegetarian'], ['vegan'], ['pescatarian']] as DietaryRestriction[][]) {
      for (const seed of [0, 1, 2]) {
        const plan = buildLocalPlan(makeProfile({ dietary_restrictions: restrictions }), seed);
        for (const it of buildShoppingList(plan).items) {
          articles++;
          if (!achatPour(it)) sansAchat.add(it.name);
        }
      }
    }
    expect(articles).toBeGreaterThan(100);
    const attendus = Object.keys(SANS_FORMAT).map((r) => RECIPE_INGREDIENTS[r].name);
    expect([...sansAchat].filter((n) => !attendus.includes(n))).toEqual([]);
  });
});

describe('format vendu : le choix du format', () => {
  it('l’exemple du fondateur : 5 g de beurre d’amande, c’est un pot de 250 g', () => {
    const a = achatPour(article('beurre_amande', 5));
    expect(a?.libelle).toBe('1 pot de 250 g');
    expect(a?.total).toBe(250);
  });

  it('le moins de surplus, puis le moins de paquets', () => {
    expect(achatPour(article('riz_basmati', 320))?.libelle).toBe('1 paquet de 500 g');
    // 600 g : 1 kg ou deux fois 500 g, même surplus : un seul paquet.
    expect(achatPour(article('riz_basmati', 600))?.libelle).toBe('1 paquet de 1 kg');
    // 1,2 kg : trois paquets de 500 g (1,5 kg) gaspillent moins que deux de 1 kg.
    expect(achatPour(article('riz_basmati', 1200))?.libelle).toBe('3 paquets de 500 g');
  });

  it('à 5 % près, un paquet suffit : pas de second paquet pour quelques grammes', () => {
    const a = achatPour(article('riz_basmati', 510));
    expect(a?.libelle).toBe('1 paquet de 500 g');
    // Et la réserve reçoit le besoin, pas moins : sinon 10 g reviendraient sur la liste.
    expect(quantiteRangee(article('riz_basmati', 510))).toBe(510);
  });

  it('les 5 % portent sur l’achat entier, pas sur un seul paquet (thon, 2026-10-19)', () => {
    // 290 g : deux boîtes de 140 g (280 g) couvrent à 3 % près — une troisième serait de trop.
    expect(achatPour(article('thon_naturel', 290))?.libelle).toBe('2 boîtes de 140 g égouttés');
    // 300 g : 280 g manqueraient de 7 % — la troisième boîte reste due.
    expect(achatPour(article('thon_naturel', 300))?.libelle).toBe('3 boîtes de 140 g égouttés');
    expect(quantiteRangee(article('thon_naturel', 290))).toBe(290);
  });

  it('… et pour TOUS les aliments vendus en paquet, pas seulement le thon (point 3, 2026-10-22)', () => {
    // Mesuré sur 240 listes réelles (9 352 lignes en paquet) : l’ancienne règle faisait prendre
    // un paquet de trop à 19 lignes et 9 aliments — épinards (7), poulet végétal (3), jambon
    // végétal (2), thon (2), seitan, myrtilles, maïs, pois chiches, nouilles de riz. Le
    // correctif était commun ; ce balayage le fige pour chacun : un besoin à 4 % au-dessus de
    // k paquets n’en fait jamais prendre davantage, et l’achat ne descend jamais sous 95 %.
    const fautes: string[] = [];
    for (const [ref, regle] of Object.entries(FORMATS)) {
      if (!('formats' in regle) || !RECIPE_INGREDIENTS[ref]) continue;
      for (const f of regle.formats) {
        for (let k = 1; k <= 6; k++) {
          const besoin = Math.round(k * f.taille * 1.04);
          const achat = achatPour(article(ref, besoin));
          if (!achat) { fautes.push(`${ref} : aucun achat pour ${besoin}`); continue; }
          if (achat.total > k * f.taille) fautes.push(`${ref} ${besoin} → ${achat.libelle} (${k} × ${f.taille} suffisaient)`);
          if (achat.total < besoin * 0.95 - 1e-6) fautes.push(`${ref} ${besoin} → ${achat.total}, sous 95 %`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it('les œufs se prennent à la boîte', () => {
    const a = achatPour(article('oeuf_entier', 165));
    expect(a?.libelle).toBe('1 boîte de 6 œufs');
    expect(achatPour(article('oeuf_entier', 385))?.libelle).toBe('1 boîte de 12 œufs');
  });

  it('les fruits et légumes du rayon frais se prennent à la pièce', () => {
    expect(achatPour(article('courgette', 350))?.libelle).toBe('2 courgettes');
    expect(achatPour(article('courgette', 210))?.libelle).toBe('1 courgette');
    expect(achatPour(article('chou_fleur', 900))?.libelle).toBe('2 choux-fleurs');
  });

  it('les liquides se disent en litres', () => {
    expect(achatPour(article('lait_demi_ecreme', 300))?.libelle).toBe('1 brique de 1 L');
    expect(achatPour(article('creme_soja', 150))?.libelle).toBe('1 brique de 20 cl');
  });

  it('pas de format inventé : ajout manuel, aliment inconnu, unité qui ne colle pas', () => {
    expect(achatPour({ ...article('riz_basmati', 320), manuel: true })).toBeNull();
    expect(achatPour({ name: 'Café', quantity: 250, unit: 'g' })).toBeNull();
    expect(achatPour({ name: RECIPE_INGREDIENTS.riz_basmati.name, quantity: 2, unit: 'pièce' })).toBeNull();
    expect(quantiteRangee({ name: 'Café', quantity: 250, unit: 'g' })).toBe(250);
  });

  it('aucun libellé n’enchaîne avec « + » ni ne finit sur un pluriel faux', () => {
    for (const ref of Object.keys(FORMATS)) {
      for (const q of [5, 100, 450, 1300]) {
        const a = achatPour(article(ref, q));
        if (!a) continue;
        expect(a.libelle, ref).not.toContain('+');
        expect(a.libelle, ref).toMatch(/^1 \S|^\d+ \S+s\b|^\d+ (bocaux|ananas|patates douces|choux-fleurs)/);
      }
    }
  });
});

describe('format vendu : ce qui entre en réserve', () => {
  it('jamais moins que le besoin, quel que soit l’aliment et la quantité', () => {
    const fautes: string[] = [];
    for (const ref of Object.keys(FORMATS)) {
      for (const q of [1, 7, 33, 120, 251, 499, 505, 999, 1777]) {
        const rangee = quantiteRangee(article(ref, q));
        if (rangee < q) fautes.push(`${ref} ${q} → ${rangee}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it('le paquet entier, quand il dépasse le besoin', () => {
    expect(quantiteRangee(article('beurre_amande', 5))).toBe(250);
    expect(quantiteRangee(article('courgette', 350))).toBe(400);
  });
});

describe('format vendu : l’écran Courses s’en sert', () => {
  const courses = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'courses.tsx'), 'utf8');

  it('« Courses terminées » range le format vendu, pas le besoin', () => {
    const bloc = courses.slice(courses.indexOf('const terminer = async'));
    expect(bloc).toMatch(/addOrMerge\(pantry, \{ name: it\.name, quantity: quantiteRangee\(it\)/);
  });

  it('la ligne dit le BESOIN, une seule quantité ; seule la pièce dit combien en prendre (2026-10-24)', () => {
    // Le 2026-10-22, la ligne disait le paquet (« 1 pot de 250 g ») et plus le besoin
    // (« · il t’en faut 5 g », retiré : « l’app tourne en silence »). Le 2026-10-24, le
    // fondateur revient au besoin : « on lui dit qu’il lui faut 650 g de bœuf, il achète au plus
    // proche » (`listeEnGrammes.test.ts`). Toujours UNE quantité par ligne, jamais les deux.
    expect(courses).not.toContain('achatPour(item)');
    expect(courses).toMatch(/\{pieces\.libelle\}\s*<\/Text>/);
    expect(Object.keys(achatPour(article('beurre_amande', 5)) ?? {}).sort()).toEqual(['libelle', 'total']);
    expect(Object.keys(achatPour(article('avocat', 75)) ?? {}).sort()).toEqual(['libelle', 'total']);
  });
});

describe('la Réserve range les conserves au sec (2026-10-04)', () => {
  it('tout ingrédient vendu en boîte finit « Au sec », les œufs mis à part', () => {
    const auFrais = Object.entries(FORMATS).flatMap(([ref, regle]) => {
      if (!('formats' in regle) || ref === 'oeuf_entier') return [];
      if (!regle.formats.every((f) => f.contenant === 'boîte')) return [];
      const name = RECIPE_INGREDIENTS[ref].name;
      const ou = conservationDe({ name, quantity: 1, unit: RECIPE_INGREDIENTS[ref].unit, category: categorize(name) });
      return ou === 'sec' ? [] : [`${ref} (${categorize(name)})`];
    });
    expect(auFrais).toEqual([]);
  });

  it('le classement reste corrigeable : un choix manuel passe devant', () => {
    const name = RECIPE_INGREDIENTS.thon_naturel.name;
    expect(conservationDe({ name, quantity: 140, unit: 'g', category: 'viandes', conservation: 'frais' })).toBe('frais');
    // Et les œufs, eux, restent au frais.
    expect(conservationDe({ name: RECIPE_INGREDIENTS.oeuf_entier.name, quantity: 330, unit: 'g', category: 'laitiers' })).toBe('frais');
  });
});
