import { DietaryRestriction } from './types';

const ALL: DietaryRestriction[] = ['vegetarian', 'pescatarian', 'no_pork', 'lactose_free', 'gluten_free', 'vegan', 'halal'];

// Pour chaque ref, la liste des restrictions qu'il EMPÊCHE (incompatibilités).
// Tout ref absent d'ici = compatible avec tout (légumes, fruits, huile…).
// Règle vegan : tout produit animal (viande, poisson, œuf, laitier, miel) viole 'vegan'.
// Règle halal : seul le PORC/la charcuterie violent 'halal' ici (le catalogue n'a ni
// alcool ni gélatine). On assume la viande non-porc sourcée halal par l'utilisateur —
// on ne certifie pas l'abattage, on exclut les ingrédients interdits.
const VIOLATIONS: Record<string, DietaryRestriction[]> = {
  // viandes terrestres → pas végé, pas pesc, pas vegan
  poulet_filet: ['vegetarian', 'pescatarian', 'vegan'], dinde_escalope: ['vegetarian', 'pescatarian', 'vegan'],
  boeuf_5: ['vegetarian', 'pescatarian', 'vegan'], boeuf_bavette: ['vegetarian', 'pescatarian', 'vegan'],
  porc_filet: ['vegetarian', 'pescatarian', 'no_pork', 'vegan', 'halal'], jambon_blanc: ['vegetarian', 'pescatarian', 'no_pork', 'vegan', 'halal'],
  // poissons / fruits de mer → pas végé, pas vegan (pesc OK)
  saumon: ['vegetarian', 'vegan'], saumon_fume: ['vegetarian', 'vegan'], cabillaud: ['vegetarian', 'vegan'], thon_frais: ['vegetarian', 'vegan'],
  thon_naturel: ['vegetarian', 'vegan'], maquereau: ['vegetarian', 'vegan'], sardines: ['vegetarian', 'vegan'], crevettes: ['vegetarian', 'vegan'],
  // œufs → ovo-végétarien OK, mais pas vegan
  oeuf_entier: ['vegan'], blanc_oeuf: ['vegan'],
  // laitiers → pas sans lactose, pas vegan
  skyr: ['lactose_free', 'vegan'], fromage_blanc_0: ['lactose_free', 'vegan'], yaourt_grec: ['lactose_free', 'vegan'],
  cottage_cheese: ['lactose_free', 'vegan'], whey: ['lactose_free', 'vegan'], lait_demi_ecreme: ['lactose_free', 'vegan'],
  mozzarella: ['lactose_free', 'vegan'], feta: ['lactose_free', 'vegan'], parmesan: ['lactose_free', 'vegan'],
  // pesto → mappé sur « Sauce pesto, préemballée » (ciqual-11179), qui est une sauce au
  // FROMAGE. Même traitement que parmesan/feta : casse lactose_free et vegan, pas
  // vegetarian (la question de la présure animale se tranche pour les trois d'un coup).
  pesto: ['lactose_free', 'vegan'],
  // miel → produit de la ruche : pas vegan (végétarien/pescatarien OK)
  miel: ['vegan'],
  // gluten → pas sans gluten (avoine = non certifiée ; sauce soja = blé ; seitan = blé mais végétal)
  flocons_avoine: ['gluten_free'], pain_complet: ['gluten_free'], pain_seigle: ['gluten_free'],
  pates_completes: ['gluten_free'], pates_semoule: ['gluten_free'], nouilles_completes: ['gluten_free'],
  boulgour: ['gluten_free'], semoule_couscous: ['gluten_free'], tortilla_complete: ['gluten_free'],
  pain_pita_complet: ['gluten_free'], seitan: ['gluten_free'], sauce_soja: ['gluten_free'],
  chapelure: ['gluten_free'], // panure de blé → un cabillaud pané n'est PAS sans gluten
  // levure maltée : le malt est de l'ORGE. Les marques varient (mélasse de betterave
  // chez certaines), donc c'est incertain — et sur le gluten l'incertitude se tranche
  // en excluant, comme pour l'avoine non certifiée : un faux négatif retire une recette,
  // un faux positif sert du gluten à un cœliaque.
  levure_maltee: ['gluten_free'],
  // falafel prêt à consommer : liant à la farine de blé sur la plupart des références
  // industrielles. Même arbitrage prudent que ci-dessus.
  falafel: ['gluten_free'],
  // ── Simili-carnés végétaux (2026-09-10) ────────────────────────────────────
  // Tous VÉGANES (entrées Ciqual qui le déclarent, ou soja seul) : aucun ne viole
  // vegan/vegetarian/pescatarian/halal/lactose_free. Le seul axe qui les sépare est
  // le GLUTEN, et c'est celui qui décide de leur utilité :
  //   • 4 sur 7 sont au BLÉ — ils n'ouvrent rien au créneau vegan+sans gluten, qui
  //     est justement le plus pauvre du catalogue (12 repas complets servables à une
  //     femme de 55 kg en sèche). Ils servent le vegan tout court.
  //   • 3 sur 7 sont au soja seul (steak_soja, hache_vegetal, saucisse_vegetale) :
  //     eux seuls atteignent vegan+SG, et ce sont les moins protéinés des sept.
  // `boulette_vegetale` est déclarée au gluten par PRUDENCE : Ciqual dit « soja
  // ET/OU blé », donc la composition n'est pas tranchée — même arbitrage que
  // l'avoine non certifiée et la levure maltée (un faux négatif retire une recette,
  // un faux positif sert du gluten à un cœliaque).
  emince_vegetal: ['gluten_free'], galette_vegetale: ['gluten_free'],
  nuggets_vegetal: ['gluten_free'], boulette_vegetale: ['gluten_free'],
  // note : tofu/tempeh/quinoa/riz/maïs/polenta/nouilles_riz/galette_riz = sans gluten ;
  // lait_amande/lait_coco/creme_soja/boisson_soja = NON laitiers (compatibles lactose_free) ;
  // tahini = sésame → allergène, mais aucun des 7 régimes ne l'exclut (cf. champ allergènes, absent).
};

/** Régimes compatibles avec un ensemble de refs (= aucun ref ne les viole). */
export function restrictionsOkFor(refs: string[]): DietaryRestriction[] {
  const violated = new Set<DietaryRestriction>();
  for (const ref of refs) for (const v of VIOLATIONS[ref] ?? []) violated.add(v);
  return ALL.filter((r) => !violated.has(r));
}
