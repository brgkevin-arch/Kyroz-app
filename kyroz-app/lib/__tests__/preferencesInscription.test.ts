import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── CE QUE LE FONDATEUR A DEMANDÉ LE 2026-09-08, ET QUI DOIT LE RESTER ───────
//
// Quatre demandes nées d'une lecture du build (17) à l'écran. Aucune n'était
// couverte : le seul test de ces étapes vérifie qu'on peut en SORTIR, pas ce
// qu'elles montrent. Un défaut de mise en page ne se lit pas dans une expression
// régulière — mais son ABSENCE de garde-fou, si.
//
// ⚠️ Ces tests lisent la SOURCE. C'est le contrôle le plus faible du dépôt et il
// faut le savoir : il attrape une suppression, pas une régression visuelle. Le
// vrai contrôle du rendu reste la capture au simulateur.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const onboarding = sansCommentaires(lire('app/(auth)/onboarding.tsx'));
const dislikes = sansCommentaires(lire('components/DislikedFoodsField.tsx'));

describe('la page « séances » respire', () => {
  it('elle porte l’espacement commun, elle ne l’hérite pas d’un View de mesure', () => {
    // 🔴 LE DÉFAUT (build 17) : les séances vivaient dans un `View` qui n'existait que
    // pour porter un `onLayout`, et il repartait donc à zéro là où `s.block` donne
    // `gap` à tous les autres — l'intertitre collait aux bulles, la ligne « ≈ N kcal »
    // collait au bouton. Depuis le 2026-09-22 les séances ont LEUR page : elle doit
    // s'ouvrir sur `s.block`, comme les autres.
    const page = onboarding.match(/etape === 'seances' && \(\s*<View style=\{s\.block\}>/);
    expect(page, 'la page des séances doit s’ouvrir sur `s.block`').not.toBeNull();
  });
});

describe('l’étape « préférences » dit ce que le fondateur a demandé', () => {
  // 🔴 DÉCISION REMPLACÉE LE 2026-09-15 (D36). Le « Peu importe » du régime (demande du
  // 2026-09-08) laisse la place à la case « Omnivore » : « il n'y a pas de peu importe dans la
  // préférence de régime, on ajoute juste une case omnivore ». Les protéines gardent le leur.
  it('le régime propose « Omnivore » et n’a plus de « Peu importe » (D36)', () => {
    expect(onboarding).toContain("{ label: 'Omnivore', value: 'omnivore' }");
    expect(onboarding).not.toMatch(/regimeLibre/);
    expect(onboarding).toMatch(/setProteinesEgales/);
  });

  it('cocher « Omnivore » et un régime sans viande ne coexistent pas — la règle vit dans lib/regime.ts', () => {
    expect(onboarding).toMatch(/basculerRegime\(restrictions, v\)/);
  });

  it('la phrase « passe avant tout le reste » a disparu', () => {
    expect(onboarding).not.toContain('passe avant tout le reste');
  });
});

describe('la page « préférences » se dévoile question par question (2026-09-22)', () => {
  // Décision fondateur : d'abord le régime SEUL, puis les protéines, puis sucré ou salé,
  // puis les aliments à éviter et la variété. L'ordre est une décision, pas une mise en
  // page : il se lit dans les paliers `niveauMontre >= n` de l'écran.
  const palier = (n: number) => onboarding.indexOf(`niveauMontre >= ${n}`);
  const entre = (a: number, b: number) => onboarding.slice(a, b === -1 ? undefined : b);

  it('le régime d’abord, puis protéines, goûts, et enfin aliments à éviter + variété', () => {
    const [p1, p2, p3] = [palier(1), palier(2), palier(3)];
    expect(p1, 'palier des protéines introuvable').toBeGreaterThan(-1);
    expect(p1).toBeLessThan(p2);
    expect(p2).toBeLessThan(p3);
    const fin = onboarding.indexOf("etape === 'repas'", p3);
    expect(onboarding.slice(0, p1)).toContain('options={RESTRICTIONS}');
    expect(entre(p1, p2)).toContain('<ProteinesParRegime');
    expect(entre(p2, p3)).toContain('estChoisi={(v) => goutPdj === v}');
    expect(entre(p2, p3)).toContain('estChoisi={(v) => goutCollation === v}');
    expect(entre(p3, fin)).toContain('<DislikedFoodsField');
    expect(entre(p3, fin)).toContain('VARIETY.map(');
  });

  it('le palier suit les RÉPONSES : régime, puis protéines, puis les deux goûts', () => {
    expect(onboarding).toContain('const niveauRepondu = !regimeChoisi(restrictions) ? 0 : !preferencesValid ? 1 : !goutsValid ? 2 : 3;');
  });

  it('ce qui est montré ne se retire jamais — décocher ne fait rien disparaître', () => {
    expect(onboarding).toContain('if (niveauRepondu <= niveauMontre) return;');
  });

  it('l’écran ne descend que sur UN palier gagné d’un coup (un geste, pas un brouillon relu)', () => {
    expect(onboarding).toContain("if (niveauRepondu === niveauMontre + 1 && etape === 'preferences') aDescendre.current = niveauRepondu;");
  });

  it('titre seul, et plus d’explication sous « Protéines préférées »', () => {
    expect(onboarding).not.toContain('Pour des recettes qui te ressemblent vraiment.');
    expect(onboarding).not.toContain('Tu préfères la routine ou la diversité ?');
    expect(onboarding).toMatch(/<ProteinesParRegime[^>]*intitule="phrase"/);
    expect(onboarding).toMatch(/<DislikedFoodsField[^>]*intitule="phrase"/);
  });
});

describe('« Aliments à éviter » ne propose plus de liste', () => {
  it('aucun aliment n’est écrit en dur dans le composant', () => {
    for (const mot of ['Saumon', 'Thon', 'Brocolis', 'Avocat', 'Quinoa', 'Patate douce']) {
      expect(dislikes, `« ${mot} » ne doit plus être proposé en bulle`).not.toContain(mot);
    }
  });

  it('…mais ce qui est DÉJÀ enregistré reste affiché et retirable', () => {
    // Sans ça, retirer les bulles ferait disparaître en silence les aliments
    // qu'un profil existant avait cochés : ils resteraient actifs dans le moteur,
    // invisibles à l'écran, donc impossibles à défaire.
    expect(dislikes).toMatch(/custom\.map/);
    expect(dislikes).toMatch(/const custom = value;/);
  });

  it('la saisie libre, elle, est toujours là', () => {
    expect(dislikes).toMatch(/onSubmitEditing=\{add\}/);
  });
});

describe('la grille rectangulaire des préférences (2026-09-22)', () => {
  // La DA retenue sur les séances, reprise ici : régime, protéines et goûts en
  // `GrilleChoix`, « Peu importe » en case pleine largeur. Une seule forme, un seul
  // composant — deux copies divergeraient à la première retouche.
  it('régime, protéines et goûts passent par la grille commune', () => {
    expect(onboarding).toContain('<GrilleChoix\n              t={t} options={RESTRICTIONS}');
    expect(onboarding).toMatch(/<ProteinesParRegime[^>]*\bgrille\b/);
    expect((onboarding.match(/options=\{GOUT_TRANCHES\}/g) ?? []).length).toBe(2);
  });

  it('« Peu importe » des goûts est lu dans GOUT_CHOIX, jamais recopié', () => {
    expect(onboarding).toContain("const GOUT_EGAL = GOUT_CHOIX.find((g) => g.value === 'egal')!;");
    expect(onboarding).not.toMatch(/label: 'Peu importe'/);
  });

  it('les séances partagent la même grille', () => {
    expect(readFileSync(join(RACINE, 'components/SportsEditor.tsx'), 'utf8')).toContain('<GrilleChoix');
  });
});

