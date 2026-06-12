import { describe, it, expect } from 'vitest';
import { formatQuantity } from '../units';

describe('formatQuantity', () => {
  it('compte les œufs à la pièce', () => {
    expect(formatQuantity('Œufs', 110)).toBe('2 œufs');
    expect(formatQuantity("Blanc d'œuf", 99)).toBe("3 blancs d'œuf");
  });

  it('NE compte PAS le bœuf comme des œufs (régression « bœuf → œufs »)', () => {
    // « bœuf » contient « œuf » : doit rester en grammes, pas en pièces.
    expect(formatQuantity('Bœuf haché 5%', 200)).toBe('200 g');
    expect(formatQuantity('Steak de boeuf', 250)).toBe('250 g');
  });

  it('poids : g puis kg au-delà de 1000', () => {
    expect(formatQuantity('Riz', 300)).toBe('300 g');
    expect(formatQuantity('Riz', 1500)).toBe('1,5 kg');
  });

  it('liquides en ml puis L ; pièces en pc', () => {
    expect(formatQuantity('Lait', 500, 'ml')).toBe('500 ml');
    expect(formatQuantity('Lait', 1000, 'ml')).toBe('1 L');
    expect(formatQuantity('Tortilla', 2, 'pièce')).toBe('2 pc');
  });
});
