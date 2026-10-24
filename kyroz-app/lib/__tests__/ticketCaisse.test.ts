import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lecteurDisponible } from '../lecteurTicket';
import type { ShoppingItem } from '../types';
import { categorize } from '../pantry';
import { clotureAvecTicket, lireTicket, quantiteDuLibelle, rapprocher } from '../ticketCaisse';

/**
 * LE TICKET DE CAISSE (2026-10-24, étape 2) — lu, rapproché de la LISTE, puis rangé selon la
 * règle validée par le fondateur : « le ticket est la clôture ».
 * ⚠️ Ticket INVENTÉ, au format d'un vrai ticket E.Leclerc dématérialisé : le dépôt est public,
 * les tickets du fondateur ne s'y versent pas.
 */
const TICKET = `
           E.LECLERC EXEMPLE
  Caisse 001-0001 1 novembre 2026 10:00
                                           TTC       TVA
  >> EPICERIE
  THON ENT LISTAO NAT1/4 ECO+140G     1.58             1
  PENNE RIGATE 500G MR                0.82             1
  VAHINE NAPP FRUITS ROUGES 155G      2.78             1
  >> FRUITS LEGUMES
  OIGNON ROUGE VRAC*                  0.23             1
  SAUCE AIL ET CIBOULETTE 175ML       2.54             1
  BANANE FRANCAISE 4 FRUITS           1.95             1
  CONCOMBRE                           0.99             1
  >> CHARCUTERIE L.S
  ALLUMETTES DE JAMBON 2X75G
            2 X 1.23€                 2.46             1
  >> CREMERIE L.S
  OEUFS FRAIS BIO X6 BIO VILLAGE      2.09             1
  OEUFS FRAIS PLEIN AIR OMEGA 3       4.69             1
  >> STAND FRAICHE DECOUPE
  CHAMPIGNONS GOURMANDS               6.43             1
                                ----------
  Total 11 articles                  25.00
  CB                                 25.00
  BIERE BLONDE 6X25CL                 4.20             1
`;

const art = (name: string, quantity: number, unit = 'g'): ShoppingItem =>
  ({ name, quantity, unit, category: categorize(name), checked: false });

describe('lire un ticket', () => {
  const lignes = lireTicket(TICKET);

  it('rend les articles avec leur rayon, et s\'arrête au total', () => {
    expect(lignes.map((l) => l.libelle)).toContain('CHAMPIGNONS GOURMANDS');
    expect(lignes.find((l) => l.libelle === 'CHAMPIGNONS GOURMANDS')?.rayon).toBe('STAND FRAICHE DECOUPE');
    expect(lignes.some((l) => l.libelle.startsWith('BIERE'))).toBe(false);
    expect(lignes.some((l) => /^(TTC|-)/.test(l.libelle))).toBe(false);
  });

  it('« 2 X 1.23€ » sous un article dit qu\'il en a été pris deux', () => {
    expect(lignes.find((l) => l.libelle.startsWith('ALLUMETTES'))?.nombre).toBe(2);
  });

  it('lit la quantité écrite dans le libellé', () => {
    expect(quantiteDuLibelle('TOMATE CERISE FR PDP 200G')).toEqual({ valeur: 200, unite: 'g' });
    expect(quantiteDuLibelle('ALLUMETTES DE JAMBON 2X75G')).toEqual({ valeur: 150, unite: 'g' });
    expect(quantiteDuLibelle('YAOURT BRASSE VANILL 8X125G')).toEqual({ valeur: 1000, unite: 'g' });
    expect(quantiteDuLibelle('CREM FRAIC EPAI 15% 50CL DELIS')).toEqual({ valeur: 500, unite: 'ml' });
    expect(quantiteDuLibelle('LAIT DEMI ECREME 1L')).toEqual({ valeur: 1000, unite: 'ml' });
    expect(quantiteDuLibelle('POMMES DE TERRE 2,5KG')).toEqual({ valeur: 2500, unite: 'g' });
    expect(quantiteDuLibelle('OEUFS FRAIS BIO X6 BIO VILLAGE')).toEqual({ valeur: 6, unite: 'pièce' });
    expect(quantiteDuLibelle('BANANE FRANCAISE 4 FRUITS')).toEqual({ valeur: 4, unite: 'pièce' });
    expect(quantiteDuLibelle('CHAMPIGNONS GOURMANDS')).toBeUndefined();
  });
});

describe('lire un ticket PHOTOGRAPHIÉ (reconnaissance de texte)', () => {
  // Mal lus, tels que la reconnaissance de texte les a rendus sur un vrai ticket (2026-10-24).
  const PHOTO = `
>> FRUITS LEGUMES
CONCOMBRE   0.99
2>RAEUR LS
22 CREMERLE L.S
TROMAGE DE BREBLS LS8 1RANCHE   2.21
`;
  it('un en-tête de rayon mal lu n\'est jamais un article', () => {
    const lignes = lireTicket(PHOTO);
    expect(lignes.map((l) => l.libelle)).toEqual(['CONCOMBRE', 'TROMAGE DE BREBLS LS8 1RANCHE']);
    expect(rapprocher(lignes, [art('Crème de soja', 200, 'ml')]).size).toBe(0);
  });
});

describe('rapprocher le ticket de la liste', () => {
  const lignes = lireTicket(TICKET);
  const liste = [
    art('Thon au naturel (conserve)', 140), art('Pâtes complètes', 500), art('Fruits rouges (mélange)', 250),
    art('Oignon', 150), art('Ail', 10), art('Banane', 400), art('Concombre', 150), art('Jambon blanc', 150),
    art('Œuf entier', 360), art('Champignons', 250), art('Filet de poulet', 300),
  ];
  const trouves = rapprocher(lignes, liste);
  const vu = (nom: string) => (trouves.get(nom) ?? []).map((l) => l.libelle);

  it('les abréviations et les noms d\'enseigne retrouvent l\'article (penne → pâtes)', () => {
    expect(vu('Thon au naturel (conserve)')).toEqual(['THON ENT LISTAO NAT1/4 ECO+140G']);
    expect(vu('Pâtes complètes')).toEqual(['PENNE RIGATE 500G MR']);
    expect(vu('Champignons')).toEqual(['CHAMPIGNONS GOURMANDS']);
    expect(vu('Œuf entier')).toHaveLength(2);
  });

  it('un produit transformé ne vaut pas l\'ingrédient brut (nappage ≠ fruits rouges, sauce ≠ ail)', () => {
    expect(vu('Fruits rouges (mélange)')).toEqual([]);
    expect(vu('Ail')).toEqual([]);
  });

  it('un article absent du ticket n\'est pas retrouvé', () => {
    expect(vu('Filet de poulet')).toEqual([]);
  });
});

describe('le ticket est la clôture', () => {
  const lignes = lireTicket(TICKET);
  const liste = [
    art('Thon au naturel (conserve)', 140), art('Oignon', 150), art('Banane', 400), art('Concombre', 150),
    art('Jambon blanc', 150), art('Œuf entier', 360), art('Champignons', 250), art('Riz basmati', 320), art('Filet de poulet', 300),
  ];
  const { rangements, achetes } = clotureAvecTicket(liste, new Set(['Riz basmati']), rapprocher(lignes, liste));
  const r = (nom: string) => rangements.find((x) => x.name === nom);

  it('retrouvé avec sa quantité → la quantité du ticket (« 2 X » compris)', () => {
    expect(r('Thon au naturel (conserve)')).toMatchObject({ quantity: 140, source: 'ticket' });
    expect(r('Jambon blanc')).toMatchObject({ quantity: 300, source: 'ticket' });
  });

  it('retrouvé sans quantité : le besoin pour le vrac et la découpe, le paquet estimé sinon', () => {
    expect(r('Oignon')).toMatchObject({ quantity: 150, source: 'besoin' });
    expect(r('Champignons')).toMatchObject({ quantity: 250, source: 'besoin' });
    expect(r('Concombre')?.source).toBe('estime');
  });

  it('deux lignes dont une muette : ce qui est lu, plus un paquet estimé', () => {
    expect(r('Œuf entier')?.quantity).toBeGreaterThan(360);
  });

  it('coché mais absent du ticket → le paquet estimé ; ni l\'un ni l\'autre → pas acheté', () => {
    expect(r('Riz basmati')).toMatchObject({ quantity: 500, source: 'estime' });
    expect(r('Filet de poulet')).toBeUndefined();
    expect(achetes).not.toContain('Filet de poulet');
    expect(achetes).toContain('Riz basmati');
  });
});

describe('l\'écran Courses : le ticket dort tant que l\'iPhone ne sait pas le lire', () => {
  const courses = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'courses.tsx'), 'utf8');
  const bloc = courses.slice(courses.indexOf('const terminer = async'));

  it('sans module natif (build (22), web, tests), le lecteur est absent', () => {
    expect(lecteurDisponible()).toBe(false);
  });

  it('le choix « Avec mon ticket » n\'apparaît que si le lecteur existe', () => {
    expect(bloc.indexOf('if (lecteurDisponible())')).toBeGreaterThan(-1);
    expect(bloc.indexOf('if (lecteurDisponible())')).toBeLessThan(bloc.indexOf("label: 'Avec mon ticket'"));
  });

  it('pas de récapitulatif : ce que le ticket dit se range sans écran de confirmation (fondateur, 2026-10-24)', () => {
    expect(bloc).not.toContain('Ranger dans ta réserve');
    expect(bloc).toContain("title: 'Ticket illisible'");
  });

  it('avec un ticket, la réserve reçoit ce qu\'il dit — une seule écriture par sortie', () => {
    expect(bloc).toMatch(/const aRanger = parTicket\s*\?/);
    expect(bloc.match(/savePantry\(/g)).toHaveLength(1);
  });
});
