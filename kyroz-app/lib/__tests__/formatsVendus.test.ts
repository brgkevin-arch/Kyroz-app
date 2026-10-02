import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { isStaple } from '../pantry';
import { buildLocalPlan } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { FORMATS, SANS_FORMAT, achatPour, quantiteRangee, besoinLisible } from '../formatsVendus';
import { makeProfile } from './helpers';
import { DietaryRestriction } from '../types';

/**
 * ── Le format vendu (2026-10-02, décision fondateur « Liste + réserve ») ────
 *
 * La liste montre ce qu’on prend en magasin, la réserve reçoit le paquet ENTIER.
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
    expect(a?.ecartVisible).toBe(true);
    expect(besoinLisible(article('beurre_amande', 5))).toBe('il t’en faut 5 g');
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
    expect(a?.ecartVisible).toBe(false);
    // Et la réserve reçoit le besoin, pas moins : sinon 10 g reviendraient sur la liste.
    expect(quantiteRangee(article('riz_basmati', 510))).toBe(510);
  });

  it('les œufs se prennent à la boîte, et le besoin se dit en œufs', () => {
    const a = achatPour(article('oeuf_entier', 165));
    expect(a?.libelle).toBe('1 boîte de 6 œufs');
    expect(besoinLisible(article('oeuf_entier', 165))).toBe('il t’en faut 3 œufs');
    expect(achatPour(article('oeuf_entier', 385))?.libelle).toBe('1 boîte de 12 œufs');
  });

  it('les fruits et légumes du rayon frais se prennent à la pièce', () => {
    expect(achatPour(article('courgette', 350))?.libelle).toBe('2 courgettes');
    expect(achatPour(article('courgette', 210))?.libelle).toBe('1 courgette');
    expect(achatPour(article('chou_fleur', 900))?.libelle).toBe('2 choux-fleurs');
    // Une banane pour 100 g de banane : rien à préciser.
    expect(achatPour(article('banane', 100))?.ecartVisible).toBe(false);
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

  it('chaque ligne dit ce qu’on prend en magasin', () => {
    expect(courses).toContain('achatPour(item)');
    expect(courses).toContain('besoinLisible(item)');
  });
});
