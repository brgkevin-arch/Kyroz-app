import type { ShoppingItem } from './types';
import { poidsUnitaire } from './units';
import { quantiteRangee } from './formatsVendus';

/**
 * LE TICKET DE CAISSE (2026-10-24, étape 2 du chemin validé par le fondateur).
 *
 * Fondateur : *« on lui dit qu'il lui faut 650 g de bœuf, il achète au plus proche ; c'est à
 * nous de savoir ce qu'il a acheté, avec le moins de friction »*. Le ticket se lit sur
 * l'iPhone (étape 3 : texte du PDF de l'appli de l'enseigne, ou photo), puis CE fichier, pur,
 * en tire ce qui entre en réserve.
 *
 * Ce qu'on sait d'un vrai ticket (3 tickets E.Leclerc analysés le 2026-10-24) :
 *  · aucun code produit (pas d'EAN) — on lit le LIBELLÉ, coupé à ~32 caractères ;
 *  · le rayon en en-tête (« >> CREMERIE L.S ») ;
 *  · ~3 lignes alimentaires sur 4 portent leur quantité (« 200G », « 8X125G », « X6 », « 50CL »,
 *    « 4 FRUITS ») ; le VRAC et la DÉCOUPE n'ont que le prix ;
 *  · une ligne « 2 X 3.37€ » sous un article dit qu'il en a été pris deux.
 *
 * 🔴 RÈGLE VALIDÉE : LE TICKET EST LA CLÔTURE. Une sortie de courses ne remplit la réserve
 * qu'une fois. Avec le ticket, pour chaque article de la liste :
 *  · retrouvé avec sa quantité → la quantité du ticket ;
 *  · retrouvé sans quantité → le besoin de la liste si c'est du vrac ou de la découpe (on a pris
 *    au plus proche), le paquet estimé sinon ;
 *  · coché mais absent du ticket (le marché, une autre boutique) → le paquet estimé ;
 *  · ni coché ni sur le ticket → pas acheté.
 * Le reste du ticket (biscuits, vin…) ne concerne pas la liste : il est ignoré.
 */

export type Unite = 'g' | 'ml' | 'pièce';

export interface LigneTicket {
  rayon?: string;
  libelle: string;
  /** Combien d'unités de l'article (« 2 X 3.37€ » sous la ligne). */
  nombre: number;
  /** La quantité d'UNE unité, lue dans le libellé, si elle y est. */
  quantite?: { valeur: number; unite: Unite };
}

const PRIX = /(-?\d+[.,]\d{2})\s*€?\s*(?:[A-Z0-9])?\s*$/;
const MULTIPLE = /^\s*(\d+)\s*[Xx]\s*\d+[.,]\d{2}\s*€?/;

/**
 * Le texte du ticket → ses lignes d'articles. Tolère le texte d'un PDF (colonnes alignées) comme
 * celui d'une photo (lignes plus brouillonnes) : une ligne d'article finit par un prix.
 * S'arrête au total : ce qui suit (paiement, fidélité, jeux) n'est pas un article.
 */
export function lireTicket(texte: string): LigneTicket[] {
  const lignes: LigneTicket[] = [];
  let rayon: string | undefined;
  for (const brute of texte.split(/\r?\n/)) {
    const l = brute.replace(/^\s*\*\s*/, '').trim();
    if (!l) continue;
    if (/^(total|sous[- ]total|reste [àa] payer|montant)\b/i.test(l)) break;
    const entete = l.match(/^>>\s*(.+)$/);
    if (entete) { rayon = entete[1].trim(); continue; }
    const multiple = l.match(MULTIPLE);
    if (multiple) {
      const derniere = lignes[lignes.length - 1];
      if (derniere) derniere.nombre = Number(multiple[1]);
      continue;
    }
    const prix = l.match(PRIX);
    // Une ligne sans prix, juste au-dessus d'un « 2 X 3.37€ », est un article quand même.
    const libelle = (prix ? l.slice(0, prix.index) : l).replace(/\s{2,}.*$/, '').trim();
    if (!libelle || /^[-=*_\s]+$/.test(libelle) || /^(ttc|tva|€|code)\b/i.test(libelle)) continue;
    lignes.push({ rayon, libelle, nombre: 1, quantite: quantiteDuLibelle(libelle) });
  }
  return lignes;
}

/** La quantité écrite dans un libellé : « 2X75G » = 150 g, « 50CL » = 500 ml, « X6 » = 6 pièces. */
export function quantiteDuLibelle(libelle: string): LigneTicket['quantite'] {
  const l = libelle.toUpperCase().replace(',', '.');
  const enBase = (v: number, u: string): { valeur: number; unite: Unite } =>
    u === 'KG' ? { valeur: v * 1000, unite: 'g' }
      : u === 'G' ? { valeur: v, unite: 'g' }
        : u === 'L' ? { valeur: v * 1000, unite: 'ml' }
          : u === 'CL' ? { valeur: v * 10, unite: 'ml' }
            : { valeur: v, unite: 'ml' };
  const lot = l.match(/(\d+)\s?X\s?(\d+(?:\.\d+)?)\s?(KG|G|CL|ML|L)\b/);
  if (lot) { const q = enBase(Number(lot[2]), lot[3]); return { valeur: q.valeur * Number(lot[1]), unite: q.unite }; }
  const simple = l.match(/(\d+(?:\.\d+)?)\s?(KG|G|CL|ML|L)\b/);
  if (simple) return enBase(Number(simple[1]), simple[2]);
  const pieces = l.match(/\bX\s?(\d+)\b/) ?? l.match(/\b(\d+)\s?(?:FRUITS|PIECES|PCS|OEUFS)\b/);
  if (pieces) return { valeur: Number(pieces[1]), unite: 'pièce' };
  return undefined;
}

// ── Rapprocher le ticket de la LISTE (20 à 60 articles, pas les 139 aliments) ──

const VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'au', 'aux', 'a', 'en', 'et', 'type', 'nature',
  'conserve', 'egoutte', 'egouttes', 'mg', 'fage', 'naturel', 'frais', 'fraiche', 'fraiches']);
/** Le premier mot d'un nom ne dit pas toujours l'aliment : « Filet de poulet », c'est du poulet. */
const GENERIQUES = new Set(['filet', 'filets', 'escalope', 'pave', 'dos', 'steak', 'emince', 'emincees', 'aiguillettes', 'tranche']);
/** Ce que les tickets écrivent pour un aliment de la liste (l'enseigne ne dit pas « pâtes »). */
const SYNONYMES: Record<string, string[]> = {
  // ⚠️ Sous la forme AU SINGULIER : « pâtes » devient « pate » avant comparaison.
  pate: ['penne', 'spaghetti', 'fusilli', 'tagliatelle', 'gansette', 'coquillette', 'macaroni', 'farfalle', 'linguine', 'rigate', 'torsade'],
  salade: ['iceberg', 'laitue', 'batavia', 'mache', 'scarole'],
  creme: ['crem'],
  emmental: ['emm'],
};

export const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/gi, 'oe')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const singulier = (m: string) => (m.length > 3 && /[sx]$/.test(m) ? m.slice(0, -1) : m);

/** Les mots qui disent l'aliment : le premier « vrai » en tête (pas « filet »), puis les autres. */
function motsCles(nom: string): { tete: string; autres: string[] } {
  const mots = normaliser(nom).split(' ').filter((m) => m && !VIDES.has(m) && !/^\d/.test(m)).map(singulier);
  const i = mots.findIndex((m) => !GENERIQUES.has(m));
  const tete = mots[i >= 0 ? i : 0] ?? '';
  return { tete, autres: mots.filter((m, k) => k !== (i >= 0 ? i : 0)) };
}

/** Un mot de la liste se lit-il dans le libellé ? Égal, pluriel, ou abrégé (« CREM » pour crème). */
function lu(mot: string, jetons: string[]): boolean {
  const formes = [mot, ...(SYNONYMES[mot] ?? [])];
  return jetons.some((j) => formes.some((f) => j === f || singulier(j) === f
    || (j.length >= 3 && f.startsWith(j)) || (f.length >= 4 && j.startsWith(f))));
}

/**
 * Un produit TRANSFORMÉ ne vaut pas l'ingrédient brut de la liste : « VAHINE NAPP FRUITS ROUGES »
 * (un nappage) n'est pas « Fruits rouges », « SAUCE AIL ET CIBOULETTE » n'est pas de l'ail — sauf
 * si l'article de la liste en est un lui-même (« Sauce soja »).
 */
const TRANSFORMES = ['napp', 'sauce', 'sirop', 'jus', 'biscuit', 'chip', 'gateau', 'dessert', 'glace', 'pizza', 'soupe', 'confiture', 'aero'];
const transforme = (jetons: string[]) => TRANSFORMES.filter((t) => jetons.some((j) => j.startsWith(t)));

/** Les articles de la liste retrouvés sur le ticket : article → ses lignes. */
export function rapprocher(lignes: LigneTicket[], articles: Pick<ShoppingItem, 'name'>[]): Map<string, LigneTicket[]> {
  const cles = articles.map((a) => ({ a, k: motsCles(a.name) }));
  const out = new Map<string, LigneTicket[]>();
  for (const ligne of lignes) {
    const jetons = normaliser(ligne.libelle).split(' ').filter(Boolean);
    const transformations = transforme(jetons);
    let meilleur: { nom: string; score: number } | null = null;
    for (const { a, k } of cles) {
      if (!k.tete || !lu(k.tete, jetons)) continue;
      const nomArticle = normaliser(a.name);
      if (transformations.some((t) => !nomArticle.includes(t))) continue;
      const score = (2 + k.autres.filter((m) => lu(m, jetons)).length) / (2 + k.autres.length);
      if (!meilleur || score > meilleur.score) meilleur = { nom: a.name, score };
    }
    if (meilleur) out.set(meilleur.nom, [...(out.get(meilleur.nom) ?? []), ligne]);
  }
  return out;
}

// ── Ce qui entre en réserve ─────────────────────────────────────────────────

export interface Rangement {
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingItem['category'];
  /** D'où vient le chiffre : lu sur le ticket, besoin de la liste (vrac), ou paquet estimé. */
  source: 'ticket' | 'besoin' | 'estime';
}

const vrac = (l: LigneTicket) => /\bVRAC\b/i.test(l.libelle) || /DECOUPE|COUPE|VRAC|STAND|MARCHE/i.test(normaliser(l.rayon ?? '').toUpperCase());

/** La quantité d'une ligne, dans l'unité de l'article (une pièce convertie à son poids). */
function quantiteDeLigne(l: LigneTicket, article: Pick<ShoppingItem, 'name' | 'unit'>): number | undefined {
  if (!l.quantite) return undefined;
  const { valeur, unite } = l.quantite;
  const total = valeur * l.nombre;
  if (unite === article.unit) return total;
  if (unite === 'pièce' && article.unit === 'g') {
    const pu = poidsUnitaire(article.name);
    return pu ? total * pu : undefined;
  }
  // Un liquide pesé en grammes dans le catalogue (ou l'inverse) : 1 ml ≈ 1 g.
  if ((unite === 'ml' && article.unit === 'g') || (unite === 'g' && article.unit === 'ml')) return total;
  return undefined;
}

/**
 * LA CLÔTURE AVEC TICKET : ce qui entre en réserve, article de la liste par article.
 * `coches` : les articles barrés pendant les courses (cocher sert à barrer, c'est la validation
 * qui range — décision du fondateur). Rend aussi la liste de ce qui est ACHETÉ, pour solder la liste.
 */
export function clotureAvecTicket(
  articles: ShoppingItem[],
  coches: ReadonlySet<string>,
  trouves: ReadonlyMap<string, LigneTicket[]>,
): { rangements: Rangement[]; achetes: string[] } {
  const rangements: Rangement[] = [];
  const achetes: string[] = [];
  for (const a of articles) {
    const lignes = trouves.get(a.name);
    if (lignes?.length) {
      achetes.push(a.name);
      const lues = lignes.map((l) => quantiteDeLigne(l, a));
      const base = { name: a.name, unit: a.unit, category: a.category };
      const sommeLue = lues.reduce<number>((t, q) => t + (q ?? 0), 0);
      if (lues.every((q) => q !== undefined)) {
        rangements.push({ ...base, quantity: Math.round(sommeLue), source: 'ticket' });
      } else if (lues.some((q) => q !== undefined)) {
        // « OEUFS X6 » et « OEUFS OMEGA 3 » (sans nombre) : ce qui est lu, plus un paquet
        // estimé (le plus petit format vendu) par ligne muette.
        const unPaquet = quantiteRangee({ ...a, quantity: 1 });
        const muettes = lues.filter((q) => q === undefined).length;
        rangements.push({ ...base, quantity: Math.round(sommeLue + muettes * unPaquet), source: 'ticket' });
      } else if (lignes.some(vrac)) {
        rangements.push({ ...base, quantity: a.quantity, source: 'besoin' });
      } else {
        rangements.push({ ...base, quantity: quantiteRangee(a), source: 'estime' });
      }
    } else if (coches.has(a.name)) {
      achetes.push(a.name);
      rangements.push({ name: a.name, quantity: quantiteRangee(a), unit: a.unit, category: a.category, source: 'estime' });
    }
  }
  return { rangements: rangements.filter((r) => r.quantity > 0), achetes };
}
