import { DietaryRestriction } from './types';

const ALL: DietaryRestriction[] = ['vegetarian', 'pescatarian', 'no_pork', 'lactose_free', 'gluten_free'];

// Pour chaque ref, la liste des restrictions qu'il EMPÊCHE (incompatibilités).
// Tout ref absent d'ici = compatible avec tout (légumes, fruits, huile…).
const VIOLATIONS: Record<string, DietaryRestriction[]> = {
  // viandes terrestres → pas végé, pas pesc
  poulet_filet: ['vegetarian', 'pescatarian'], dinde_escalope: ['vegetarian', 'pescatarian'],
  boeuf_5: ['vegetarian', 'pescatarian'], boeuf_bavette: ['vegetarian', 'pescatarian'],
  porc_filet: ['vegetarian', 'pescatarian', 'no_pork'], jambon_blanc: ['vegetarian', 'pescatarian', 'no_pork'],
  // poissons / fruits de mer → pas végé (pesc OK)
  saumon: ['vegetarian'], saumon_fume: ['vegetarian'], cabillaud: ['vegetarian'], thon_frais: ['vegetarian'],
  thon_naturel: ['vegetarian'], maquereau: ['vegetarian'], sardines: ['vegetarian'], crevettes: ['vegetarian'],
  // laitiers → pas sans lactose
  skyr: ['lactose_free'], fromage_blanc_0: ['lactose_free'], yaourt_grec: ['lactose_free'],
  cottage_cheese: ['lactose_free'], whey: ['lactose_free'], lait_demi_ecreme: ['lactose_free'],
  mozzarella: ['lactose_free'], feta: ['lactose_free'], parmesan: ['lactose_free'],
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
