import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatQuantity, poidsUnitaire, quantiteDeSaisie, versStockage } from '../units';
import { A_LA_PIECE, FRACTION_MIN, piecesLisibles } from '../aLaPiece';
import { achatPour, quantiteRangee } from '../formatsVendus';
import { RECIPE_INGREDIENTS } from '../recipeData';
import raw from '../../Recette/recettes-kyroz.json';

// ── « CORRIGE LES UNITÉS » (fondateur, tour de l'app du 2026-10-23) ─────────────────────
//
// La liste disait « 1 ananas », la Réserve rangeait ensuite « 500 g », et la fiche d'une
// recette demandait « Tomate 80 g » à qui achète ses tomates à l'unité. Ce qui s'achète à
// la pièce se compte désormais en pièces sur tous les écrans, avec UNE table de poids
// (`lib/aLaPiece.ts`) que la liste, l'affichage et la Réserve lisent ensemble.

const nom = (ref: string) => RECIPE_INGREDIENTS[ref].name;

describe('ce qui s’achète à la pièce se compte en pièces (2026-10-23)', () => {
  it('les deux exemples du fondateur', () => {
    // Avant : « Tomate 80 g » sur la fiche.
    expect(formatQuantity('Tomate', 80)).toBe('⅔ tomate');
    // Avant : la liste disait « 1 ananas », la Réserve « 500 g ».
    const ananas = { name: 'Ananas', quantity: 150, unit: 'g' };
    expect(achatPour(ananas)!.libelle).toBe('1 ananas');
    expect(formatQuantity('Ananas', quantiteRangee(ananas))).toBe('1 ananas');
  });

  it('la Réserve dit exactement ce que la liste avait dit, pour les 16 aliments', () => {
    const ecarts: string[] = [];
    for (const [ref, a] of Object.entries(A_LA_PIECE)) {
      for (const n of [1, 2, 3]) {
        const article = { name: nom(ref), quantity: n * a.poids, unit: 'g' };
        const liste = achatPour(article)!.libelle;
        const reserve = formatQuantity(article.name, quantiteRangee(article));
        if (liste !== reserve) ecarts.push(`${ref} × ${n} : liste « ${liste} », réserve « ${reserve} »`);
      }
    }
    expect(ecarts).toEqual([]);
  });

  it('une seule table de poids : la liste range ce que l’affichage et la Réserve comptent', () => {
    for (const [ref, a] of Object.entries(A_LA_PIECE)) {
      expect(achatPour({ name: nom(ref), quantity: a.poids, unit: 'g' })!.total, ref).toBe(a.poids);
      expect(poidsUnitaire(nom(ref)), ref).toBe(a.poids);
    }
  });

  it('les fractions de cuisine, puis la demi-pièce ; le pluriel commence à deux', () => {
    expect(formatQuantity('Banane', 60)).toBe('½ banane'); // avant : « 1 banane », pour 60 g comptés
    expect(formatQuantity('Avocat', 50)).toBe('⅓ avocat');
    expect(formatQuantity('Poivron', 110)).toBe('¾ poivron');
    expect(formatQuantity('Oignon', 25)).toBe('¼ oignon');
    expect(formatQuantity('Courgette', 200)).toBe('1 courgette');
    expect(formatQuantity('Courgette', 300)).toBe('1,5 courgette');
    expect(formatQuantity('Tomate', 480)).toBe('4 tomates');
    expect(formatQuantity('Patate douce', 600)).toBe('2 patates douces');
  });

  it('sous un cinquième de pièce, des grammes : on ne coupe pas un sixième de salade', () => {
    expect(formatQuantity('Salade verte', 40)).toBe('40 g');
    expect(formatQuantity('Concombre', 50)).toBe('50 g');
    expect(piecesLisibles(FRACTION_MIN - 0.01, 'tomate', 'tomates')).toBeNull();
  });

  it('une ligne en pièces dit le nom de l’aliment, plus « pc »', () => {
    expect(formatQuantity('Courgette', 2, 'pièce')).toBe('2 courgettes');
    expect(formatQuantity('Tomate', 0.5, 'pièce')).toBe('½ tomate');
    // Ce qui ne se vend pas à la pièce garde « pc ».
    expect(formatQuantity('Champignons', 2, 'pièce')).toBe('2 pc');
  });

  it('ce qui ne se vend pas à la pièce ne bouge pas', () => {
    expect(formatQuantity('Riz basmati', 300)).toBe('300 g');
    expect(formatQuantity('Pomme de terre', 300)).toBe('300 g'); // en filet, pas à l'unité
    expect(formatQuantity('Tomate concassée', 200)).toBe('200 g');
    expect(formatQuantity('Œufs', 110)).toBe('2 œufs');
  });

  it('sur la fiche, aucune fraction ne s’écarte de plus d’un quart de la quantité comptée', () => {
    // Les macros sont calculées sur les grammes ; la fraction est ce qu'on coupe. Un
    // écart d'un quart est le pire cas de la grille ¼ ⅓ ½ ⅔ ¾ au-dessus d'un cinquième.
    const VALEUR: Record<string, number> = { '¼': 1 / 4, '⅓': 1 / 3, '½': 1 / 2, '⅔': 2 / 3, '¾': 3 / 4 };
    const recettes = (raw as { recipes: { ingredients: { ref: string; qty: number }[] }[] }).recipes;
    let enPieces = 0;
    let lignes = 0;
    const ecarts: string[] = [];
    for (const r of recettes) for (const ing of r.ingredients) {
      const a = A_LA_PIECE[ing.ref];
      if (!a) continue;
      lignes++;
      const texte = formatQuantity(nom(ing.ref), ing.qty);
      if (texte.endsWith(' g')) continue;
      enPieces++;
      const lu = texte.split(' ')[0];
      const pieces = VALEUR[lu] ?? Number(lu.replace(',', '.'));
      const exact = ing.qty / a.poids;
      if (Math.abs(pieces - exact) / exact > 0.25) ecarts.push(`${ing.ref} ${ing.qty} g → « ${texte} »`);
    }
    expect(ecarts).toEqual([]);
    // Mesuré le 2026-10-23 : 469 lignes du catalogue portent un de ces aliments, 424 se
    // lisent en pièces ; les 45 autres restent en grammes, sous un cinquième de pièce
    // (17 concombre, 10 salade, 7 avocat, 6 chou-fleur, 5 ananas).
    expect(lignes).toBeGreaterThan(400);
    expect(enPieces / lignes).toBeGreaterThan(0.85);
  });
});

describe('la feuille de la Réserve parle la langue de la ligne (2026-10-23)', () => {
  it('« ⅔ tomate » s’ouvre en pièces, le riz en grammes', () => {
    expect(quantiteDeSaisie('Tomate', 80, 'g')).toEqual({ quantity: 0.67, unit: 'pièce' });
    expect(quantiteDeSaisie('Riz basmati', 300, 'g')).toEqual({ quantity: 300, unit: 'g' });
    expect(quantiteDeSaisie('Salade verte', 40, 'g')).toEqual({ quantity: 40, unit: 'g' });
  });

  it('des pièces enregistrées partent en grammes, comme la liste les range : une seule ligne', () => {
    expect(versStockage('Tomate', 2, 'pièce')).toEqual({ quantity: 240, unit: 'g' });
    expect(versStockage('Riz basmati', 1, 'kg')).toEqual({ quantity: 1000, unit: 'g' });
    expect(versStockage('Champignons', 2, 'pièce')).toEqual({ quantity: 2, unit: 'pièce' });
  });

  it('l’écran s’en sert, et garde la quantité exacte quand on n’y touche pas', () => {
    const ecran = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'reserve.tsx'), 'utf8');
    expect(ecran).toContain('quantiteDeSaisie(it.name, it.quantity, it.unit)');
    expect(ecran).toMatch(/inchangee\s*\n?\s*\? \{ quantity: editItem\.quantity, unit: editItem\.unit \}/);
    expect(ecran).not.toContain('toBaseUnit(');
  });
});
