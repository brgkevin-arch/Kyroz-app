import { describe, it, expect } from 'vitest';
import {
  TABLET_MIN_WIDTH, CONTENT_MAX_WIDTH, SHEET_MAX_WIDTH, GRID_MAX_WIDTH,
  centered, gridColumns,
} from '../layout';

// Ce que ce fichier verrouille : la FRONTIÈRE entre téléphone et tablette.
// Elle est facile à déplacer d'un chiffre rond (768 « parce que c'est l'usage »),
// et la déplacer casse en silence — soit un iPhone reçoit une mise en page
// tablette, soit un iPad reste en pleine largeur.

// Largeurs RÉELLES en points, portrait (l'app est portrait-only).
const IPHONE = {
  'SE (3e gen)': 375,
  '13 mini': 375,
  '15': 393,
  '16 Pro': 402,
  '16 Pro Max': 440,
};

const IPAD = {
  'mini (6e gen)': 744,
  '11"': 834,
  '13"': 1024,
  '13" paysage': 1366,
};

describe('frontière téléphone / tablette', () => {
  it('aucun iPhone ne bascule en mise en page tablette', () => {
    for (const [nom, w] of Object.entries(IPHONE)) {
      expect(w, nom).toBeLessThan(TABLET_MIN_WIDTH);
      expect(centered(w, CONTENT_MAX_WIDTH), nom).toEqual({});
      expect(gridColumns(w), nom).toBe(1);
    }
  });

  it('tous les iPad basculent', () => {
    for (const [nom, w] of Object.entries(IPAD)) {
      expect(w, nom).toBeGreaterThanOrEqual(TABLET_MIN_WIDTH);
      expect(gridColumns(w), nom).toBe(2);
      expect(centered(w, CONTENT_MAX_WIDTH), nom).toEqual({
        width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center',
      });
    }
  });

  it('un Split View à 50 % reste en mise en page téléphone', () => {
    // 507 pt = moitié d'un iPad 11" en paysage. À cette largeur, deux colonnes
    // de recettes feraient 230 pt chacune : illisible.
    expect(centered(507, CONTENT_MAX_WIDTH)).toEqual({});
    expect(gridColumns(507)).toBe(1);
  });

  it('le seuil est inclusif et strict d\'un point', () => {
    expect(centered(TABLET_MIN_WIDTH - 1, CONTENT_MAX_WIDTH)).toEqual({});
    expect(centered(TABLET_MIN_WIDTH, CONTENT_MAX_WIDTH)).not.toEqual({});
  });
});

describe('les colonnes gardent des largeurs lisibles', () => {
  it('sur téléphone, le style est un NO-OP strict', () => {
    // Le point le plus important du fichier : la mise en page téléphone ne doit
    // pas bouger d'un pixel. Un objet non vide (même « inoffensif ») suffirait
    // à faire diverger le rendu existant.
    for (const max of [CONTENT_MAX_WIDTH, SHEET_MAX_WIDTH, GRID_MAX_WIDTH]) {
      expect(Object.keys(centered(390, max))).toHaveLength(0);
    }
  });

  it('la colonne de contenu tient sous ~75 caractères', () => {
    // ~7,5 px par caractère à 15 pt, moins 24 pt de marge d'écran et 18 pt de
    // padding de carte de chaque côté.
    const utile = CONTENT_MAX_WIDTH - 2 * 24 - 2 * 18;
    expect(Math.round(utile / 7.5)).toBeLessThanOrEqual(75);
  });

  it("aucune colonne de l'écran recette n'est plus étroite que sur téléphone", () => {
    // LE garde-fou du mode deux colonnes. Sans lui, élargir la préparation ou
    // rétrécir la feuille rend la ligne « nom … quantité » plus serrée sur iPad
    // que sur iPhone — une régression déguisée en amélioration.
    // Référence : iPhone 15 (393 pt) moins les 2 × 24 pt de padding de la feuille.
    const UTILE_IPHONE = 393 - 2 * 24;
    const utile = SHEET_MAX_WIDTH - 2 * 24 - 32; // padding + gouttière
    expect(utile / 2).toBeGreaterThanOrEqual(UTILE_IPHONE);
  });

  it('la grille laisse deux cartes larges comme un téléphone', () => {
    const carte = (GRID_MAX_WIDTH - 2 * 24 - 10) / 2;
    expect(carte).toBeGreaterThanOrEqual(390);
  });

  it('la feuille est plus large que le contenu, la grille plus large que la feuille', () => {
    expect(CONTENT_MAX_WIDTH).toBeLessThan(SHEET_MAX_WIDTH);
    expect(SHEET_MAX_WIDTH).toBeLessThan(GRID_MAX_WIDTH);
  });
});
