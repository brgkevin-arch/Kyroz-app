import { describe, it, expect } from 'vitest';
import { RAW_RECIPES } from '../recipeData';

/**
 * ── Des étapes RÉDIGÉES, pas des notes de cuisine (2026-10-01) ──────────────
 *
 * Relevé en lisant les fiches comme un utilisateur : au milieu d’un catalogue écrit au
 * tutoiement (« Fais cuire le riz 11 minutes… »), 98 recettes gardaient des étapes à
 * l’infinitif (« Cuire le riz. ») ou en sténo (« Œuf poché dessus + parmesan. »). Deux
 * voix dans la même app, et la seconde se lit comme un brouillon.
 *
 * 152 étapes à l’infinitif et 25 « + » réécrites (131 recettes, mêmes ids, même
 * composition) : impératif, phrases complètes, durées ajoutées là où il n’y en avait pas.
 * Le compteur vaut ZÉRO et doit y rester : une vague de recettes qui en réintroduit
 * fait échouer la suite.
 *
 * ⚠️ Ce test lit la FORME d’une étape, pas son fond. Qu’elle donne un repère de cuisson
 * est l’affaire de `instructionsMuettes.test.ts` ; qu’elle ne cite que des ingrédients
 * de la recette, celle de `ingredientsCites.test.ts`.
 */
const INFINITIF = new RegExp(
  '^(?:cuire|ajouter|mélanger|servir|garnir|mixer|verser|incorporer|tartiner|écraser'
  + '|émietter|faire|laisser|couper|griller|poêler|rôtir|napper|disposer|émincer|nacrer'
  + '|mouiller|finir|dresser|lier|former|parsemer|saupoudrer|réfrigérer|égoutter|rincer'
  + '|déposer|répartir|assembler|fouetter|battre|chauffer|réchauffer|saisir|dorer|râper'
  + '|presser|tremper|étaler|monter|réserver|sécher|hacher|trancher|arroser|assaisonner'
  + '|saler|poivrer|accompagner|terminer|remplir|rouler|plier|glisser|placer|poser'
  + '|retourner|mettre|porter)(?![\\p{L}-])',
  'iu',
);
/** « riz + poulet », ou un « + » qui finit la phrase. */
const PLUS = /\s\+\s|\+\s*$/;

const telegraphique = (etape: string) => INFINITIF.test(etape.trim()) || PLUS.test(etape);

describe('étapes de recettes — rédigées au tutoiement', () => {
  it('la sonde sait dire OUI, puis NON', () => {
    expect(telegraphique('Cuire le riz.')).toBe(true);
    expect(telegraphique('Ajouter crevettes et courgette, finir au citron.')).toBe(true);
    expect(telegraphique('Œuf poché dessus + parmesan.')).toBe(true);
    expect(telegraphique('Fais cuire le riz basmati 11 minutes.')).toBe(false);
    expect(telegraphique('Ajoute les noix et sers.')).toBe(false);
    expect(telegraphique('Mixe la whey, la banane et le lait.')).toBe(false);
  });

  it('aucune étape à l’infinitif ni en « + »', () => {
    const fautives = RAW_RECIPES.flatMap((r) =>
      r.instructions.filter(telegraphique).map((s) => `${r.id} « ${r.name} » : ${s}`),
    );
    expect(
      fautives,
      `${fautives.length} étape(s) télégraphique(s) : écris-les à l’impératif, en phrase complète :\n  `
      + fautives.slice(0, 12).join('\n  '),
    ).toEqual([]);
  });
});

/**
 * ── Et sans mot en CAPITALES (2026-10-04) ────────────────────────────────────
 *
 * Relevé au troisième tour de l’app : dix recettes écrivaient « feu DOUX », « poêle
 * FROIDE », « HORS DU FEU ». Une consigne qui compte se dit par sa raison (« chauffé plus
 * longtemps il durcit »), pas en criant ; et dans une fiche lue en cuisinant, des capitales
 * se lisent comme une alerte. Le compteur vaut zéro : aucune étape n’en a besoin.
 */
const CRIE = /(?<!\p{L})\p{Lu}{2,}(?!\p{L})/u;

describe('étapes de recettes — sans mot en capitales', () => {
  it('la sonde sait dire OUI, puis NON', () => {
    expect(CRIE.test('Mets sur feu DOUX et remue.')).toBe(true);
    expect(CRIE.test('Verse-les brûlantes dans la poêle, HORS DU FEU.')).toBe(true);
    expect(CRIE.test('Mets sur feu doux et remue.')).toBe(false);
    // Une majuscule d’initiale n’est pas un cri, même accentuée.
    expect(CRIE.test('Égoutte les pâtes. Sers aussitôt.')).toBe(false);
  });

  it('aucune étape ne met un mot en capitales', () => {
    const fautives = RAW_RECIPES.flatMap((r) =>
      r.instructions.filter((s) => CRIE.test(s)).map((s) => `${r.id} « ${r.name} » : ${s}`),
    );
    expect(fautives, `${fautives.length} étape(s) en capitales :\n  ${fautives.slice(0, 12).join('\n  ')}`).toEqual([]);
  });
});
