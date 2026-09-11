import { describe, it, expect } from 'vitest';
import { RAW_RECIPES, RECIPE_INGREDIENTS } from '../recipeData';
import {
  cuissonRequise,
  aUnRepereDeCuisson,
  estMuette,
  REFS_CRUS_MANGEABLES,
  REFS_CUISSON_SANS_BASIS,
} from '../instructionsQualite';

/**
 * ── CLIQUET « recettes muettes » ────────────────────────────────────────────
 *
 * Une recette MUETTE demande une cuisson et n'en dit rien : ni durée, ni température,
 * ni signe de cuisson. Le catalogue en comptait **139 sur 512** le 2026-09-09, dont 84
 * réellement servies par le moteur. Exemple : `rep129`, servie 96 fois sur 240 semaines
 * simulées, disait en tout et pour tout « Cuire les nouilles. » puis « Sauter tofu et
 * légumes, lier à la sauce cacahuète. »
 *
 * On ne peut donc pas exiger zéro. Ce plafond est l'état CONSTATÉ, et il ne peut que
 * descendre : une vague qui rajoute une recette muette fait échouer la suite.
 *
 * ⚠️ Ce test ne compte PAS les étapes, et c'est délibéré. L'audit du 2026-09-09 mesurait
 * « ≤ 2 étapes » et se trompait dans les deux sens : il accusait 68 assemblages à froid
 * qui sont complets en deux phrases, et ratait 37 recettes bavardes mais muettes. Le
 * nombre d'étapes est une mesure de FORME ; ce qui manque à l'utilisateur est de fond.
 *
 * Journal des mouvements :
 *   139 → 119  lot pilote L1 (2026-09-09) : les 20 recettes muettes les plus SERVIES
 *              réécrites au format B1-B9. 20 recettes sur 139, mais **694 des 1 053
 *              repas muets** servis sur 240 semaines simulées, soit 66 % : la part de
 *              repas servis par une recette muette tombe de 15,7 % à 5,3 %.
 *              Aucune composition ni macro touchée — seul le texte, plus `temps_min` sur
 *              4 recettes dont la durée réelle dépassait le temps annoncé.
 *   119 → 114  RESSERRAGE au merge du 2026-09-10, sans réécrire une seule recette de
 *              plus. Deux chantiers voisins ont fait descendre le compteur sans le
 *              savoir : les 17 recettes qui citaient une denrée non servie (#248) ont
 *              gagné leurs repères de cuisson au passage, et col09 s'est vu ajouter
 *              l'étape qui manquait à son escalope de dinde CRUE (#251).
 *              ⚠️ Un cliquet ne se resserre pas tout seul : le laisser à 119 rendait
 *              5 points de mou à la prochaine vague, qui aurait pu rajouter cinq
 *              recettes muettes sans faire rougir un test.
 *   114 → 94   lot L2 (2026-09-11) : les 20 muettes les plus SERVIES restantes, réécrites
 *              au format B1-B9. La part de repas servis par une recette muette tombe de
 *              5,2 % à **2,2 %** (352 repas sur 6 720 → 145). `rep82` annonçait 18 minutes
 *              pour un riz complet qui en prend 25 : `temps_min` corrigé à 30, la durée
 *              n'a pas été rabotée.
 *   94 → 74   lot L3 (2026-09-11) : les 20 muettes servies suivantes. Deux décisions de
 *              fond, pas de rédaction : `rep20` (poke) suit le précédent de `rep74` et
 *              SAISIT son saumon au lieu de le servir cru, et `pd76` annonçait 15 minutes
 *              pour une polenta qui doit prendre 20 minutes avant d'être grillée
 *              (`temps_min` → 30, comme `rep80` → 30 pour son riz complet).
 *   Le reste est planifié par lots dans `Recette/PLAN-REECRITURE-INSTRUCTIONS.md`.
 */
const MUETTES_MAX = 74;

const muettes = RAW_RECIPES.filter((r) => estMuette(r, RECIPE_INGREDIENTS));

describe('instructions muettes (cliquet)', () => {
  it(`au plus ${MUETTES_MAX} recettes qui cuisent sans dire ni durée, ni feu, ni repère`, () => {
    const exemples = muettes.slice(0, 8).map((r) => `${r.id} « ${r.name} » : ${r.instructions.join(' / ')}`);
    expect(
      muettes.length,
      `le compteur passe de ${MUETTES_MAX} à ${muettes.length} :\n  ${exemples.join('\n  ')}`,
    ).toBeLessThanOrEqual(MUETTES_MAX);
  });

  /**
   * Règle ABSOLUE, pas un cliquet : les vagues écrites au format actuel (B1 → B9, toutes
   * préfixées `2026-08`) n'ont AUCUNE recette muette, et c'est ce qui rend le format
   * atteignable. Toute vague future s'y ajoute. Un plafond glissant aurait laissé la
   * prochaine vague introduire des muettes tant que le solde global descendait.
   */
  it('aucune recette des vagues au format actuel (B1 → B9) n’est muette', () => {
    const fautives = RAW_RECIPES
      .filter((r) => r.wave.startsWith('2026-08') && estMuette(r, RECIPE_INGREDIENTS))
      .map((r) => `${r.id} « ${r.name} » (${r.wave})`);
    expect(fautives, `vague au format actuel avec une recette muette :\n  ${fautives.join('\n  ')}`).toEqual([]);
  });
});

/**
 * ── TÉMOIN ──────────────────────────────────────────────────────────────────
 * Un cliquet sur un compteur qui tomberait à zéro parce que la SONDE est cassée passerait
 * au vert en silence — et plus rien ne garderait le catalogue. Ces trois tests vérifient
 * que la sonde mesure encore quelque chose.
 */
describe('témoin — la sonde mesure encore', () => {
  it('la cuisson est détectée sur une large part du catalogue', () => {
    const n = RAW_RECIPES.filter((r) => cuissonRequise(r, RECIPE_INGREDIENTS)).length;
    // 372 le 2026-09-09. Si `cuissonRequise` cessait de voir les `basis`, ce nombre
    // s'effondrerait et le compteur de muettes tomberait à zéro tout seul.
    expect(n).toBeGreaterThan(300);
  });

  it('les repères sont détectés sur les vagues qui en donnent', () => {
    const b1 = RAW_RECIPES.filter((r) => r.wave === '2026-08-01-b1-lot1-repas');
    const avec = b1.filter((r) => aUnRepereDeCuisson(r)).length;
    // Les 20 recettes de B1-lot1 donnent toutes durée et repère visuel. Si le détecteur
    // de repères s'arrêtait de fonctionner, elles deviendraient toutes « muettes ».
    expect(avec).toBe(b1.length);
  });

  it('les `ref` d’exception existent encore dans la table d’ingrédients', () => {
    // Un `ref` renommé ferait disparaître son exception SANS bruit : les flocons d'avoine
    // repasseraient « à cuire », et 40 muesli deviendraient des muettes fantômes.
    const inconnus = [...REFS_CRUS_MANGEABLES, ...REFS_CUISSON_SANS_BASIS]
      .filter((ref) => !RECIPE_INGREDIENTS[ref]);
    expect(inconnus, `ref d'exception disparu de la table : ${inconnus.join(', ')}`).toEqual([]);
  });
});

/**
 * ── VÉRIFICATION PAR MUTATION ───────────────────────────────────────────────
 * Un garde-fou qu'on n'a jamais vu rougir ne garde rien. On fabrique ici les cas que le
 * test DOIT attraper, et ceux qu'il ne doit PAS attraper.
 */
describe('mutation — le contrôle rougit sur un cas fabriqué', () => {
  const rizEtPoulet = [{ ref: 'riz_complet' }, { ref: 'poulet_filet' }];

  it('« Cuire le riz. » sur une recette qui cuit est bien déclarée muette', () => {
    const fautive = { ingredients: rizEtPoulet, instructions: ['Cuire le riz.', 'Poêler le poulet, servir.'] };
    expect(estMuette(fautive, RECIPE_INGREDIENTS)).toBe(true);
  });

  it('une DURÉE suffit à la sauver', () => {
    const corrigee = {
      ingredients: rizEtPoulet,
      instructions: ['Fais cuire le riz complet 25 minutes à couvert.', 'Poêle le poulet 4 minutes par face.'],
    };
    expect(estMuette(corrigee, RECIPE_INGREDIENTS)).toBe(false);
  });

  it('un REPÈRE SENSORIEL sans chiffre suffit aussi', () => {
    // « Fais griller jusqu'à ce que le pain soit ferme sous le doigt » est un meilleur
    // repère qu'une durée, et les vagues B1-B9 l'emploient : la sonde ne doit pas exiger
    // un chiffre là où la cuisine dit mieux avec un signe.
    const corrigee = {
      ingredients: rizEtPoulet,
      instructions: ['Cuis le riz jusqu’à ce qu’il soit tendre.', 'Poêle le poulet jusqu’à ce qu’il soit doré à cœur.'],
    };
    expect(estMuette(corrigee, RECIPE_INGREDIENTS)).toBe(false);
  });

  it('un assemblage à FROID n’est jamais muet, même en deux phrases', () => {
    const collation = {
      ingredients: [{ ref: 'skyr' }, { ref: 'myrtilles' }, { ref: 'amandes' }],
      instructions: ['Verse le skyr dans un bol.', 'Ajoute les myrtilles et les amandes concassées.'],
    };
    expect(cuissonRequise(collation, RECIPE_INGREDIENTS)).toBe(false);
    expect(estMuette(collation, RECIPE_INGREDIENTS)).toBe(false);
  });

  it('ajouter UNE recette muette au catalogue ferait dépasser le plafond', () => {
    const catalogueMute = [
      ...RAW_RECIPES,
      { ...RAW_RECIPES[0], id: 'rep999', ingredients: rizEtPoulet, instructions: ['Cuire le riz.'] },
    ];
    const n = catalogueMute.filter((r) => estMuette(r, RECIPE_INGREDIENTS)).length;
    expect(n).toBe(muettes.length + 1);
    expect(n).toBeGreaterThan(MUETTES_MAX);
  });
});
