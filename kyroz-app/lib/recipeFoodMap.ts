// ── Fusion base recettes ↔ base Ciqual ────────────────────────────────────────
//
// Lie chaque ingrédient de recette (clé `ref` de RECIPE_INGREDIENTS) à un aliment
// de la base Ciqual curée (cf. lib/foods.ts / foods.curation.ts). Quand un `ref`
// est mappé ici, ses macros viennent de Ciqual (source de vérité unique) → « une
// seule banane partout ». Les `ref` ABSENTS de cette table gardent leur valeur
// manuelle du JSON (Recette/recettes-kyroz.json).
//
// ⚠️ Mapping VÉRIFIÉ À LA MAIN (état cru/sec/cuit respecté). Ne pas auto-générer :
// le recoupement de noms se fait piéger (« maquereau » → « groseille à maquereau »).
// Les ids `ciqual-XXXX` = `alim_code` ANSES, stables d'une régénération à l'autre.
//
// ── Les 15 `ref` qui restent en valeur MANUELLE (2026-07-29) ────────────────────
// Règle appliquée : on ne mappe QUE si l'entrée Ciqual est SANS AMBIGUÏTÉ le même
// aliment. « À peu près pareil » = on garde la valeur manuelle (mieux vaut une
// estimation assumée qu'un faux aliment officiel).
//   • Absents de Ciqual : cottage_cheese, edamame, yaourt_soja, yaourt_soja_proteine.
//   • Compléments/produits Kyroz : whey, skyr, proteine_vegetale.
//   • Pas d'entrée SÈCHE propre (Ciqual n'a que la forme cuite/réhydratée) :
//     soja_texture (PST), haricots_noirs, millet (Ciqual n'a que la FARINE de millet).
//   • Produit voisin mais distinct : levure_maltee (Ciqual n'a que la levure de BIÈRE).
//   • Composites/mélanges par construction : fruits_rouges, legumes_wok, ratatouille.
//   • Pas d'entrée « sans gluten » : wrap_sans_gluten (Ciqual n'a qu'une tortilla de MAÏS,
//     qui n'est pas garantie sans blé — on ne mappe pas un « à peu près » sur du gluten).
export const REF_FOOD_ID: Record<string, string> = {
  // Viandes / poissons (basis cru)
  poulet_filet: 'ciqual-36017', dinde_escalope: 'ciqual-36304', boeuf_5: 'ciqual-6250',
  boeuf_bavette: 'ciqual-6212', porc_filet: 'ciqual-28204', jambon_blanc: 'ciqual-28902',
  saumon: 'ciqual-26036', saumon_fume: 'ciqual-26037', cabillaud: 'ciqual-26043',
  thon_frais: 'ciqual-26053', thon_naturel: 'ciqual-26039', maquereau: 'ciqual-26051',
  sardines: 'ciqual-26034', crevettes: 'ciqual-10007',
  // Œufs / produits laitiers
  oeuf_entier: 'ciqual-22000', blanc_oeuf: 'ciqual-22001', fromage_blanc_0: 'ciqual-19644',
  yaourt_grec: 'ciqual-19860', feta: 'ciqual-12060', mozzarella: 'ciqual-19590',
  parmesan: 'ciqual-12120', lait_demi_ecreme: 'ciqual-19033',
  // Végétal protéiné — ⚠️ légumineuses en SEC (l'utilisateur pèse à sec, comme riz/pâtes)
  tofu_ferme: 'ciqual-20904', tofu_soyeux: 'ciqual-20906', tempeh: 'ciqual-20917',
  seitan: 'ciqual-25598', lentilles_vertes: 'ciqual-20585', lentilles_corail: 'ciqual-20535',
  pois_chiches: 'ciqual-20516', haricots_rouges: 'ciqual-20525', // « …, sec »
  // Nouvelles légumineuses / pseudo-céréales sèches (2026-06-20)
  haricots_blancs: 'ciqual-20501', feves: 'ciqual-20518', pois_casses: 'ciqual-20515',
  sarrasin: 'ciqual-9380', chataigne: 'ciqual-15024', // châtaigne crue
  // (soja_texture, haricots_noirs, millet : pas d'entrée Ciqual sèche propre → valeur manuelle JSON)
  // Végétal protéiné PRÊT À CONSOMMER (2026-07-29) — poids servi = poids acheté, à l'inverse
  // des entrées sèches ci-dessus. Sans elles, une recette de 10 min aux pois chiches affichait
  // le poids SEC en liste de courses : non achetable pour un plat sans trempage ni cuisson.
  pois_chiches_conserve: 'ciqual-20532',    // « Pois chiche, appertisé, égoutté »
  haricots_rouges_conserve: 'ciqual-20524', // « Haricot rouge, appertisé, égoutté »
  lentilles_cuites: 'ciqual-20360',         // « Lentille, bouillie/cuite à l'eau (aliment moyen) » — Ciqual
                                            // n'a AUCUNE entrée appertisée pour la lentille, d'où le ref
                                            // nommé « cuites » (conserve ou sachet) et non « conserve ».
  tofu_fume: 'ciqual-20912',                // « Tofu fumé, préemballé »
  falafel: 'ciqual-25590',                  // « Falafel ou boulette de pois-chiche et/ou fève, préemballé »
  // Féculents (basis sec/cru)
  riz_basmati: 'ciqual-9119', riz_complet: 'ciqual-9102', flocons_avoine: 'ciqual-32140',
  quinoa: 'ciqual-9340', patate_douce: 'ciqual-4101', pomme_de_terre: 'ciqual-4008',
  pain_complet: 'ciqual-7110', pain_seigle: 'ciqual-7125', boulgour: 'ciqual-9690',
  semoule_couscous: 'ciqual-9610', galette_riz: 'ciqual-7352', pain_pita_complet: 'ciqual-7180',
  tortilla_complete: 'ciqual-7815', chapelure: 'ciqual-7500', // « Chapelure » (blé → gluten, cf. recipeDiet)
  pain_sans_gluten: 'ciqual-7130', // « Pain sans gluten, préemballé » — il n'existait AUCUN pain
                                   // sans gluten au catalogue : c'est la cause directe du pool
                                   // sans-gluten à 6 repas complets sur 170 au réglage 15 min.
  // (wrap_sans_gluten : Ciqual n'a pas d'entrée « tortilla sans gluten » — seulement une tortilla
  //  de maïs qui n'est PAS garantie sans blé → valeur manuelle JSON, calquée sur ciqual-7813.)
  // Pâtes / nouilles / polenta — entrées Ciqual « crues/sèches » (basis=dry respecté ; 2026-07-14)
  pates_semoule: 'ciqual-9810',      // « Pâtes sèches, standard, crues »
  pates_completes: 'ciqual-9870',    // « Pâtes sèches, au blé complet, crues »
  nouilles_completes: 'ciqual-9870', // même pâte de blé complet (Ciqual n'a pas d'entrée « nouilles » complètes ;
                                     // PAS 9863 « nouilles asiatiques au blé et aux ŒUFS » → fausserait le végétalien)
  nouilles_riz: 'ciqual-9900',       // « Vermicelles de riz sèches, crues » (corrige la protéine sous-estimée : 3 → 7,4 g)
  polenta: 'ciqual-9614',            // « Polenta ou semoule de maïs, précuite, à cuire »
  // Matières grasses / oléagineux / sucres
  avocat: 'ciqual-13004', huile_olive: 'ciqual-17270', lait_coco: 'ciqual-18041',
  lait_amande: 'ciqual-18107', // boisson à l'amande nature sans sucres (cf. lait_coco déjà mappé)
  graines_chia: 'ciqual-15047', beurre_cacahuete: 'ciqual-15202', amandes: 'ciqual-15041',
  noix: 'ciqual-15005', noisettes: 'ciqual-15004', olives: 'ciqual-13186',
  chocolat_noir: 'ciqual-31074', miel: 'ciqual-31008', sirop_erable: 'ciqual-31034',
  dattes: 'ciqual-13011', // « Datte, chair et peau, sans noyau, sèche » = dattes dénoyautées
  graines_courge: 'ciqual-15064',  // « Courge, graine, séchée » — ⚠️ PAS « courge butternut » (le piège de l'auto-matching)
  beurre_amande: 'ciqual-15041',   // purée d'amande = amandes broyées, macros identiques (Ciqual n'a pas d'entrée dédiée)
  pesto: 'ciqual-11179',           // « Sauce pesto, préemballée »
  creme_soja: 'ciqual-11214',      // « Préparation culinaire à base de soja, type "crème de soja" »
  cacao_poudre: 'ciqual-18100',    // « Cacao, sans sucres ajoutés, poudre soluble »
  tahini: 'ciqual-15203',          // « Tahin ou purée de sésame » — ⚠️ introduit le SÉSAME, allergène
                                   // qu'aucun champ ne porte aujourd'hui (cf. recipeDiet, note de fin)
  boisson_soja: 'ciqual-18900',    // « Boisson au soja, nature, non enrichie, préemballée » — PAS
                                   // l'aliment moyen 18113, qui mélange les versions sucrées/aromatisées
  // Fruits (basis cru)
  banane: 'ciqual-13005', mangue: 'ciqual-13025', ananas: 'ciqual-13002', kiwi: 'ciqual-13021',
  pomme: 'ciqual-13039', myrtilles: 'ciqual-13028', framboises: 'ciqual-13015',
  raisins: 'ciqual-13395', // « Raisin cru (aliment moyen) » — ⚠️ PAS « Raisin sec » (322 kcal vs 71)
  // Légumes
  brocoli: 'ciqual-20057', epinards: 'ciqual-20059', courgette: 'ciqual-20020',
  poivron: 'ciqual-20041', tomate: 'ciqual-20276', oignon: 'ciqual-20034',
  carotte: 'ciqual-20009', chou_fleur: 'ciqual-20016', asperges: 'ciqual-20279',
  salade_verte: 'ciqual-25604', concombre: 'ciqual-20019', roquette: 'ciqual-20217',
  betterave: 'ciqual-20003', champignons: 'ciqual-20056', haricots_verts: 'ciqual-20061',
  mais: 'ciqual-20066', petits_pois: 'ciqual-20036', sauce_soja: 'ciqual-11104',
  tomate_concassee: 'ciqual-20169', // « Tomate, chair, appertisée » (NON égouttée — la concassée garde son jus)
};

// ── Fibres (g/100 g) des 15 `ref` NON mappés à Ciqual ─────────────────────────
// Pour les ref mappés, les fibres viennent de la colonne Ciqual (cf. Food.fiber_g,
// résolu dans recipeData). Les 14 ci-dessous n'ont pas de food_id → valeur MANUELLE,
// estimée sur l'aliment Ciqual le plus proche (fibres = nudge/affichage, pas une macro
// énergétique → une approximation assumée suffit). Tout ref absent d'ici ET non mappé
// = 0 g. Garder aligné avec la liste des non-mappés (recipeData / REF_FOOD_ID).
export const REF_FIBER_MANUAL: Record<string, number> = {
  whey: 0, skyr: 0, cottage_cheese: 0,            // laitiers / protéines : ~0 fibre
  yaourt_soja: 0.6, yaourt_soja_proteine: 0.6,    // yaourts de soja : très peu
  proteine_vegetale: 5.5,                         // poudre protéinée pois/soja
  soja_texture: 15, haricots_noirs: 15.5,         // PST & haricots noirs SECS : très fibreux
  edamame: 5, millet: 3.5,                         // fève de soja / millet
  levure_maltee: 20,                              // levure maltée : très riche
  fruits_rouges: 4, legumes_wok: 2.5, ratatouille: 2, // mélanges (moyenne des composants)
  wrap_sans_gluten: 3.6,                          // calqué sur la tortilla de maïs (ciqual-7813)
};
