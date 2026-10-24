/**
 * COMBIEN DE TEMPS UN ALIMENT TIENT, ALIMENT PAR ALIMENT (2026-10-24).
 *
 * Demande du fondateur : *« je veux que l'user ne jette rien »*, avec *« une table sourcée et
 * plus précise pour les DLC »* — et la part de l'utilisateur : *« il congèle ce qu'il peut, on
 * ne pourra pas tout sauver »*. Le moteur s'en sert pour faire reprendre les restes de la
 * semaine d'avant par le plan suivant TANT QU'ILS TIENNENT (`lib/restesSemaine.ts`) ; ce qui ne
 * tiendra pas jusque-là est à congeler, s'il se congèle.
 *
 * Les durées sont celles des GUIDES de conservation, prudentes, à défaut de lire l'étiquette :
 * 🔴 **la DLC imprimée fait toujours foi**. Une DLC est fixée par le fabricant (par exemple
 * 10 jours de vie totale pour un filet de poulet sous atmosphère [12]) ; l'app ne sait pas ce
 * qu'il en reste au moment de l'achat. Elle prend donc la borne BASSE des sources.
 *
 * Chaque ligne : jours au frigo depuis l'achat, emballage FERMÉ ; jours une fois ENTAMÉ (absent
 * = la même chose) ; congélation à la maison et durée ; sources (`SOURCES_DUREE`). Un `ferme`
 * à `null` = aucune durée publique : seule l'étiquette le dit, et le moteur applique
 * `FERME_PAR_DEFAUT`, prudence NON sourcée, signalée comme telle dans la fiche.
 *
 * Fichier pur, sans import : lu par le moteur, la mesure et le générateur de la fiche
 * (`scripts/gen-duree-de-vie.ts` → `docs/2026-10-24-duree-de-vie.md`).
 */

/** Une durée : [borne basse, borne haute] en jours, telles que les sources la donnent. */
export type Jours = readonly [number, number];

export interface DureeDeVie {
  /** Au frigo depuis l'achat, emballage fermé. `null` = seule l'étiquette le dit. */
  ferme: Jours | null;
  /** Une fois entamé. Absent = comme fermé. */
  entame?: Jours;
  /** Se congèle à la maison : `true`, `false`, ou `null` quand aucune source ne le dit. */
  congeler: boolean | null;
  /** Mois au congélateur (pour la qualité ; à −18 °C, la sécurité ne s'arrête pas [2]). */
  mois?: Jours;
  sources: readonly number[];
  /** Ce que la source dit en plus, ou pourquoi ce choix. */
  note?: string;
}

/** Sans durée publique (similis, betterave sous vide…) : une semaine au plus, par prudence. NON SOURCÉ. */
export const FERME_PAR_DEFAUT = 7;

/** Vendus surgelés : ils tiennent au congélateur, ils ne sont jamais un reste à sauver. */
export const SURGELES: readonly string[] = ['edamame', 'fruits_rouges', 'legumes_wok', 'petits_pois'];

const j = (a: number, b: number = a): Jours => [a, b];

export const DUREE_DE_VIE: Record<string, DureeDeVie> = {
  // ── Viandes ────────────────────────────────────────────────────────────────
  poulet_filet: { ferme: j(1, 2), entame: j(2), congeler: true, mois: j(9), sources: [1, 2, 3] },
  dinde_escalope: { ferme: j(1, 2), entame: j(2), congeler: true, mois: j(9), sources: [1, 2, 3] },
  boeuf_5: {
    ferme: j(1, 2), entame: j(0, 1), congeler: true, mois: j(3, 4), sources: [1, 2, 3],
    note: 'haché : 24 h une fois ouvert [3], « le jour de l\'ouverture » sur les barquettes',
  },
  boeuf_bavette: { ferme: j(3, 5), entame: j(2), congeler: true, mois: j(4, 12), sources: [1, 2, 3] },
  porc_filet: { ferme: j(3, 5), entame: j(2), congeler: true, mois: j(4, 12), sources: [1, 2, 3] },
  jambon_blanc: {
    ferme: j(14), entame: j(1, 4), congeler: true, mois: j(1, 2), sources: [1, 3, 4, 8],
    note: 'entamé : 24 h à 2 jours selon les marques [8], 3 à 4 jours [3] ; FoodKeeper donne 1 à 2 mois au congélateur, mais le déconseille pour la texture',
  },
  // ── Poissons et crustacés ──────────────────────────────────────────────────
  saumon: { ferme: j(1, 2), entame: j(1), congeler: true, mois: j(2, 3), sources: [1, 2, 3], note: 'poisson cru : 18 à 24 h [3]' },
  cabillaud: { ferme: j(1, 2), entame: j(1), congeler: true, mois: j(6, 8), sources: [1, 2, 3] },
  thon_frais: { ferme: j(1, 2), entame: j(1), congeler: true, mois: j(2, 3), sources: [1, 2, 3] },
  maquereau: { ferme: j(1, 2), entame: j(1), congeler: true, mois: j(2, 3), sources: [1, 2, 3], note: 'frais ; fumé, il tiendrait comme le saumon fumé' },
  saumon_fume: {
    ferme: j(21, 30), entame: j(1, 6), congeler: true, mois: j(9, 12), sources: [1, 5],
    note: 'entamé : 24 h (Delpeyrat), 48 h (Pomona), 6 jours (Côte Sauvage) [5]',
  },
  crevettes: {
    ferme: j(1, 3), entame: j(1), congeler: false, sources: [1, 3, 13],
    note: 'souvent vendues décongelées : ne pas recongeler [13]',
  },
  // ── Œufs et produits laitiers ──────────────────────────────────────────────
  oeuf_entier: {
    ferme: j(21, 35), congeler: false, sources: [1, 2, 3, 4],
    note: 'pas en coquille ; battus, 12 mois [2]',
  },
  blanc_oeuf: { ferme: j(7), entame: j(2, 4), congeler: true, mois: j(12), sources: [1, 3], note: 'blanc cru : 1 semaine, à cuire [3]' },
  skyr: { ferme: j(7, 14), congeler: true, mois: j(1, 2), sources: [1, 3, 4], note: 'yaourt : consommable une à deux semaines après la DLC [4] ; congelé, la texture change' },
  fromage_blanc_0: { ferme: j(7, 10), congeler: true, mois: j(1, 2), sources: [1, 11], note: 'FoodKeeper « quark » ; environ 7 jours [11] ; congelé, la texture change' },
  yaourt_grec: { ferme: j(7, 14), congeler: true, mois: j(1, 2), sources: [1, 4] },
  cottage_cheese: { ferme: j(14), entame: j(7), congeler: null, sources: [1] },
  mozzarella: { ferme: j(7, 14), entame: j(5, 7), congeler: null, sources: [1, 6, 11], note: 'dans son liquide, en boîte fermée [6]' },
  feta: { ferme: j(7, 14), entame: j(4, 7), congeler: null, sources: [1, 7], note: 'gardée dans sa saumure [7]' },
  parmesan: { ferme: j(180), entame: j(21, 28), congeler: true, mois: j(6), sources: [1] },
  yaourt_soja_proteine: { ferme: j(7, 14), entame: j(5), congeler: null, sources: [1, 9], note: 'Alpro : 5 jours après ouverture (dessert et boisson soja) [9]' },
  // ── Protéines végétales ────────────────────────────────────────────────────
  tofu_ferme: { ferme: j(7), entame: j(3, 4), congeler: true, mois: j(5), sources: [1, 11], note: 'dans l\'eau, changée chaque jour ; congelé, il devient spongieux' },
  tofu_fume: { ferme: j(7), entame: j(3, 4), congeler: true, mois: j(5), sources: [1, 11] },
  tempeh: { ferme: null, entame: j(3, 4), congeler: true, mois: j(6), sources: [1] },
  seitan: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1], note: 'FoodKeeper « substituts de viande au soja »' },
  steak_soja: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  emince_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  hache_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  galette_vegetale: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  boulette_vegetale: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  nuggets_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  saucisse_vegetale: { ferme: null, entame: j(3), congeler: true, mois: j(1, 2), sources: [1, 8], note: 'saucisses végétales Herta : 3 jours après ouverture [8]' },
  filets_poulet_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  aiguillettes_poulet_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  lardons_vegetaux: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  merguez_vegetale: { ferme: null, entame: j(3), congeler: true, mois: j(1, 2), sources: [1, 8] },
  chorizo_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  jambon_vegetal: { ferme: null, entame: j(3, 4), congeler: true, mois: j(12, 18), sources: [1, 8] },
  falafel: { ferme: null, entame: j(1, 2), congeler: null, sources: [10], note: 'les marques disent « rapidement après ouverture », sans durée [10]' },
  // ── Fruits ─────────────────────────────────────────────────────────────────
  myrtilles: { ferme: j(7, 14), congeler: true, mois: j(8, 12), sources: [1] },
  framboises: { ferme: j(2, 3), congeler: true, mois: j(8, 12), sources: [1] },
  kiwi: { ferme: j(3, 6), congeler: null, sources: [1], note: 'mûr' },
  raisins: { ferme: j(7), congeler: true, mois: j(1), sources: [1], note: 'grains entiers' },
  // ── Légumes ────────────────────────────────────────────────────────────────
  brocoli: { ferme: j(3, 5), congeler: true, mois: j(10, 12), sources: [1] },
  epinards: { ferme: j(3, 5), entame: j(2), congeler: true, mois: j(10, 12), sources: [1], note: 'en sachet : 2 jours une fois ouvert' },
  courgette: { ferme: j(4, 7), congeler: true, mois: j(10, 12), sources: [1] },
  poivron: { ferme: j(4, 14), congeler: true, mois: j(6, 8), sources: [1] },
  champignons: { ferme: j(3, 7), congeler: true, mois: j(10, 12), sources: [1] },
  haricots_verts: { ferme: j(3, 5), congeler: true, mois: j(8), sources: [1] },
  carotte: { ferme: j(14, 21), congeler: true, mois: j(10, 12), sources: [1] },
  chou_fleur: { ferme: j(3, 5), congeler: true, mois: j(10, 12), sources: [1] },
  asperges: { ferme: j(3, 4), congeler: true, mois: j(5), sources: [1] },
  salade_verte: { ferme: j(3, 7), congeler: false, sources: [1] },
  concombre: { ferme: j(4, 6), congeler: false, sources: [1] },
  roquette: { ferme: j(3, 7), entame: j(2), congeler: false, sources: [1] },
  betterave: { ferme: null, entame: j(3, 4), congeler: true, mois: j(6, 8), sources: [1], note: 'cuite sous vide : l\'étiquette ; ouverte, comme un légume cuit' },
};

export const SOURCES_DUREE: Record<number, string> = {
  1: 'USDA FSIS, FoodKeeper, base de données ouverte (CC0), fiches produit : réfrigérateur après achat, après ouverture, congélateur. https://catalog.data.gov/dataset/fsis-foodkeeper-data, consultée le 2026-10-24.',
  2: 'FoodSafety.gov (USDA, FDA, CDC), « Cold Food Storage Chart », revu le 19 septembre 2023. https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
  3: 'Que Choisir, « La durée de conservation des aliments dans le réfrigérateur », 5 mai 2021 : viande crue entamée 48 h, viande hachée 24 h, poissons crus 18 à 24 h, charcuterie entamée 3 à 4 jours, œufs 3 semaines à 1 mois, blanc d\'œuf cru 1 semaine. https://www.quechoisir.org/conseils-refrigerateur-duree-de-conservation-des-aliments-dans-le-refrigerateur-n8507/',
  4: 'INC (Institut national de la consommation), « Tableaux de conservation des denrées alimentaires, Ne jetez pas systématiquement vos denrées ! », 27 novembre 2015 : viande et poisson à la découpe 48 h, jambon emballé DLC à respecter, yaourt consommable après la DLC, œufs à DDM. https://www.inc-conso.fr/sites/default/files/pdf/tableau_DLC.pdf',
  5: 'Fiches produit de saumon fumé : Delpeyrat (Auchan) 24 h après ouverture, Pomona 48 h, Côte Sauvage (Supermarchés Match) 6 jours.',
  6: 'Test-Achats (réponse d\'expert, mozzarella) : restes dans leur liquide, en boîte hermétique, jusqu\'à 5 jours.',
  7: 'Croq-Kilos, « Comment bien conserver la feta » : 4 à 7 jours une fois ouverte, dans sa saumure. Source grand public, à défaut d\'une source officielle.',
  8: 'Fiches produit Herta : saucisses végétales Knacki, 3 jours après ouverture ; jambon et lardons, 24 h à 2 jours après ouverture.',
  9: 'Fiches produit Alpro (Auchan) : dessert végétal soja et boisson soja protéinée, 5 jours après ouverture.',
  10: 'Fiches produit de falafels frais (Frais & Malin, Florentin, Greenweez) : « consommer rapidement après ouverture », sans durée.',
  11: 'Liebherr FreshMag (fabricant de réfrigérateurs) : tofu entamé environ 4 jours ; fromage blanc environ 7 jours ; mozzarella ouverte jusqu\'à une semaine.',
  12: 'Fiches techniques Pomona : filet de poulet sous atmosphère, durée de vie totale 10 jours ; steak haché frais, 12 jours à 0–2 °C. La DLC est fixée par le fabricant.',
  13: 'Test-Achats, « Les ficelles de la congélation » : un aliment décongelé s\'utilise dans les 24 h et ne se recongèle pas.',
};

/** La durée de vie d'un aliment, ou `undefined` s'il n'est pas périssable (sec, surgelé, hors catalogue). */
export function dureeDe(ref: string): DureeDeVie | undefined {
  return SURGELES.includes(ref) ? undefined : DUREE_DE_VIE[ref];
}

/**
 * Jusqu'à quel jour (compté depuis l'achat, jour de l'achat = 0) un reste tient encore, entamé
 * le jour `ouvertLe`. La borne BASSE de chaque source : le moteur ne doit jamais compter sur un
 * aliment qui a pu tourner.
 */
export function tientJusquau(d: DureeDeVie, ouvertLe: number): number {
  const ferme = d.ferme ? d.ferme[0] : FERME_PAR_DEFAUT;
  return d.entame ? Math.min(ferme, ouvertLe + d.entame[0]) : ferme;
}
