import { describe, it, expect } from 'vitest';
import { tailleApercu, RATIO_ECRAN, HAUTEUR_MIN, type MesuresApercu } from '../apercuIntro';

// ── L'APERÇU CÈDE DEVANT LE TITRE, JAMAIS L'INVERSE ──────────────────────────
//
// 🔴 CE QUE CE FICHIER FERME, écrit le 2026-09-07 après l'avoir vu sur TestFlight.
// Le build (17) affichait « Ton plan, décidé pour toi » COUPÉ EN DEUX dans le sens
// de la hauteur : le haut des lettres passait sous le logo. La cause n'était pas
// le titre mais l'aperçu, dimensionné depuis la hauteur de FENÊTRE moins une
// constante devinée (330) qui ne comptait ni les encoches ni le titre lui-même.
// La diapo étant centrée verticalement, son débordement se répartit en haut ET en
// bas — d'où un titre tranché net plutôt qu'un bouton poussé dehors.
//
// ⚠️ Et rien ne pouvait l'attraper : les tests du carrousel lisent le TEXTE de la
// source (le bouton existe-t-il, l'animation rend-elle la main). Aucun ne calculait
// une hauteur. Un défaut de mise en page ne se lit pas dans une expression
// régulière — il se compte.

/**
 * L'appareil de la capture : iPhone à îlot, 393 × 852 pt.
 * Le rail est ce qui RESTE une fois posés les encoches (59 + 34), le logo
 * (16 + 41 + 12), les points (12 + 7 + 12) et le pied (bouton 52 + 16) :
 * 852 − 93 − 69 − 31 − 68 = 591.
 */
const IPHONE: MesuresApercu = {
  hauteurRail: 591,
  hauteurEntete: 82, // titre sur une ligne + texte sur deux + marge basse
  ecart: 8,
  largeurMax: 393 - 20 * 2,
  hauteurFenetre: 852,
};

const tientDansLeRail = (m: MesuresApercu) =>
  tailleApercu(m).hauteur + m.hauteurEntete + m.ecart <= m.hauteurRail + 0.001;

describe('tailleApercu', () => {
  it('l’aperçu tient dans le rail, en-tête comprise — l’invariant', () => {
    expect(tientDansLeRail(IPHONE)).toBe(true);
  });

  it('LE DÉFAUT DU BUILD (17) : l’ancienne formule débordait de 27 pt en haut', () => {
    // Ce que l'ancien code calculait : min(852 × 0,62 ; 852 − 330) = 522.
    const ancienne = Math.min(IPHONE.hauteurFenetre * 0.62, IPHONE.hauteurFenetre - 330);
    const deborde = ancienne + IPHONE.hauteurEntete + IPHONE.ecart - IPHONE.hauteurRail;
    expect(deborde).toBeGreaterThan(0);
    // Centrée, la diapo perd la MOITIÉ du débordement par le haut : le titre fait
    // 28 pt de haut, il en manquait donc bien près de la moitié sur la capture.
    expect(deborde / 2).toBeGreaterThan(10);
    // …et la nouvelle, sur les mêmes mesures, ne déborde plus.
    expect(tailleApercu(IPHONE).hauteur).toBeLessThan(ancienne);
  });

  it('un titre qui s’allonge (grande police système) rétrécit l’aperçu, pas le titre', () => {
    const gros = { ...IPHONE, hauteurEntete: 160 };
    expect(tailleApercu(gros).hauteur).toBeLessThan(tailleApercu(IPHONE).hauteur);
    expect(tientDansLeRail(gros)).toBe(true);
  });

  it('quand c’est la LARGEUR qui manque, c’est elle qui décide', () => {
    // Écran court et large : le rail offrirait 500 pt de haut, la colonne n'en
    // permet que 220 × (932/430) ≈ 477.
    const large = { ...IPHONE, hauteurRail: 700, largeurMax: 220 };
    expect(tailleApercu(large).hauteur).toBeCloseTo(220 / RATIO_ECRAN, 5);
    expect(tailleApercu(large).largeur).toBeCloseTo(220, 5);
  });

  it('le ratio de la capture est conservé', () => {
    const { largeur, hauteur } = tailleApercu(IPHONE);
    expect(largeur / hauteur).toBeCloseTo(RATIO_ECRAN, 6);
  });

  it('avant toute mesure, le repli rend une taille utilisable', () => {
    const avant = { ...IPHONE, hauteurRail: 0, hauteurEntete: 0 };
    expect(tailleApercu(avant).hauteur).toBeGreaterThan(HAUTEUR_MIN);
  });

  it('un rail minuscule ne rend jamais un aperçu négatif', () => {
    const minuscule = { ...IPHONE, hauteurRail: 100, hauteurEntete: 82 };
    expect(tailleApercu(minuscule).hauteur).toBe(HAUTEUR_MIN);
  });
});
