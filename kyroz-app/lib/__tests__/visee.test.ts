import { describe, it, expect } from 'vitest';
import {
  Cadre, dejaVisible, memeCadre, budgetMesureMs,
  MARGE_VISIBLE, TOLERANCE_CADRE, ESSAIS_MESURE, PAS_MESURE_MS,
} from '../visee';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// Le 2026-08-15, le fondateur a envoyé deux captures de l'onglet Plan. Sur la
// seconde, l'anneau de la visite guidée entourait un vide 72 points sous le
// bouton qu'il devait désigner — la bonne taille, la bonne colonne, la mauvaise
// hauteur. La cause n'était pas dans le dessin : le moteur lançait un
// défilement ANIMÉ puis mesurait 260 ms plus tard, en supposant que c'était
// terminé. La lecture tombait en plein vol.
//
// Un délai deviné ne se voit pas en relisant le code : il a l'air d'une marge
// de sécurité. Il ne se voit qu'à l'écran, et seulement sur les étapes qui
// défilent — donc pas sur celles qu'on regarde en développant.
//
// ➡️ Les deux décisions sont sorties du composant (`lib/visee.ts`, sans aucun
// import, comme `tours.ts` pour le contenu des bulles). Le câblage, lui, est
// relu par `visiteGuidee.test.ts`.

const ECRAN = 932;                                   // iPhone 16 Pro Max, en points
const cadre = (y: number, height = 44, x = 20, width = 172): Cadre => ({ x, y, width, height });

describe('Visée — faut-il déplacer l’écran pour montrer la cible ?', () => {
  it('une cible au milieu de l’écran ne fait défiler personne', () => {
    expect(dejaVisible(cadre(400), ECRAN)).toBe(true);
  });

  it('une cible sous la ligne de flottaison exige un défilement', () => {
    expect(dejaVisible(cadre(1400), ECRAN)).toBe(false);
  });

  it('une cible au-dessus du champ visible aussi', () => {
    expect(dejaVisible(cadre(-30), ECRAN)).toBe(false);
  });

  it('🔴 la marge dégage les deux barres qui FLOTTENT au-dessus du contenu', () => {
    // Une cible techniquement « dans l'écran » mais glissée sous la barre de
    // titre compacte ou sous la barre d'onglets est invisible : l'anneau
    // désignerait alors une zone que personne ne voit. Juste sous la marge du
    // haut, on défile ; juste après, non.
    expect(dejaVisible(cadre(MARGE_VISIBLE - 1), ECRAN)).toBe(false);
    expect(dejaVisible(cadre(MARGE_VISIBLE), ECRAN)).toBe(true);
    // Et le même raisonnement en bas, où la barre d'onglets flotte.
    const basJuste = ECRAN - MARGE_VISIBLE - 44;
    expect(dejaVisible(cadre(basJuste), ECRAN)).toBe(true);
    expect(dejaVisible(cadre(basJuste + 1), ECRAN)).toBe(false);
  });

  it('une cible PLUS HAUTE que la zone dégagée ne se défile pas — ça ne gagnerait rien', () => {
    // Le bloc des macros du Plan, ou une carte de recette sur petit écran :
    // défiler ne la rendrait pas plus visible, ça ne ferait que bouger l'écran
    // sous quelqu'un en train de lire.
    expect(dejaVisible(cadre(0, ECRAN), ECRAN)).toBe(true);
    expect(dejaVisible(cadre(-200, ECRAN + 400), ECRAN)).toBe(true);
  });

  it('un écran plus petit que ses propres barres ne bloque pas le tour', () => {
    // Cas limite, mais un tour qui ne se lance pas est un tour perdu à vie.
    expect(dejaVisible(cadre(10, 20), 100)).toBe(true);
  });
});

describe('Visée — une mesure ne se croit qu’une fois STABLE', () => {
  it('deux lectures identiques valent « l’écran s’est arrêté »', () => {
    expect(memeCadre(cadre(300), cadre(300))).toBe(true);
  });

  it('🔴 deux lectures d’un défilement en cours ne se confondent pas', () => {
    // C'est exactement la capture 2 : 72 points d'écart, avalés par un délai
    // deviné. Ici, ils font échouer la comparaison — donc on remesure.
    expect(memeCadre(cadre(721), cadre(573))).toBe(false);
  });

  it('le bruit du sous-pixel ne relance pas la mesure indéfiniment', () => {
    expect(memeCadre(cadre(300), cadre(300.4))).toBe(true);
    expect(memeCadre(cadre(300), cadre(300 + TOLERANCE_CADRE * 3))).toBe(false);
  });

  it('un changement de TAILLE compte autant qu’un déplacement', () => {
    // Une carte qui s'ouvre pendant la mesure change de hauteur sans bouger :
    // l'anneau serait alors trop court, et ça se voit.
    expect(memeCadre(cadre(300, 44), cadre(300, 88))).toBe(false);
    expect(memeCadre(cadre(300, 44, 20, 172), cadre(300, 44, 20, 300))).toBe(false);
  });
});

describe('Visée — le budget de recherche couvre un vrai défilement', () => {
  it('on cherche plus longtemps qu’un défilement animé ne dure', () => {
    // Un `scrollTo` animé d'iOS dure ~500 ms, et la mise en page se pose
    // derrière. Renoncer trop tôt écarterait une cible parfaitement saine,
    // simplement lente — et une étape écartée, c'est une bulle perdue.
    expect(budgetMesureMs()).toBeGreaterThanOrEqual(1000);
  });

  it('mais il RENONCE — une recherche sans fin est l’écran noir d’avant', () => {
    // Le défaut le plus grave du 2026-08-15 : tant que la mesure tournait, le
    // voile sombre s'affichait sans bulle, donc sans « Passer ». Un budget
    // borné est ce qui garantit qu'on repasse la main à l'utilisateur.
    expect(Number.isFinite(budgetMesureMs())).toBe(true);
    expect(budgetMesureMs()).toBeLessThanOrEqual(3000);
    expect(ESSAIS_MESURE).toBeGreaterThan(0);
    expect(PAS_MESURE_MS).toBeGreaterThan(0);
  });
});
