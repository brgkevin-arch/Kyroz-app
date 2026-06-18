import { DietaryRestriction } from './types';

const ALL: DietaryRestriction[] = ['vegetarian', 'pescatarian', 'no_pork', 'lactose_free', 'gluten_free', 'vegan'];

// Pour chaque ref, la liste des restrictions qu'il EMPÊCHE (incompatibilités).
// Tout ref absent d'ici = compatible avec tout (légumes, fruits, huile…).
// Règle vegan : tout produit animal (viande, poisson, œuf, laitier, miel) viole 'vegan'.
const VIOLATIONS: Record<string, DietaryRestriction[]> = {
  // viandes terrestres → pas végé, pas pesc, pas vegan
  poulet_filet: ['vegetarian', 'pescatarian', 'vegan'], dinde_escalope: ['vegetarian', 'pescatarian', 'vegan'],
  boeuf_5: ['vegetarian', 'pescatarian', 'vegan'], boeuf_bavette: ['vegetarian', 'pescatarian', 'vegan'],
  porc_filet: ['vegetarian', 'pescatarian', 'no_pork', 'vegan'], jambon_blanc: ['vegetarian', 'pescatarian', 'no_pork', 'vegan'],
  // poissons / fruits de mer → pas végé, pas vegan (pesc OK)
  saumon: ['vegetarian', 'vegan'], saumon_fume: ['vegetarian', 'vegan'], cabillaud: ['vegetarian', 'vegan'], thon_frais: ['vegetarian', 'vegan'],
  thon_naturel: ['vegetarian', 'vegan'], maquereau: ['vegetarian', 'vegan'], sardines: ['vegetarian', 'vegan'], crevettes: ['vegetarian', 'vegan'],
  // œufs → ovo-végétarien OK, mais pas vegan
  oeuf_entier: ['vegan'], blanc_oeuf: ['vegan'],
  // laitiers → pas sans lactose, pas vegan
  skyr: ['lactose_free', 'vegan'], fromage_blanc_0: ['lactose_free', 'vegan'], yaourt_grec: ['lactose_free', 'vegan'],
  cottage_cheese: ['lactose_free', 'vegan'], whey: ['lactose_free', 'vegan'], lait_demi_ecreme: ['lactose_free', 'vegan'],
  mozzarella: ['lactose_free', 'vegan'], feta: ['lactose_free', 'vegan'], parmesan: ['lactose_free', 'vegan'],
  // miel → produit de la ruche : pas vegan (végétarien/pescatarien OK)
  miel: ['vegan'],
  // gluten → pas sans gluten (avoine = non certifiée ; sauce soja = blé ; seitan = blé mais végétal)
  flocons_avoine: ['gluten_free'], pain_complet: ['gluten_free'], pain_seigle: ['gluten_free'],
  pates_completes: ['gluten_free'], pates_semoule: ['gluten_free'], nouilles_completes: ['gluten_free'],
  boulgour: ['gluten_free'], semoule_couscous: ['gluten_free'], tortilla_complete: ['gluten_free'],
  pain_pita_complet: ['gluten_free'], seitan: ['gluten_free'], sauce_soja: ['gluten_free'],
  // note : tofu/tempeh/quinoa/riz/maïs/polenta/nouilles_riz/galette_riz = sans gluten ;
  // lait_amande/lait_coco/creme_soja = NON laitiers (compatibles lactose_free).
};

/** Régimes compatibles avec un ensemble de refs (= aucun ref ne les viole). */
export function restrictionsOkFor(refs: string[]): DietaryRestriction[] {
  const violated = new Set<DietaryRestriction>();
  for (const ref of refs) for (const v of VIOLATIONS[ref] ?? []) violated.add(v);
  return ALL.filter((r) => !violated.has(r));
}
