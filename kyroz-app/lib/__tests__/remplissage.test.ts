import { describe, it, expect } from 'vitest';
import { RAW_RECIPES, type RawRecipe } from '../recipeData';
import { goutRecette } from '../gout';

// ── PAS DE REMPLISSAGE DANS LES RECETTES ─────────────────────────────────────
//
// 🔴 LE DÉFAUT (relevé par le fondateur le 2026-09-14). Des ingrédients choisis pour
// fermer une macro et pas pour le plat : du beurre de cacahuète dans une dinde-riz-
// brocoli, 240 g de fromage blanc dans un sarrasin aux champignons, de la poudre
// protéinée délayée dans une polenta, 26 g de graines de courge sur un cabillaud.
// Chaque recette tenait ses macros ; aucune n'était un plat qu'on cuisine.
//
// La règle n'était écrite nulle part. L'inventaire a été fait sur tout le catalogue :
// 206 lignes relevées par les critères ci-dessous, JUGÉES une par une par le fondateur
// sur la page « Remplissage des recettes ». 138 étaient du remplissage et ont été
// réécrites, chaque remplacement mesuré au moteur. Les autres sont des plats qui
// existent (une tartine au fromage frais, une polenta aux œufs) : elles sont listées
// dans TOLERES, UNE PAR UNE, avec la raison donnée à la relecture.
//
// ⚠️ Ces critères ne DÉCIDENT pas : ils désignent ce qu'un humain doit regarder. Une
// recette nouvelle qui en déclenche un fait échouer la suite, et la sortie est d'écrire
// le plat autrement ou de l'ajouter à TOLERES avec sa raison — jamais d'élargir un
// critère pour la faire passer.

const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ANIMAL = new Set(['poulet_filet', 'dinde_escalope', 'boeuf_5', 'boeuf_bavette', 'jambon_blanc', 'saumon', 'saumon_fume',
  'cabillaud', 'thon_frais', 'thon_naturel', 'maquereau', 'sardines', 'crevettes', 'oeuf_entier', 'blanc_oeuf']);
const LAITAGE = new Set(['fromage_blanc_0', 'skyr', 'cottage_cheese', 'yaourt_grec', 'yaourt_soja_proteine']);
const LEGUMINEUSES = new Set(['lentilles_corail', 'lentilles_cuites', 'pois_chiches_conserve', 'haricots_rouges_conserve',
  'haricots_blancs_conserve', 'haricots_noirs_conserve', 'feves', 'pois_casses', 'edamame']);
const FECULENT_BASE = new Set(['pates_completes', 'pates_semoule', 'semoule_couscous', 'polenta', 'boulgour', 'quinoa',
  'pomme_de_terre', 'patate_douce', 'riz_basmati', 'riz_complet', 'millet', 'sarrasin', 'tortilla_complete', 'wrap_sans_gluten']);
const FRUITS = new Set(['banane', 'myrtilles', 'framboises', 'fruits_rouges', 'pomme', 'mangue', 'ananas', 'kiwi', 'raisins', 'dattes']);

interface Candidat { cle: string; critere: string }

/** Les critères de l'inventaire du 2026-09-14, à l'identique. */
export function candidats(r: RawRecipe): Candidat[] {
  const out: Candidat[] = [];
  // `goutRecette` ne lit que les `ref` : on lui passe la recette brute sous la forme qu'il attend.
  const g = goutRecette({ ingredients: r.ingredients.map((i) => ({ name: i.ref, quantity_g: i.qty, ref: i.ref })) });
  const sale = g !== 'sucre';
  const refs = new Set<string>(r.ingredients.map((i) => i.ref));
  const nom = n(r.name);
  const ajoute = (ref: string, critere: string) => out.push({ cle: `${r.id}|${ref}`, critere });
  for (const { ref, qty } of r.ingredients) {
    if ((ref === 'beurre_cacahuete' || ref === 'beurre_amande') && sale) ajoute(ref, 'purée d’oléagineux dans un plat salé');
    if ((ref === 'graines_courge' || ref === 'graines_chia') && sale) ajoute(ref, 'graines dans un plat salé');
    else if ((ref === 'graines_courge' || ref === 'graines_chia') && qty > 15 && !/chia|pudding/.test(nom)) ajoute(ref, 'graines en grosse quantité');
    if (['amandes', 'noisettes', 'noix', 'graines_courge', 'graines_chia', 'olives', 'parmesan', 'huile_olive'].includes(ref) && qty < 5) ajoute(ref, 'quantité décorative (< 5 g)');
    if (LAITAGE.has(ref) && sale && qty >= 100) ajoute(ref, 'laitage de 100 g ou plus dans un plat salé');
    if ((ref === 'whey' || ref === 'proteine_vegetale') && sale) ajoute(ref, 'poudre protéinée dans un plat salé');
    if (ref === 'tahini' && ([...refs].some((x) => ANIMAL.has(x) || LAITAGE.has(x)) || g === 'sucre')) ajoute(ref, 'tahini avec viande, poisson, œuf, laitage ou sucré');
    if (ref === 'soja_texture' && [...refs].some((x) => LEGUMINEUSES.has(x))) ajoute(ref, 'soja texturé ajouté à des légumineuses');
    if (FRUITS.has(ref) && g === 'mixte') ajoute(ref, 'fruit dans un plat salé');
    if (['amandes', 'noisettes', 'noix'].includes(ref) && sale && qty >= 5) ajoute(ref, 'oléagineux dans un plat salé');
    if (ref === 'lait_coco' && sale && !/coco|curry|dahl|thai|pad/.test(nom)) ajoute(ref, 'lait de coco hors curry');
    if (ref === 'creme_soja' && !/crem|creme|gratin|risotto|carbonara/.test(nom)) ajoute(ref, 'crème de soja sans plat crémeux');
    if (ref === 'blanc_oeuf' && qty >= 100 && [...refs].some((x) => FECULENT_BASE.has(x)) && !/omelette|brouill|frittata|pancake|pain perdu|hachis/.test(nom)) ajoute(ref, 'blancs d’œufs en protéine de féculent');
    if (ref === 'avocat' && (g === 'sucre' || r.category === 'repas_complet' && /soupe|curry|dahl|risotto|polenta/.test(nom))) ajoute(ref, 'avocat hors contexte');
  }
  return out;
}

/**
 * Plats jugés LÉGITIMES à la relecture du fondateur (2026-09-14), un par un, avec la raison
 * donnée ce jour-là. Clé : `id|ref`.
 */
const TOLERES: Record<string, string> = {
  'col03|cottage_cheese': '⚠️ À JUGER : le retrait de l’ananas rend ce plat salé, la ligne n’a jamais été présentée',
  'col03|noix': '⚠️ À JUGER : le retrait de l’ananas rend ce plat salé, la ligne n’a jamais été présentée',
  'col104|lait_coco': 'Nouilles de riz au coco : registre asiatique',
  'col106|graines_courge': 'Garniture, 10 g',
  'col109|creme_soja': 'Mousse de tofu : la crème fait la texture',
  'col112|graines_courge': 'Garniture, 7 g',
  'col115|huile_olive': 'Vinaigrette',
  'col116|graines_courge': 'Garniture, 7 g (le plat, lui, est à revoir)',
  'col117|cottage_cheese': 'Tartine au fromage frais',
  'col118|fromage_blanc_0': 'Fromage blanc aux herbes en trempette',
  'col120|tahini': 'Filet de tahini en assaisonnement',
  'col19|cottage_cheese': 'Tartine au fromage frais',
  'col19|huile_olive': 'Filet d\'huile',
  'col29|cottage_cheese': 'Tartine au fromage frais',
  'col36|cottage_cheese': 'Galettes de riz au fromage frais',
  'col40|huile_olive': 'Filet d\'huile sur les edamame',
  'col57|cottage_cheese': 'Galettes de riz au fromage frais',
  'col65|huile_olive': 'Vinaigrette',
  'col67|graines_courge': '5 g sur une tartine',
  'col68|tahini': 'Tartine tahini et raisins : ça existe',
  'col74|fromage_blanc_0': 'tartine avocat et fromage frais, jugée légitime à la relecture ; devenue salée sans le kiwi',
  'col76|fromage_blanc_0': 'Sauce au fromage blanc des falafels',
  'col76|tahini': 'Sauce au sésame des falafels',
  'col77|graines_courge': 'Mélange apéritif pois chiches grillés et graines',
  'pd08|cottage_cheese': 'Tartine au fromage frais : ça existe',
  'pd114|creme_soja': 'Un trait de crème dans une brouillade',
  'pd119|graines_courge': 'Garniture, 10 g',
  'pd125|fromage_blanc_0': 'Tartine saumon fumé et fromage blanc',
  'pd40|cottage_cheese': 'Tartine saumon fumé et fromage frais',
  'pd55|avocat': 'Smoothie mangue-avocat : ça existe',
  'pd84|huile_olive': 'Filet d\'huile',
  'pd91|blanc_oeuf': 'Pommes de terre sautées et œufs brouillés',
  'pd93|graines_courge': 'Garniture, 10 g',
  'pd96|tahini': 'Bol sucré au tahini : ça existe',
  'pd97|huile_olive': 'Filet d\'huile',
  'rep112|graines_courge': 'Graines sur une soupe, avec les croûtons',
  'rep129|beurre_cacahuete': 'Nouilles sautées tofu-cacahuète : ça existe',
  'rep136|creme_soja': 'Œufs cocotte à la crème : classique',
  'rep146|graines_courge': 'Garniture de salade, 12 g',
  'rep148|beurre_cacahuete': 'Curry cacahuète : ça existe',
  'rep164|beurre_cacahuete': 'Bo bun : la cacahuète en fait partie',
  'rep173|amandes': 'Semoule aux amandes : registre marocain',
  'rep175|tahini': 'Chou-fleur rôti au tahini : classique',
  'rep176|graines_courge': 'Garniture, 10 g',
  'rep177|creme_soja': 'Sauce crème avec du saumon fumé : ça existe',
  'rep187|graines_courge': 'Garniture, 10 g',
  'rep191|amandes': 'Haricots verts amandine : classique',
  'rep192|graines_courge': 'garniture de 8 g sur une salade de millet : proposition validée à la relecture',
  'rep210|graines_courge': 'Garniture, 11 g',
  'rep216|amandes': 'Poisson aux amandes : ça existe',
  'rep218|creme_soja': 'Pâtes crémeuses à la dinde : ça existe',
  'rep232|amandes': 'Couscous aux amandes : registre marocain',
  'rep238|amandes': 'haricots verts aux amandes : proposition validée à la relecture',
  'rep243|blanc_oeuf': 'Pommes de terre et œufs brouillés : ça existe',
  'rep24|beurre_cacahuete': 'Pad thaï : la cacahuète fait le plat',
  'rep251|tahini': 'Volaille sauce sésame : registre libanais',
  'rep253|avocat': 'Thon, avocat et asperges : une assiette qui existe',
  'rep258|creme_soja': 'Sauce crème, 25 g',
  'rep265|blanc_oeuf': 'Polenta aux œufs',
  'rep275|tahini': 'Sauce tahini du chou-fleur rôti',
  'rep27|amandes': 'Poulet aux amandes : plat classique',
  'rep283|huile_olive': 'Huile de cuisson',
  'rep284|graines_courge': 'Garniture de salade',
  'rep44|creme_soja': 'Pâtes au saumon à la crème : classique',
  'rep55|graines_courge': 'Garniture d\'un bowl, 10 g',
  'rep83|ananas': 'Poulet à l\'ananas : classique',
};

/**
 * Soja texturé ajouté à des légumineuses : laissé EN ATTENTE par le fondateur (« on remplace le
 * soja après »), pour être remplacé par les aliments de la liste végétale (D32). Ne peut que
 * diminuer.
 */
const SOJA_EN_ATTENTE = new Set<string>([
  'rep101|soja_texture',
  'rep102|soja_texture',
  'rep103|soja_texture',
  'rep104|soja_texture',
  'rep105|soja_texture',
  'rep106|soja_texture',
  'rep107|soja_texture',
  'rep108|soja_texture',
  'rep111|soja_texture',
  'rep114|soja_texture',
  'rep118|soja_texture',
  'rep121|soja_texture',
  'rep126|soja_texture',
  'rep145|soja_texture',
  'rep147|soja_texture',
  'rep149|soja_texture',
  'rep151|soja_texture',
  'rep159|soja_texture',
  'rep170|soja_texture',
  'rep273|soja_texture',
  'rep66|soja_texture',
  'rep82|soja_texture',
  'rep88|soja_texture',
  'rep91|soja_texture',
  'rep94|soja_texture',
  'rep99|soja_texture',
]);

describe('pas de remplissage dans les recettes', () => {
  const tous = RAW_RECIPES.flatMap(candidats);

  it('aucun ingrédient de remplissage hors des plats jugés légitimes', () => {
    const fautes = tous.filter((c) => !TOLERES[c.cle] && !SOJA_EN_ATTENTE.has(c.cle));
    expect(fautes.map((c) => `${c.cle} (${c.critere})`), 'ingrédient choisi pour la macro et pas pour le plat').toEqual([]);
  });

  it('le soja texturé glissé dans des légumineuses ne peut que DIMINUER', () => {
    const restants = tous.filter((c) => SOJA_EN_ATTENTE.has(c.cle)).length;
    expect(restants).toBeLessThanOrEqual(SOJA_EN_ATTENTE.size);
  });

  it('chaque tolérance vise un cas qui existe encore', () => {
    const vus = new Set(tous.map((c) => c.cle));
    const mortes = [...Object.keys(TOLERES), ...SOJA_EN_ATTENTE].filter((k) => !vus.has(k));
    expect(mortes, 'tolérance périmée : la recette ne déclenche plus le critère, retire-la').toEqual([]);
  });

  // Témoin : un garde-fou qu'on n'a jamais vu rougir ne garde rien. Le cas réel qui a
  // tout déclenché, rejoué sur une recette fabriquée.
  it('témoin : du beurre de cacahuète dans une dinde-riz-brocoli est attrapé', () => {
    const cobaye = {
      ...RAW_RECIPES.find((r) => r.category === 'repas_complet')!, id: 'test01', name: 'Dinde au riz et brocoli',
      ingredients: [
        { ref: 'dinde_escalope', qty: 150, macro_role: 'protein' as const, scalable: true },
        { ref: 'riz_complet', qty: 80, macro_role: 'carb' as const, scalable: true },
        { ref: 'brocoli', qty: 120, macro_role: 'vegetable' as const, scalable: false },
        { ref: 'beurre_cacahuete', qty: 25, macro_role: 'fat' as const, scalable: true },
      ],
    };
    expect(candidats(cobaye).map((c) => c.cle)).toContain('test01|beurre_cacahuete');
  });
});
