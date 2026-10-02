// ── Le FORMAT VENDU : ce qu'on prend vraiment en magasin (2026-10-02) ─────────
//
// Décision fondateur (« Liste + réserve ») : la liste de courses montre ce qu'on
// achète vraiment, « Beurre d'amande · 1 pot de 250 g · il t'en faut 5 g » ; à
// « Courses terminées », le paquet ENTIER entre en réserve ; ce qu'il en reste est
// déduit des listes suivantes (la réserve est toujours soustraite de la liste) ; et
// les quantités restent corrigeables dans la Réserve.
//
// 🔴 LE DÉFAUT QUE ÇA FERME (docs/fiabilite-liste-et-reserve.md, F1 et F2) : la
// réserve recevait le BESOIN, jamais l'ACHAT. 320 g de riz demandés, un paquet de
// 1 kg acheté : la réserve annonçait 320 g, il en restait 680 au placard, et Kyroz
// les faisait racheter la semaine suivante.
//
// ⚠️ CE SONT DES FORMATS GÉNÉRIQUES, sans enseigne ni marque : le format COURANT
// d'un rayon de grande surface française, choisi à la main. Un magasin vend autrement
// ? La quantité se corrige dans la Réserve, d'une touche. Le chiffre affiché reste
// donc celui qui sera servi : la réserve reçoit exactement ce que la ligne annonçait.
//
// ⚠️ La `ref` se DÉDUIT du nom (`refDuNom`), comme partout ailleurs : rien n'est
// stocké de plus dans la liste ni dans la réserve, donc aucune migration.

import { RECIPE_INGREDIENTS } from './recipeData';
import { refDuNom } from './pantry';
import { formatQuantity, frnum } from './units';

type Contenant =
  | 'paquet' | 'pot' | 'boîte' | 'brique' | 'bouteille' | 'sachet' | 'barquette'
  | 'tablette' | 'bocal' | 'botte' | 'boule' | 'pack' | 'pain' | 'filet' | 'bloc';

const PLURIEL: Record<Contenant, string> = {
  paquet: 'paquets', pot: 'pots', boîte: 'boîtes', brique: 'briques', bouteille: 'bouteilles',
  sachet: 'sachets', barquette: 'barquettes', tablette: 'tablettes', bocal: 'bocaux',
  botte: 'bottes', boule: 'boules', pack: 'packs', pain: 'pains', filet: 'filets', bloc: 'blocs',
};

/** Un contenant et ce qu'il contient, dans l'unité de l'aliment (g ou ml). */
interface Format {
  contenant: Contenant;
  taille: number;
  /** Ce qu'on lit sur l'étiquette quand le poids n'est pas le bon mot : « 6 œufs », « 250 ml ». */
  libelle?: string;
}

/** Vendu à la PIÈCE (fruits et légumes du rayon frais) : poids moyen de la partie utilisée. */
interface Piece {
  piece: number;
  nom: string;
  pluriel: string;
}

type Regle = { formats: Format[] } | Piece;

const f = (contenant: Contenant, ...tailles: number[]): Regle =>
  ({ formats: tailles.map((taille) => ({ contenant, taille })) });
const fl = (...formats: Format[]): Regle => ({ formats });
const p = (piece: number, nom: string, pluriel: string): Regle => ({ piece, nom, pluriel });

/**
 * Le format courant de chaque ingrédient du catalogue.
 * ⚠️ Les conserves sont comptées ÉGOUTTÉES, comme le catalogue les pèse.
 */
export const FORMATS: Record<string, Regle> = {
  // Viandes et poissons
  poulet_filet: f('barquette', 300, 600, 1000),
  dinde_escalope: f('barquette', 300, 600),
  boeuf_5: f('barquette', 250, 500),
  boeuf_bavette: f('barquette', 250, 500),
  porc_filet: f('barquette', 500),
  jambon_blanc: fl({ contenant: 'paquet', taille: 160, libelle: '4 tranches' }, { contenant: 'paquet', taille: 240, libelle: '6 tranches' }),
  saumon: fl({ contenant: 'barquette', taille: 250, libelle: '2 pavés' }, { contenant: 'barquette', taille: 500, libelle: '4 pavés' }),
  saumon_fume: fl({ contenant: 'paquet', taille: 75, libelle: '2 tranches' }, { contenant: 'paquet', taille: 150, libelle: '4 tranches' }),
  cabillaud: fl({ contenant: 'barquette', taille: 250, libelle: '2 dos' }, { contenant: 'barquette', taille: 500, libelle: '4 dos' }),
  thon_frais: fl({ contenant: 'barquette', taille: 250, libelle: '2 pavés' }),
  thon_naturel: fl({ contenant: 'boîte', taille: 140, libelle: '140 g égouttés' }),
  maquereau: fl({ contenant: 'barquette', taille: 200, libelle: '2 filets' }),
  sardines: fl({ contenant: 'boîte', taille: 95, libelle: '95 g égouttés' }),
  crevettes: f('barquette', 150, 300),

  // Œufs et produits laitiers
  oeuf_entier: fl({ contenant: 'boîte', taille: 330, libelle: '6 œufs' }, { contenant: 'boîte', taille: 660, libelle: '12 œufs' }),
  skyr: f('pot', 450, 1000),
  fromage_blanc_0: f('pot', 500, 1000),
  yaourt_grec: f('pot', 170, 500),
  cottage_cheese: f('pot', 200, 500),
  whey: f('pot', 500, 1000),
  lait_demi_ecreme: f('brique', 1000),
  yaourt_soja: fl({ contenant: 'pack', taille: 400, libelle: '4 pots' }),
  yaourt_soja_proteine: f('pot', 400),
  mozzarella: f('boule', 125),
  feta: f('paquet', 200),
  parmesan: f('sachet', 70),

  // Protéines végétales
  tofu_ferme: f('bloc', 200),
  tofu_soyeux: f('brique', 300),
  tofu_fume: f('bloc', 200),
  tempeh: f('paquet', 200),
  seitan: f('paquet', 250),
  edamame: f('sachet', 400),
  proteine_vegetale: f('pot', 500, 1000),
  soja_texture: f('sachet', 250),
  levure_maltee: f('pot', 150),
  steak_soja: fl({ contenant: 'paquet', taille: 200, libelle: '2 steaks' }),
  emince_vegetal: f('paquet', 175),
  hache_vegetal: f('paquet', 200),
  galette_vegetale: fl({ contenant: 'paquet', taille: 200, libelle: '2 galettes' }),
  boulette_vegetale: f('paquet', 200),
  nuggets_vegetal: f('paquet', 200),
  saucisse_vegetale: f('paquet', 200),
  filets_poulet_vegetal: f('paquet', 160),
  aiguillettes_poulet_vegetal: f('paquet', 160),
  lardons_vegetaux: f('paquet', 150),
  merguez_vegetale: f('paquet', 200),
  chorizo_vegetal: f('paquet', 100),
  jambon_vegetal: f('paquet', 100),
  escalope_vegetale: fl({ contenant: 'paquet', taille: 180, libelle: '2 escalopes' }),
  falafel: f('barquette', 220),

  // Légumineuses : sèches au paquet, en conserve à la boîte
  lentilles_corail: f('paquet', 500),
  lentilles_vertes: f('paquet', 500),
  pois_chiches: f('paquet', 500),
  haricots_rouges: f('paquet', 500),
  haricots_blancs: f('paquet', 500),
  haricots_noirs: f('paquet', 500),
  feves: f('paquet', 500),
  pois_casses: f('paquet', 500),
  pois_chiches_conserve: fl({ contenant: 'boîte', taille: 265, libelle: '265 g égouttés' }),
  lentilles_cuites: f('sachet', 250),
  haricots_rouges_conserve: fl({ contenant: 'boîte', taille: 250, libelle: '250 g égouttés' }),
  haricots_blancs_conserve: fl({ contenant: 'boîte', taille: 250, libelle: '250 g égouttés' }),
  haricots_noirs_conserve: fl({ contenant: 'boîte', taille: 250, libelle: '250 g égouttés' }),

  // Oléagineux, graines, épicerie
  beurre_cacahuete: f('pot', 350),
  beurre_amande: f('pot', 250),
  tahini: f('pot', 300),
  amandes: f('sachet', 200, 500),
  noix: f('sachet', 100, 200),
  noisettes: f('sachet', 125),
  graines_chia: f('sachet', 200),
  graines_courge: f('sachet', 150),
  olives: f('sachet', 150),
  lait_coco: fl({ contenant: 'brique', taille: 200 }, { contenant: 'boîte', taille: 400 }),
  creme_soja: fl({ contenant: 'brique', taille: 200, libelle: '20 cl' }),
  lait_amande: f('brique', 1000),
  boisson_soja: f('brique', 1000),
  sauce_soja: f('bouteille', 150),
  chocolat_noir: f('tablette', 100),
  cacao_poudre: f('boîte', 250),
  pesto: f('pot', 190),
  sirop_erable: fl({ contenant: 'bouteille', taille: 330, libelle: '250 ml' }),
  dattes: f('sachet', 250),
  chataigne: f('paquet', 200),
  chapelure: f('paquet', 250),
  tomate_concassee: f('boîte', 400),
  ratatouille: f('boîte', 375, 750),
  mais: fl({ contenant: 'boîte', taille: 140, libelle: '140 g égouttés' }, { contenant: 'boîte', taille: 285, libelle: '285 g égouttés' }),

  // Féculents
  flocons_avoine: f('paquet', 500, 1000),
  riz_basmati: f('paquet', 500, 1000),
  riz_complet: f('paquet', 500, 1000),
  pates_completes: f('paquet', 500),
  pates_semoule: f('paquet', 500, 1000),
  nouilles_completes: f('paquet', 250),
  nouilles_riz: f('paquet', 200, 400),
  boulgour: f('paquet', 500),
  quinoa: f('paquet', 500),
  semoule_couscous: f('paquet', 500, 1000),
  polenta: f('paquet', 500),
  sarrasin: f('paquet', 500),
  millet: f('paquet', 500),
  galette_riz: f('paquet', 130),
  pain_complet: f('pain', 500),
  pain_seigle: f('paquet', 500),
  pain_sans_gluten: f('paquet', 300),
  tortilla_complete: fl({ contenant: 'paquet', taille: 360, libelle: '6 tortillas' }),
  wrap_sans_gluten: fl({ contenant: 'paquet', taille: 160, libelle: '4 wraps' }),
  pain_pita_complet: fl({ contenant: 'paquet', taille: 330, libelle: '6 pains pita' }),
  pomme_de_terre: f('filet', 1000),

  // Fruits et légumes : à la pièce quand ils se vendent à la pièce
  banane: p(120, 'banane', 'bananes'),
  avocat: p(150, 'avocat', 'avocats'),
  pomme: p(150, 'pomme', 'pommes'),
  kiwi: p(75, 'kiwi', 'kiwis'),
  mangue: p(250, 'mangue', 'mangues'),
  ananas: p(500, 'ananas', 'ananas'),
  courgette: p(200, 'courgette', 'courgettes'),
  poivron: p(150, 'poivron', 'poivrons'),
  tomate: p(120, 'tomate', 'tomates'),
  oignon: p(100, 'oignon', 'oignons'),
  carotte: p(100, 'carotte', 'carottes'),
  concombre: p(350, 'concombre', 'concombres'),
  brocoli: p(350, 'brocoli', 'brocolis'),
  chou_fleur: p(600, 'chou-fleur', 'choux-fleurs'),
  salade_verte: p(250, 'salade', 'salades'),
  patate_douce: p(300, 'patate douce', 'patates douces'),
  myrtilles: f('barquette', 125),
  framboises: f('barquette', 125),
  fruits_rouges: f('sachet', 500),
  raisins: f('barquette', 500),
  epinards: f('sachet', 125, 400),
  roquette: f('sachet', 125),
  champignons: f('barquette', 250, 500),
  haricots_verts: f('sachet', 500),
  petits_pois: f('sachet', 1000),
  legumes_wok: f('sachet', 600),
  asperges: f('botte', 500),
  betterave: f('paquet', 250, 500),
};

/**
 * Les ingrédients qui n'ont PAS de format, et pourquoi. Leur ligne reste celle
 * d'avant : le besoin seul, et c'est lui qui entre en réserve.
 */
export const SANS_FORMAT: Record<string, string> = {
  blanc_oeuf: 'se prend en œufs entiers ou en brique de blancs, selon le magasin : aucun format ne vaut pour tous',
};

/** À 5 % près, un format couvre le besoin : on ne fait pas prendre un second paquet pour 5 g. */
const TOLERANCE_FORMAT = 0.05;
/** Les pièces varient d'un étal à l'autre : un quart de pièce de marge. */
const TOLERANCE_PIECE = 0.25;

export interface Achat {
  /** Ce qu'on prend en magasin : « 1 pot de 250 g », « 2 courgettes ». */
  libelle: string;
  /** Ce qui entre en réserve à la clôture, dans l'unité de l'article. */
  total: number;
  /** Faut-il dire « il t'en faut … » ? Non quand l'achat et le besoin se confondent. */
  ecartVisible: boolean;
}

type Article = { name: string; quantity: number; unit: string; manuel?: boolean };

const taille = (q: number, unite: string) =>
  unite === 'ml'
    ? (q >= 1000 ? `${frnum(q / 1000)} L` : `${q} ml`)
    : (q >= 1000 ? `${frnum(q / 1000)} kg` : `${q} g`);

/**
 * Ce qu'il faut prendre en magasin pour couvrir le besoin d'un article.
 * `null` = pas de format connu : article ajouté à la main (sa quantité est celle
 * que la personne a tapée), aliment hors catalogue, ou unité qui ne correspond pas.
 */
export function achatPour(article: Article): Achat | null {
  if (article.manuel || !(article.quantity > 0)) return null;
  const ref = refDuNom(article.name);
  const regle = ref ? FORMATS[ref] : undefined;
  if (!ref || !regle || RECIPE_INGREDIENTS[ref]?.unit !== article.unit) return null;
  const besoin = article.quantity;

  if ('piece' in regle) {
    const n = Math.max(1, Math.ceil((besoin - TOLERANCE_PIECE * regle.piece) / regle.piece));
    const total = n * regle.piece;
    return {
      libelle: `${n} ${n > 1 ? regle.pluriel : regle.nom}`,
      total,
      ecartVisible: Math.abs(total - besoin) > TOLERANCE_PIECE * regle.piece,
    };
  }

  // Le format qui couvre le besoin avec le moins de surplus ; à surplus égal, le moins
  // de paquets (520 g de riz : un paquet de 1 kg plutôt que deux de 500 g).
  let retenu: { format: Format; n: number; total: number } | null = null;
  for (const format of regle.formats) {
    const n = Math.max(1, Math.ceil((besoin - TOLERANCE_FORMAT * format.taille) / format.taille));
    const total = n * format.taille;
    if (!retenu || total < retenu.total || (total === retenu.total && n < retenu.n)) {
      retenu = { format, n, total };
    }
  }
  if (!retenu) return null;
  const { format, n, total } = retenu;
  return {
    libelle: `${n} ${n > 1 ? PLURIEL[format.contenant] : format.contenant} de ${format.libelle ?? taille(format.taille, article.unit)}`,
    total,
    ecartVisible: Math.abs(total - besoin) > TOLERANCE_FORMAT * total,
  };
}

/**
 * Ce qui entre en réserve à « Courses terminées ». Jamais MOINS que le besoin : à la
 * tolérance près, un format peut le frôler par en dessous, et une réserve inférieure
 * au besoin ferait revenir l'article sur la liste suivante pour quelques grammes.
 */
export function quantiteRangee(article: Article): number {
  const achat = achatPour(article);
  return achat ? Math.max(achat.total, article.quantity) : article.quantity;
}

/** « il t'en faut 5 g », dans l'unité lisible de l'aliment (« 3 œufs »). */
export function besoinLisible(article: Article): string {
  return `il t’en faut ${formatQuantity(article.name, article.quantity, article.unit)}`;
}
