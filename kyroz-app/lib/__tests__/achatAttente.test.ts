import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { choisirProduit, PURCHASE_BUDGET_MS } from '../purchases';

// ── L'ATTENTE D'UN ACHAT DOIT SE VOIR, ET LE PRIX DÉBITÉ ÊTRE CELUI AFFICHÉ ──
//
// 🔴 CE QUE CE FICHIER FERME, signalé par le fondateur le 2026-09-08 : « quand j'ai
// retenté de m'abonner avec le compte démo, l'abonnement a mis de longues secondes
// avant de se mettre, laissant penser que ça ne fonctionnait pas ».
//
// Deux choses distinctes, et une seule est de notre côté :
//  · la validation du reçu par le store est LENTE, surtout en bac à sable. On ne la
//    raccourcit pas, et prétendre le contraire serait faux ;
//  · mais l'écran, lui, ne donnait AUCUN signe de vie : le bouton passait à « Un
//    instant… » et n'a plus jamais bougé. Un texte figé quinze secondes se lit comme
//    une app plantée. Ça, c'est à nous.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const ecran = sansCommentaires(lire('app/kyroz-plus.tsx'));

const P = (identifier: string, prix: string) => ({ identifier, prix });

describe('choisirProduit', () => {
  it('le produit DÉJÀ VU gagne — c’est lui dont le prix est à l’écran', () => {
    const vu = P('kyroz.plus.monthly', '3,99 €');
    const rapporte = P('kyroz.plus.monthly', '4,99 €');
    expect(choisirProduit('kyroz.plus.monthly', vu, [rapporte])).toBe(vu);
  });

  it('sans rien de vu, on prend celui qu’on vient de rapporter', () => {
    const rapporte = P('kyroz.plus.monthly', '3,99 €');
    expect(choisirProduit('kyroz.plus.monthly', undefined, [rapporte])).toBe(rapporte);
  });

  it('rien de vu, rien de rapporté : indisponible, pas un produit au hasard', () => {
    expect(choisirProduit('kyroz.plus.monthly', undefined, [])).toBeUndefined();
    expect(choisirProduit('kyroz.plus.monthly', undefined, [P('autre.id', '1 €')])).toBeUndefined();
  });
});

describe('l’écran d’abonnement montre qu’il travaille', () => {
  it('le bouton porte un indicateur, il ne se contente pas de changer de mot', () => {
    expect(ecran).toMatch(/loading=\{enCours\}/);
    // La forme fautive : un libellé qui bascule et un bouton qui ne bouge plus.
    expect(ecran).not.toMatch(/label=\{enCours \?/);
  });

  it('…et il DIT combien de temps, sur la seule borne qu’on tient vraiment', () => {
    // Annoncer une durée qu'on ne contrôle pas serait un mensonge ; `PURCHASE_BUDGET_MS`
    // est le moment où NOUS rendons la main, donc le seul chiffre promettable.
    expect(ecran).toMatch(/PURCHASE_BUDGET_MS \/ 1000/);
    expect(PURCHASE_BUDGET_MS).toBe(30_000);
  });
});
