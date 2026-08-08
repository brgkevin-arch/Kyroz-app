import { describe, it, expect } from 'vitest';
import {
  ecarter, retablir, appliquerEcartes, nettoyerEcartes, resumeEcartes, ecartesApresCloture,
} from '../shoppingRemoved';
import { ShoppingItem } from '../types';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// Retirer un article d'une liste DÉRIVÉE n'est pas la même chose que le retirer
// d'une liste que l'utilisateur possède. La liste de courses est recalculée à
// partir du plan moins le garde-manger, et son cache (`@kyroz:shopping`) est
// effacé par `plan.tsx` à CHAQUE `persistPlan` — donc dès qu'un repas est marqué
// cuisiné. Une suppression rangée dans ce cache se déferait toute seule quelques
// minutes après le geste, et l'article reviendrait sans qu'aucune action de
// l'utilisateur ne l'explique.
//
// D'où une clé à part, et ces fonctions pures. Ce que le test tient :
// le filtre marche, il ne modifie rien d'autre, et surtout il se NETTOIE — sans
// quoi la liste d'exclusions grossirait indéfiniment et ré-écarterait en silence
// un article qu'une nouvelle recette ramène des semaines plus tard.

const item = (name: string, category: ShoppingItem['category'] = 'autres', checked = false): ShoppingItem => ({
  name, quantity: 100, unit: 'g', category, checked,
});

const LISTE = [item('Banane', 'légumes'), item('Riz', 'féculents'), item('Skyr', 'laitiers')];

describe('Articles écartés — le filtre', () => {
  it('retire uniquement les articles nommés', () => {
    const vus = appliquerEcartes(LISTE, ['Riz']).map((i) => i.name);
    expect(vus).toEqual(['Banane', 'Skyr']);
  });

  it('ne touche à rien quand la liste d\'exclusions est vide', () => {
    // Même RÉFÉRENCE : l'écran recalcule ses sections à chaque rendu, un nouveau
    // tableau à chaque fois ferait travailler la liste pour rien.
    expect(appliquerEcartes(LISTE, [])).toBe(LISTE);
  });

  it('ignore un nom qui n\'est pas dans la liste', () => {
    expect(appliquerEcartes(LISTE, ['Quinoa'])).toHaveLength(3);
  });

  it('peut tout retirer — c\'est un état légitime, pas une erreur', () => {
    expect(appliquerEcartes(LISTE, ['Banane', 'Riz', 'Skyr'])).toEqual([]);
  });
});

describe('Articles écartés — ajouter et rétablir', () => {
  it('ajoute sans doublon', () => {
    const un = ecarter([], 'Riz');
    expect(ecarter(un, 'Riz')).toEqual(['Riz']);
  });

  it('conserve l\'ordre d\'ajout', () => {
    expect(ecarter(ecarter([], 'Riz'), 'Banane')).toEqual(['Riz', 'Banane']);
  });

  it('rétablit un seul article sans toucher aux autres', () => {
    expect(retablir(['Riz', 'Banane'], 'Riz')).toEqual(['Banane']);
  });

  it('rétablir un nom absent ne casse rien', () => {
    expect(retablir(['Riz'], 'Quinoa')).toEqual(['Riz']);
  });
});

describe('Articles écartés — le NETTOYAGE, sans lequel la clé grossit sans fin', () => {
  it('oublie un écarté que la liste ne propose plus', () => {
    // Le plan a changé : le riz n'est plus demandé. Le garder en exclusion
    // reviendrait à écarter d'avance un article que personne n'a retiré.
    expect(nettoyerEcartes(['Riz', 'Banane'], [item('Banane', 'légumes')])).toEqual(['Banane']);
  });

  it('garde ceux qui sont encore proposés', () => {
    expect(nettoyerEcartes(['Riz'], LISTE)).toEqual(['Riz']);
  });

  it('vide tout quand la liste est vide', () => {
    expect(nettoyerEcartes(['Riz', 'Banane'], [])).toEqual([]);
  });

  it('rend la MÊME référence quand rien ne change', () => {
    // `load()` réécrit le stockage avec le résultat : renvoyer un tableau neuf à
    // chaque chargement provoquerait une écriture disque à chaque focus d'onglet.
    const ecartes = ['Riz'];
    expect(nettoyerEcartes(ecartes, LISTE)).toBe(ecartes);
  });

  it('sur une liste d\'exclusions vide, ne fait rien', () => {
    const vide: string[] = [];
    expect(nettoyerEcartes(vide, LISTE)).toBe(vide);
  });
});

describe('Fin de courses — le sort des articles non cochés', () => {
  const restants = [item('Riz', 'féculents'), item('Skyr', 'laitiers')];

  it('« retirer » ÉCARTE les non-cochés — sinon le recalcul les ramènerait', () => {
    // Terminer vide le cache, donc la liste se refait depuis le plan et les
    // non-cochés reviennent. Les écarter est la SEULE façon de tenir le choix.
    expect(ecartesApresCloture('retirer', restants)).toEqual(['Riz', 'Skyr']);
  });

  it('« garder » repart de zéro : ils reviendront d\'eux-mêmes', () => {
    expect(ecartesApresCloture('garder', restants)).toEqual([]);
  });

  it('« garder » n\'hérite PAS des écartés de la sortie précédente', () => {
    // Une nouvelle sortie est un nouveau cycle. Sans ça, un article retiré une
    // fois resterait invisible de semaine en semaine sans que rien ne le dise —
    // un bannissement silencieux, alors qu'on ne prétend rayer qu'une ligne.
    expect(ecartesApresCloture('garder', [])).toEqual([]);
  });

  it('sans article restant, rien n\'est écarté quel que soit le choix', () => {
    expect(ecartesApresCloture('retirer', [])).toEqual([]);
    expect(ecartesApresCloture('garder', [])).toEqual([]);
  });
});

describe('Articles écartés — le libellé', () => {
  it('accorde le singulier et le pluriel', () => {
    expect(resumeEcartes(1)).toBe('1 article retiré de ta liste');
    expect(resumeEcartes(3)).toBe('3 articles retirés de ta liste');
  });

  it('ne met aucune pression et ne parle jamais de faute', () => {
    // Règle produit CLAUDE.md §10 : un retrait est un choix, pas un manquement.
    for (const n of [1, 2, 12]) {
      expect(resumeEcartes(n)).not.toMatch(/oubli|manqu|rat[ée]|erreur|attention/i);
    }
  });
});
