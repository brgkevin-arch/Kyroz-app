import { describe, it, expect } from 'vitest';
import { etapesAvecQuantites } from '../etapesQuantites';

// Segment 9, P4 (décision fondateur du 2026-11-06) : la quantité dans l'étape, à la 1re mention.
const g = (i: { quantity_g: number; unit?: string }) => `${i.quantity_g} ${i.unit ?? 'g'}`;
const etapes = [
  'Fais cuire les pâtes dans un grand volume d’eau salée.',
  'Coupe les tomates en quartiers et hache la roquette.',
  'Chauffe l’huile d’olive, ajoute les tomates puis les crevettes.',
];
const ings = [
  { name: 'Pâtes (semoule)', quantity_g: 75 },
  { name: 'Tomate', quantity_g: 90 },
  { name: "Huile d'olive", quantity_g: 20 },
  { name: 'Crevettes cuites', quantity_g: 190 },
  { name: 'Roquette', quantity_g: 30 },
  { name: 'Parmesan', quantity_g: 10 },
];

describe('la quantité dans l’étape', () => {
  const out = etapesAvecQuantites(etapes, ings, g);
  it('à la première mention, pluriel et accents compris', () => {
    expect(out[0]).toBe('Fais cuire les pâtes (75 g) dans un grand volume d’eau salée.');
    expect(out[1]).toBe('Coupe les tomates (90 g) en quartiers et hache la roquette (30 g).');
    expect(out[2]).toBe('Chauffe l’huile d’olive (20 g), ajoute les tomates puis les crevettes (190 g).');
  });
  it('une seule fois par ingrédient, et rien de forcé pour un ingrédient que le texte ne nomme pas', () => {
    expect(out.join(' ').match(/\(90 g\)/g)?.length).toBe(1);
    expect(out.join(' ')).not.toContain('(10 g)');
  });
  it('pas au milieu d’un autre mot', () => {
    expect(etapesAvecQuantites(['Ajoute les patates douces.'], [{ name: 'Pâtes', quantity_g: 75 }], g))
      .toEqual(['Ajoute les patates douces.']);
  });
});

describe('le nom entier avant son premier mot', () => {
  it('« au fromage blanc (190 g) », pas « au fromage (190 g) blanc »', () => {
    expect(etapesAvecQuantites(['Mélange les flocons au fromage blanc et laisse gonfler.'], [{ name: 'Fromage blanc 0%', quantity_g: 190 }], g))
      .toEqual(['Mélange les flocons au fromage blanc (190 g) et laisse gonfler.']);
  });
  it('« Filet de poulet » se retrouve dans « le poulet »', () => {
    expect(etapesAvecQuantites(['Saisis le poulet 6 minutes.'], [{ name: 'Filet de poulet', quantity_g: 150 }], g))
      .toEqual(['Saisis le poulet (150 g) 6 minutes.']);
  });
});

describe('la fiche recette, épurée (segment 9, 2026-11-06)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src: string = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../components/RecipeDetail.tsx'), 'utf8');
  const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '');
  it('ni étiquettes d’objectif, ni « 1 portion », ni fibres, ni phrase sous « Remplacer »', () => {
    expect(code).not.toMatch(/OBJ_LABEL/);
    expect(code).not.toMatch(/'1 portion'/);
    expect(code).not.toMatch(/de fibres \(estimé\)/);
    expect(code).not.toMatch(/Ce remplacement vaut pour ce plan/);
  });
  it('les étapes passent par `etapesAvecQuantites`, les manques s’affichent « à acheter »', () => {
    expect(code).toMatch(/etapesAvecQuantites\(recipe\.steps, ings,/);
    expect(code).toMatch(/aAcheter\?\.includes\(ing\.name\) && <Text style=\{s\.ingAAcheter\}>à acheter<\/Text>/);
  });
});
