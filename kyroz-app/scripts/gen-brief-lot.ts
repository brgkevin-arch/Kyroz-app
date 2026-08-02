/**
 * Génère un brief AUTO-PORTANT par lot de livraison, à donner tel quel au rédacteur.
 *
 * Pourquoi un script et pas six fichiers écrits à la main :
 *  - les `ref` et leurs macros sont extraits du catalogue live → aucun risque que le brief
 *    cite un ingrédient qui n'existe pas, ou une valeur périmée ;
 *  - les formats déjà saturés (triplets, ancres) sont CALCULÉS, pas devinés ;
 *  - c'est REGÉNÉRABLE entre deux lots : une fois le lot 1 mergé, le lot 2 voit ce que le
 *    lot 1 a consommé. C'est précisément le contrôle croisé qui manquait aux vagues
 *    précédentes et qui a produit les 8 groupes de doublons actuels.
 *
 * Usage :
 *   npx tsx scripts/gen-brief-lot.ts              → génère les 6 lots dans Recette/lots/
 *   npx tsx scripts/gen-brief-lot.ts b2           → un seul lot
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import raw from '../Recette/recettes-kyroz.json';
import { restrictionsOkFor } from '../lib/recipeDiet';
import { RECIPE_INGREDIENTS, RECIPE_CONFIG, macrosForRefIngredients } from '../lib/recipeData';
import { PROFILS_REF, ciblesDe, servable } from './mesure-couverture';
import type { MealType, Recipe } from '../lib/types';

type Per100 = { kcal: number; protein: number; carbs: number; fat: number };
type RefDef = { name: string; unit: string; per_100: Per100; basis?: string; abs_max_qty?: number };
type Recette = {
  id: string; name: string; category: 'petit_dej' | 'collation' | 'repas_complet';
  base_servings: number; wave?: string;
  tags: { objectif: string[]; recup_jour_repos: boolean; sport: string[]; temps_min: number };
  ingredients: { ref: string; qty: number; macro_role: string; scalable: boolean }[];
  instructions: string[]; why: string;
  macros_per_serving: { kcal: number; protein: number; carbs: number; fat: number };
};

const DATA = raw as unknown as { ingredients_reference: Record<string, RefDef>; recipes: Recette[] };
const RECIPES = DATA.recipes;

/**
 * Valeurs /100 g — celles que le MOTEUR SERT, pas celles du JSON.
 *
 * ⚠️ Corrigé le 2026-08-01, et l'écart n'était pas cosmétique. `ingredients_reference`
 * porte le repère MANUEL ; `RECIPE_INGREDIENTS` porte la valeur réellement employée par
 * `macrosForRefIngredients`, donc Ciqual pour les 107 refs mappés. **47 refs sur 123
 * divergent** de plus de 8 % en kcal ou 12 % en protéines : `boeuf_bavette` −5,6 g de
 * protéines aux 100 g, `mozzarella` +57 kcal, `pesto` −80 kcal, `seitan` −4,4 g P.
 * Le brief publiait le repère manuel, donc le rédacteur calait son enveloppe sur des
 * chiffres que personne ne mange — et R8, lui, se mesure sur le moteur. Une recette
 * pouvait être dans l'enveloppe sur le papier et hors enveloppe dans l'assiette
 * (mesuré : 32 g de protéines annoncés, 26 servis).
 * `basis` et `abs_max_qty` restent lus dans `ingredients_reference` : le runtime ne les
 * porte pas.
 */
const REFS: Record<string, RefDef> = Object.fromEntries(
  Object.entries(DATA.ingredients_reference).map(([k, d]) => {
    const rt = RECIPE_INGREDIENTS[k];
    return [k, rt
      ? { ...d, per_100: { kcal: rt.per100g.kcal, protein: rt.per100g.protein_g, carbs: rt.per100g.carbs_g, fat: rt.per100g.fat_g } }
      : d];
  }),
);

// ── Définition des lots (miroir du §5 + §7.3 du brief) ───────────────────────

type Lot = {
  cle: string; titre: string; volume: number;
  categorie: Recette['category'];
  idDebut: number; idFin: number; prefixe: string;
  /**
   * Nom du dossier de drop qui portera cette livraison — et donc valeur EXACTE du champ
   * `wave` (convention `_meta.waves` : `AAAA-MM-JJ-<bloc>`). Le brief l'imprime tel quel ;
   * au merge, on crée `Recette/drops/<cette valeur>/`. L'ancien brief demandait
   * `2026-07-30-vague-113` à tous les lots, ce qui aurait fait mentir la partition par vague.
   */
  wave: string;
  /** Lot déjà livré et mergé : on ne le régénère plus (ses ids sont pris). */
  livre?: string;
  /** Enveloppes : [min,max] de la base écrite. */
  kcal: [number, number]; prot: [number, number]; carb: [number, number]; fat: [number, number];
  regimes: { libre: number; vegetarien: number; vegan: number; sansGluten: number };
  etapes: [number, number];
  /** Consignes propres au lot, en plus des règles générales. */
  specifique: string[];
  /**
   * Refs à EXPOSER en plus au §4, alors que la catégorie ne les emploie pas encore.
   *
   * ⚠️ Ajouté le 2026-08-02, et c'est un défaut de conception qu'il corrige. `refsPertinents`
   * ne retient que les refs DÉJÀ employés par la catégorie : la pertinence est garantie, mais
   * le créneau est enfermé dans sa propre palette — donc **aucun couple protéine × féculent
   * vraiment neuf n'y est commandable**. Mesuré : le §4 d'une collation n'exposait ni
   * `tofu_ferme`, ni `tempeh`, ni une seule légumineuse sèche, ni `millet`/`riz_*` ; celui
   * d'un petit-déj n'exposait ni `soja_texture` (l'ancre végétale la plus dense après
   * `proteine_vegetale`) ni `edamame`. Or c'est exactement ce que demande le chantier D19 :
   * des couples NEUFS, pas une neuvième variante du yaourt de soja. La liste des 9 refs
   * « forcés » en dur dans `refsPertinents` était déjà ce correctif, en moins avouable.
   *
   * Règle d'emploi : n'y mettre qu'un ref dont on a VÉRIFIÉ qu'il tient l'enveloppe du lot
   * (une ancre trop peu dense est inécrivable — cf. la note `DENSITE_CIBLE`).
   */
  refsEnPlus?: string[];
  /**
   * Sous-formats, quand le lot en porte plusieurs. Sans ça, le tableau d'enveloppe
   * afficherait l'UNION des bornes — et autoriserait des combinaisons qui n'existent
   * dans aucun format (une collation de 200 kcal à 8 g de protéines, par exemple).
   */
  sousFormats?: { nom: string; ids: string; kcal: [number, number]; prot: [number, number]; carb: [number, number]; fat: [number, number] }[];
};

const KCAL_PDJ: [number, number] = [430, 480];

/**
 * DENSITÉ PROTÉIQUE — la contrainte qui décide vraiment de la couverture.
 *
 * Découverte le 2026-08-01, en balayant la grille (kcal × protéines) sur le moteur, avec
 * une vérification adversariale à 6 agents. Le résultat contredit la doctrine qui régnait
 * dans ce fichier depuis toujours :
 *  · l'enveloppe n'est PAS une affaire de calories. Monter un repas complet à 700 kcal en
 *    gardant 36 g de protéines (5,1 g/100 kcal) rend **8,90 profils sur 12** — moins que
 *    l'enveloppe 520–580 d'alors (8,45… mais son MEILLEUR point est à 9,27). Monter les
 *    kcal SANS monter la protéine DÉGRADE le catalogue ;
 *  · à densité tenue, monter les deux ensemble gagne : repas complet 8,45 → **10,1/12**,
 *    petit-déj 8,2 → **9,3/12**, et `H 110 masse` passe de 24 % à 58 % de ses repas servis.
 * La raison est mécanique : `adaptRecipe` monte la protéine avec l'ancre (facteur ≤ 1,7) ;
 * si la base est pauvre en protéines, il doit gonfler toute la recette pour atteindre la
 * cible protéique et lève alors `over_target_kcal`. Une base dense atteint la cible
 * protéique sans déborder.
 */
const DENSITE_CIBLE: [number, number] = [5.4, 7.1];

const LOTS: Lot[] = [
  {
    cle: 'b2', titre: 'B2 — 13 collations, deux formats', volume: 13, categorie: 'collation',
    prefixe: 'col', idDebut: 67, idFin: 79,
    wave: '2026-08-01-b2-collations', livre: '2026-08-01',
    kcal: [120, 290], prot: [8, 20], carb: [14, 34], fat: [4, 11],
    // Livré : 7 vegan · 5 végétariennes · 1 carnée. La commande d'origine demandait
    // 7 « sans restriction » alors que le §4 de ce lot n'expose QU'UNE ancre carnée
    // (`dinde_escalope`), plafonnée à 3 recettes → 7 était mécaniquement impossible.
    // `verifieCoherence` refuserait désormais de générer ce brief tel quel.
    regimes: { libre: 1, vegetarien: 5, vegan: 7, sansGluten: 6 },
    etapes: [2, 3],
    sousFormats: [
      { nom: 'petit format', ids: '`col67` → `col75` · 9 recettes', kcal: [120, 185], prot: [8, 12], carb: [14, 24], fat: [4, 6] },
      { nom: 'format standard', ids: '`col76` → `col79` · 4 recettes', kcal: [200, 290], prot: [14, 20], carb: [22, 34], fat: [7, 11] },
    ],
    specifique: [
      'Les **deux sous-formats se livrent ENSEMBLE** dans ce lot. Ancre grasse : 4–6 g de lipides en petit format, 8–11 g en format standard.',
      'Aucune collation ne peut couvrir les 12 profils (maximum mesuré : 7/12). C\'est l\'**union des deux sous-formats** qui doit les couvrir. Ne pas produire 4 variantes du petit format en plus gros.',
      // ⚠️ Ligne RETIRÉE après livraison : elle demandait « au moins 2 des 9 petits formats
      // à 115 kcal · 4 g de protéines, ces recettes ne serviront qu'un profil et c'est
      // normal ». `check:enveloppe` (règle R8) REJETTE toute recette servant moins de
      // 3 profils sur 12 — la commande et le contrôle se contredisaient. Ne pas la
      // réécrire dans un lot futur tant que le seuil R8 n'a pas été assoupli (🧑).
      '⚠️ **La règle des 12 g de lipides ne s\'applique PAS ici.** 12 g de lipides valent 108 kcal, soit 70 % d\'une collation de 150 kcal. L\'ancre grasse reste obligatoire, elle est simplement petite.',
      '⚠️ **N\'essaie PAS d\'atteindre 6 g de protéines pour 100 kcal.** C\'est cette règle qui a rendu les 66 collations actuelles inutilisables. La collation est servie en dernier, le plancher protéique de la journée est déjà couvert par les trois repas : la cible résiduelle réelle est de **1 à 18 g**. Vise 5 à 7 g/100 kcal sans t\'y contraindre.',
      '**Le volume vient du fruit ou d\'un féculent léger**, jamais de la protéine.',
      // ⚠️ `yaourt_nature` et `petit_suisse` ont été retirés de cette ligne : ils étaient
      // présentés comme « formats ouverts, zéro recette » alors qu'ils n'existent PAS dans
      // `ingredients_reference`. C'est ce que `verifieCoherence` interdit désormais.
      '⚠️ **« Fruit + laitage maigre » est FERMÉ** : `skyr`, `fromage_blanc_0`, `cottage_cheese` et `yaourt_grec` sont tous saturés en « sans féculent » et en « avec flocons d\'avoine ». Ne pars pas de là. Formats ouverts : **salé** (une collation carnée — le catalogue n\'en compte AUCUNE), tartine ou galette garnie, crudités + tartinable, ou un laitage saturé RÉHABILITÉ par un féculent léger (`galette_riz`, `chataigne`, `pain_sans_gluten`).',
    ],
  },
  ...[1, 2, 3, 4].map((n): Lot => ({
    cle: `b1-lot${n}`, titre: `B1 — repas complets, lot ${n} sur 4`, volume: 20, categorie: 'repas_complet',
    prefixe: 'rep', idDebut: 171 + (n - 1) * 20, idFin: 190 + (n - 1) * 20,
    wave: `2026-08-01-b1-lot${n}-repas`,
    livre: '2026-08-01',
    kcal: [520, 580], prot: [30, 34], carb: [58, 70], fat: [14, 18],
    // 44 libres · 18 végétariennes · 18 vegan sur les 80 : ça ne se divise pas en quatre
    // parts égales, donc les lots 1-2 penchent végétarien et les lots 3-4 vegan.
    regimes: { libre: 11, vegetarien: n <= 2 ? 5 : 4, vegan: n <= 2 ? 4 : 5, sansGluten: 9 },
    etapes: [4, 7],
    specifique: [
      '**Base 520–580 kcal, 30 à 34 g de protéines. Ne dépasse jamais 34 g.** Chaque gramme au-dessus est un plancher que sept profils sur douze ne pourront plus redescendre.',
      '**Féculent généreux : 80 à 100 g pesés SECS.** C\'est lui qui portera les gros gabarits — il monte jusqu\'à ×1,8 et n\'a aucun plafond absolu. Mesuré : un plat à 30 g de protéines et 90 g de riz sert les 12 profils ; le même à 40 g de protéines et 40 g de riz n\'en sert que 6.',
      'Ancre grasse `fat` + `scalable`, **12 à 18 g** de lipides.',
      'Couples déjà saturés, **interdits** : `tofu_ferme` + `riz_basmati`, `tempeh` + `riz_complet`, `thon_naturel` + `pates_completes`. Pas plus de 2 recettes en `poulet_filet` + `riz_basmati` sur l\'ensemble du lot.',
      '**Légumineuses : version prête à consommer** (`pois_chiches_conserve`, `lentilles_cuites`, `haricots_rouges_conserve`). Le poids écrit est le poids ACHETÉ. Les versions sèches feraient afficher un poids sec en liste de courses, non achetable.',
      `⚠️ **Ce lot est le n° ${n} sur 4, tous à la même enveloppe.** C'est le risque de doublon le plus élevé de la vague. ${n === 1 ? 'Tu ouvres la série : varie les ancres dès maintenant, ne pose pas trois plats au poulet.' : `Les lots 1 à ${n - 1} sont déjà écrits et intégrés au catalogue ci-dessous — tu es donc confronté à eux automatiquement.`}`,
    ],
  })),
  {
    cle: 'b3', titre: 'B3 — 20 petits-déjeuners', volume: 20, categorie: 'petit_dej',
    prefixe: 'pd', idDebut: 79, idFin: 98,
    wave: '2026-08-01-b3-petits-dejeuners', livre: '2026-08-01',
    kcal: KCAL_PDJ, prot: [24, 28], carb: [52, 62], fat: [12, 16],
    // ⚠️ Corrigé le 2026-08-01 : c'était `libre: 11` — la répartition du lot B1
    // (repas complets) recopiée telle quelle. Elle n'a aucun sens ici : le §4 des
    // repas complets expose 13 ancres carnées, celui du petit-déj en expose 3
    // (`dinde_escalope`, `jambon_blanc`, `saumon_fume`). 11 carnées sur 20 tenaient
    // sous le plafond (3 ancres × 5) mais le saturaient à 73 %, avec la règle
    // « au plus 2 recettes par couple protéine × féculent » par-dessus. Mesuré sur
    // le catalogue : le créneau petit-déj compte 4 recettes carnées sur 78 (5 %).
    // 6 fait passer à 10/98 — un vrai gain sur le salé (demandé au §3) sans forcer.
    regimes: { libre: 6, vegetarien: 7, vegan: 7, sansGluten: 9 },
    etapes: [4, 7],
    specifique: [
      '**Base 430–480 kcal, 24 à 28 g de protéines.** C\'est la bande la mieux couvrante, mesurée : les recettes de 420 à 500 kcal servent en moyenne 8 profils sur 12, contre 2,8 pour celles de 250 à 340 kcal et 4,5 pour celles de 620 à 760. **N\'écris pas de petits-déjeuners minuscules** — une base trop basse plafonne trop tôt pour les gros gabarits.',
      'Féculent **50 à 65 g pesés secs** : c\'est la marge de manœuvre du haut. Ancre grasse 12 à 16 g.',
      '**Le porridge et le pudding sont SATURÉS**, et le contrôle anti-doublons les refusera : 6 recettes partagent déjà le triplet (petit-déj, whey, flocons d\'avoine) et 6 autres (petit-déj, yaourt de soja protéiné, sans féculent). Vise le **salé** (œufs brouillés, tofu brouillé, tartine complète, galette), les pancakes, les bowls chauds sans avoine.',
      'Sous-lot sans gluten : `flocons_avoine` **interdit** (socle de 36 recettes existantes). Autorisés : `sarrasin`, `millet`, `quinoa`, `polenta`, `galette_riz`, `chataigne`, `patate_douce`, `pain_sans_gluten`.',
      '**Aucun repos au froid de plus de 10 minutes.** Six recettes actuelles déclarent 5 minutes alors qu\'elles exigent une nuit au frais (pd02, pd31, pd34, pd47, pd54, pd72). Un plan affiché le matin doit être cuisinable le jour même.',
    ],
  },
  // ── Vague B4 : l'enveloppe CORRIGÉE ────────────────────────────────────────
  // Les six premiers lots ont été commandés dans une enveloppe calée sur une borne de
  // scaling qui n'existait plus (`protein` min 1,0 → 0,5 le 2026-07-30). Mesuré sur le
  // moteur : cette enveloppe plafonnait sous la cible des gros gabarits — `H 110 masse`
  // n'était servi que par 24 % des repas complets et 23 petits-déj sur 98.
  {
    cle: 'b4-repas', titre: 'B4 — 20 repas complets, enveloppe corrigée', volume: 20, categorie: 'repas_complet',
    prefixe: 'rep', idDebut: 251, idFin: 270,
    wave: '2026-08-02-b4-repas-denses', livre: '2026-08-02',
    kcal: [620, 700], prot: [38, 44], carb: [62, 78], fat: [18, 24],
    // La densité protéique impose ~40 g de protéines à 650 kcal : les ancres végétales
    // peu denses (pois chiches secs, lentilles entières) deviennent inécrivables — mesuré,
    // 0 % de compositions plausibles. D'où moins de vegan que dans B1, et sur des ancres
    // DENSES uniquement (soja texturé, seitan, tofu, protéine végétale).
    regimes: { libre: 12, vegetarien: 4, vegan: 4, sansGluten: 9 },
    etapes: [4, 7],
    specifique: [
      '**Base 620–700 kcal ET 38 à 44 g de protéines. Les deux bornes ensemble, jamais l\'une sans l\'autre.** Mesuré sur le moteur : 700 kcal avec 36 g de protéines rend 8,9 profils sur 12, MOINS bien que l\'ancienne enveloppe. C\'est la densité qui porte le gain, pas les calories.',
      '**Féculent 100 à 125 g pesés SECS.** C\'est lui qui va chercher les gros gabarits — il monte jusqu\'à ×1,8 et n\'a aucun plafond absolu.',
      'Ancre grasse `fat` + `scalable`, **18 à 24 g** de lipides.',
      '⚠️ **Ancres protéiques DENSES obligatoires.** Il te faut ~40 g de protéines dans la base : une ancre qui coûte plus de 8 kcal par gramme de protéine ne les atteint pas sans faire exploser les calories. À privilégier : viandes et poissons maigres, `blanc_oeuf`, `cottage_cheese`, `soja_texture`, `seitan`, `proteine_vegetale`, `tofu_ferme`.',
      '⚠️ **Ce que cette enveloppe NE dégrade PAS, contrairement à ce qu\'on pourrait croire.** Testé par paires, même composition aux deux enveloppes : `pois_chiches` secs est **infaisable aux DEUX** (l\'arithmétique ne tient pas plus à 550 kcal qu\'à 660), `lentilles_vertes` sèches rendent 2 profils sur 12 **aux deux**. Ces ancres n\'ont pas été tuées par la nouvelle enveloppe, elles n\'ont jamais fonctionné. En revanche `poulet + riz` passe de 11 à **12/12**, `bœuf + pâtes` de 10 à **11/12**, et `tofu + quinoa` reste à 6 — les quantités restent plausibles (136 g de poulet cru, 81 g de riz sec).',
      '⚠️ **Ce lot est jugé sur le MIDI ET LE SOIR** — un repas complet est servi aux deux créneaux, et la cible du soir est plus basse (415 kcal au minimum contre 459 le midi). `check:enveloppe` retient le PIRE des deux.',
      '**Légumineuses : version prête à consommer** (`pois_chiches_conserve`, `lentilles_cuites`, `haricots_rouges_conserve`) si tu en emploies en complément. Le poids écrit est le poids ACHETÉ.',
    ],
  },
  {
    cle: 'b4-pdej', titre: 'B4 — 12 petits-déjeuners, enveloppe corrigée', volume: 12, categorie: 'petit_dej',
    prefixe: 'pd', idDebut: 99, idFin: 110,
    wave: '2026-08-02-b4-pdej-denses', livre: '2026-08-02',
    kcal: [520, 580], prot: [30, 34], carb: [58, 70], fat: [15, 20],
    regimes: { libre: 3, vegetarien: 5, vegan: 4, sansGluten: 6 },
    etapes: [4, 7],
    specifique: [
      '**Base 520–580 kcal ET 30 à 34 g de protéines. Les deux bornes ensemble.** Monter les calories sans monter la protéine dégrade la couverture — c\'est mesuré, pas supposé.',
      '⚠️ **Les féculents LÉGERS plafonnent ce créneau.** Mesuré : patate douce et pomme de terre ne dépassent pas 6 profils sur 12 même au centre de l\'enveloppe — à 20 g de glucides aux 100 g, un facteur ×1,8 ne suffit pas à nourrir un gros gabarit. Emploie des féculents DENSES : `flocons_avoine`, `sarrasin`, `millet`, `quinoa`, `polenta`, `pain_complet`, `pain_seigle`, `chataigne`.',
      '**Ce qui monte le plus haut, mesuré** : une ancre maigre et dense (`skyr`, `fromage_blanc_0`, `cottage_cheese`, `blanc_oeuf`, `yaourt_soja_proteine`, `whey`, `proteine_vegetale`) posée sur un féculent dense — `skyr` + `sarrasin` passe de 10 à 12 profils servis en changeant d\'enveloppe.',
      '⚠️ **La seule composition que cette enveloppe DÉGRADE : l\'œuf entier sur pain.** Testé par paires, elle passe de 7 à **5 profils sur 12** — l\'œuf entier coûte 10,9 kcal par gramme de protéine, et à 32 g de protéines la base demande 182 g d\'œuf pour seulement 46 g de pain. Ne bâtis pas ce lot sur `oeuf_entier` seul ; associe-le à une ancre maigre, ou passe aux blancs.',
      'Ancre grasse `fat` + `scalable`, **15 à 20 g** de lipides.',
      '**Aucun repos au froid de plus de 10 minutes.** Un plan affiché le matin doit être cuisinable le jour même.',
      '⚠️ **Garde 2 recettes du lot dans le BAS de l\'enveloppe** (520–535 kcal, 32–34 g de protéines, donc très denses). Le catalogue vient d\'être corrigé d\'un excès de bases basses ; refaire l\'erreur en miroir priverait les profils en sèche mince. Une enveloppe unique sert une population unique.',
    ],
  },

  // ── Vague B7 : les cellules affamées, mesurées et non plus supposées ────────
  //
  // POURQUOI CE LOT EXISTE, ET POURQUOI IL EST VÉGÉTAL.
  // `npm run mesure:vivier` (ajouté le 2026-08-02) croise pour la première fois GABARIT ×
  // RÉGIME × CRÉNEAU — le croisement que voit un utilisateur réel, et qu'aucune commande
  // n'imprimait : le mode par défaut compte par gabarit et ignore le régime, `--seuils`
  // compte par recette et ignore le profil. Résultat : les 15 cellules les plus pauvres en
  // familles sont TOUTES vegan ou vegan+sans gluten. Les pires :
  //   · collation     · F 55 sèche  · vegan+SG →  3 recettes ·  2 familles
  //   · collation     · F 55 sèche  · vegan    →  6 recettes ·  3 familles
  //   · repas complet · F 55 sèche  · vegan+SG →  4 recettes ·  4 familles
  //   · petit-déj     · H 110 masse · vegan+SG → 12 recettes ·  9 familles
  // Les mêmes cellules en « aucun régime » comptent 30 à 86 recettes. L'écart n'est pas
  // une impression, il est d'un facteur 10.
  //
  // ⚠️ Ce n'est PAS un virage éditorial vers le végétal (cf. `project-vegan-argument-de-vente` :
  // un régime supporté parmi 7, sans emphase). C'est de l'arithmétique de couverture :
  // mesuré sur les 166 recettes vegan du catalogue, **une recette vegan entre dans TOUS les
  // pools de régime** — halal, pescatarien, sans lactose, végétarien, sans porc : 166/166.
  // Une recette carnée n'entre que dans un. À volume égal, c'est le seul type de recette qui
  // ne laisse personne dehors.
  //
  // ⚠️ ET LE BLOCAGE N'A PAS LE MÊME SENS AUX DEUX BOUTS — mesuré drapeau par drapeau :
  //   · en bas (F 55 sèche, cible collation 148 kcal / 13 g P) tout est TROP GROS :
  //     31 des 34 candidates lèvent `over_target_kcal` ;
  //   · en haut (H 110 masse, cible petit-déj 892 kcal / 41 g P) tout est TROP PETIT :
  //     21 des 33 lèvent `under_target_kcal`.
  // Une enveloppe unique ne peut pas répondre aux deux — c'est la COMPOSITION qui le fait,
  // et c'est pour ça que les consignes ci-dessous parlent d'ancres, pas seulement de bornes.
  {
    cle: 'b7-pdej', titre: 'B7 — 12 petits-déjeuners végétaux, ancres neuves', volume: 12, categorie: 'petit_dej',
    prefixe: 'pd', idDebut: 111, idFin: 122,
    wave: '2026-08-02-b7-pdej-vegan', livre: '2026-08-02',
    kcal: [510, 570], prot: [30, 36], carb: [56, 70], fat: [14, 19],
    regimes: { libre: 0, vegetarien: 0, vegan: 12, sansGluten: 9 },
    etapes: [4, 7],
    // Le petit-déj est le créneau le plus GÉNÉREUX des trois, et c'est ce qui en fait le
    // meilleur investissement. Balayé ancre par ancre à 540 kcal / 33 g P : `tempeh`,
    // `tofu_ferme`, `tofu_fume`, `edamame`, `seitan` rendent tous **12/12 profils et 24/24
    // cellules vegan** — autant que `yaourt_soja_proteine` et `proteine_vegetale`, qui sont
    // saturés. Cinq ancres neuves entièrement employables : le créneau ne demande qu'à être
    // ouvert. Les légumineuses SÈCHES, elles, plafonnent à 7/12 — elles restent hors jeu.
    refsEnPlus: ['soja_texture', 'tempeh', 'edamame', 'seitan', 'riz_complet', 'mais', 'nouilles_riz'],
    specifique: [
      '**Base 510–570 kcal ET 30 à 36 g de protéines. Les deux bornes ensemble, jamais l\'une sans l\'autre.** Monter les calories sans monter la protéine dégrade la couverture — c\'est mesuré sur le moteur, pas supposé.',
      '🎯 **TOUTES les recettes de ce lot sont végétaliennes.** Ce n\'est pas une orientation éditoriale, c\'est de l\'arithmétique : une recette végétalienne entre AUSSI dans les pools halal, pescatarien, sans lactose, végétarien et sans porc (mesuré : 166 recettes vegan du catalogue, 166 fois sur 166). Aucun autre type de recette ne sert autant de monde à volume égal.',
      '🎯 **VARIE LES ANCRES — c\'est la raison d\'être du lot.** Les deux ancres végétales du créneau sont saturées : `yaourt_soja_proteine` et `proteine_vegetale` portent à elles seules 15 des 44 petits-déjeuners vegan existants. **Au plus 2 recettes du lot peuvent les employer comme ancre principale.** Les 10 autres se répartissent sur : `tofu_ferme`, `tofu_fume`, `tempeh`, `edamame`, `soja_texture`, `seitan`. Ces six-là rendent 12 profils sur 12 à cette enveloppe — c\'est mesuré, elles ne sont pas un pis-aller.',
      '⚠️ **Les légumineuses SÈCHES ne tiennent pas ce créneau, ne les prends pas comme ancre principale.** Mesuré à 540 kcal / 33 g P : les lentilles corail rendent 7 profils sur 12, les lentilles vertes et les haricots blancs 6, `pois_chiches` 1. Il faut 95 à 160 g de légumineuse sèche pour 33 g de protéines, et il ne reste alors plus assez de calories pour un vrai féculent. En appoint (20–30 g), aucun problème — `pois_chiches_conserve` et `lentilles_cuites` sont là pour ça.',
      '⚠️ **Un vrai féculent `carb` et `scalable` dans CHAQUE recette, 45 à 80 g pesés secs.** C\'est la cause première du chantier : les 13 petits-déjeuners du catalogue sans féculent servent **2,7 profils sur 12** en moyenne, contre **9,0** pour les 97 qui en portent un. Sans féculent, le moteur n\'a rien à étirer pour nourrir un gros gabarit.',
      '⚠️ **Féculents DENSES.** `patate_douce` et `pomme_de_terre` ne dépassent pas 6 profils sur 12 même au centre de l\'enveloppe : à 20 g de glucides aux 100 g, le facteur de montée ne suffit pas. Emploie `flocons_avoine`, `sarrasin`, `millet`, `quinoa`, `polenta`, `pain_complet`, `pain_seigle`, `chataigne`, `riz_complet`.',
      'Sous-lot sans gluten (9 des 12) : `flocons_avoine`, `pain_complet`, `pain_seigle` **interdits**. Autorisés : `sarrasin`, `millet`, `quinoa`, `polenta`, `galette_riz`, `chataigne`, `riz_complet`, `nouilles_riz`, `mais`, `pain_sans_gluten`. ⚠️ `seitan` contient du gluten : il ne peut porter aucune des 9.',
      'Ancre grasse `fat` + `scalable`, **14 à 19 g** de lipides.',
      '**Vise le SALÉ.** Le porridge et le pudding sont saturés, le contrôle anti-doublons les refusera. Tofu brouillé, galette de sarrasin garnie, bowl chaud salé, tartine complète, pancakes salés, edamame sur riz complet : c\'est là qu\'est la place libre.',
      '**Aucun repos au froid de plus de 10 minutes.** Un plan affiché le matin doit être cuisinable le jour même.',
    ],
  },
  {
    cle: 'b7-repas', titre: 'B7 — 10 repas complets végétaux, pour les cellules affamées', volume: 10, categorie: 'repas_complet',
    prefixe: 'rep', idDebut: 271, idFin: 280,
    wave: '2026-08-02-b7-repas-vegan', livre: '2026-08-02',
    kcal: [600, 660], prot: [35, 40], carb: [64, 78], fat: [18, 23],
    regimes: { libre: 0, vegetarien: 0, vegan: 10, sansGluten: 7 },
    etapes: [4, 7],
    // Enveloppe ABAISSÉE par rapport à B4 (620–700 / 38–44), et c'est délibéré : B4 notait
    // que sa densité rendait les ancres végétales inécrivables et n'avait donc commandé que
    // 4 recettes vegan sur 20. Balayé aux deux points 590/33 et 650/38, le classement des
    // ancres est le MÊME — `yaourt_soja_proteine`, `seitan`, `edamame`, `proteine_vegetale`,
    // `soja_texture` tiennent 10 à 12 profils sur 12 ; tofu et légumineuses sèches restent
    // sous le seuil aux deux. La densité n'est donc pas ce qui les tue, et l'enveloppe basse
    // rend `feves` employable (8/12 à 650/38). ⚠️ `edamame` à 12/12 et 23/24 cellules vegan
    // est la vraie trouvaille : quasi inemployé en repas complet, et parfaitement calibré.
    specifique: [
      '**Base 600–660 kcal ET 35 à 40 g de protéines. Les deux bornes ensemble.** Mesuré sur le moteur : monter les calories sans monter la protéine rend MOINS de profils servis, pas plus.',
      '🎯 **TOUTES les recettes de ce lot sont végétaliennes**, et pour une raison arithmétique : une recette végétalienne entre aussi dans les pools halal, pescatarien, sans lactose, végétarien et sans porc (166 fois sur 166 au catalogue). Le créneau visé est la cellule la plus affamée du catalogue après les collations — **une femme de 55 kg en sèche, vegan et sans gluten, dispose de 4 repas complets sur 270**.',
      '🎯 **Les ancres qui TIENNENT cette enveloppe, mesurées une par une** (profils servis sur 12) : `edamame` 12, `seitan` 12, `yaourt_soja_proteine` 12, `proteine_vegetale` 11-12, `soja_texture` 10-11, `feves` 8. **Privilégie `edamame` et `feves`** : elles sont quasi inemployées en repas complet alors qu\'elles sont parfaitement calibrées. `soja_texture` et `proteine_vegetale` portent déjà 38 et 34 recettes — **au plus 2 recettes du lot chacune**.',
      '⚠️ **Ce qui NE tient PAS cette enveloppe, et ce n\'est pas une question de goût** : `tofu_ferme` 4 profils sur 12, `tofu_fume` 4, `tofu_soyeux` 3, `pois_chiches` secs 2, `haricots_noirs` 4, `lentilles_vertes` 5, `haricots_blancs` 5, `lentilles_corail` 7, `tempeh` 7. Toutes coûtent trop de calories par gramme de protéine : à 37 g de protéines elles remplissent l\'assiette avant le féculent, et le moteur n\'a plus rien à étirer. Elles restent excellentes **en appoint** (30–60 g), jamais comme ancre principale.',
      '🎯 **L\'appoint n\'est pas un détail : il crée une FAMILLE À PART ENTIÈRE.** L\'application regroupe les recettes par l\'ENSEMBLE de leurs ingrédients protéiques × leur féculent. `edamame` + `quinoa` et `edamame` + `haricots_rouges` + `quinoa` sont donc deux familles distinctes, et c\'est la variété perçue qui en profite — deux plats de la même famille dans une semaine, l\'utilisateur les voit comme une répétition. ➡️ **Associe une ancre dense à une légumineuse en appoint** : tu doubles les combinaisons sans sortir de l\'enveloppe. ⚠️ Le plafond de 2 recettes par `ref` protéique compte AUSSI les appoints — ne pose pas la même légumineuse partout.',
      '⚠️ **Le plafond est serré, compte avant d\'écrire** : 6 ancres principales employables × 2 = 12 places pour 10 recettes, et `seitan` est réservé aux 3 recettes avec gluten. Il te faut au moins 5 ancres distinctes, et tu ne peux en poser aucune trois fois.',
      '⚠️ **Un vrai féculent `carb` et `scalable`, 95 à 125 g pesés SECS, dans CHAQUE recette.** C\'est lui qui va chercher les gros gabarits — il monte sans plafond absolu. Les 6 repas complets du catalogue sans féculent servent **1,5 profil sur 12** en moyenne, contre 8,7 pour les 264 autres.',
      'Ancre grasse `fat` + `scalable`, **18 à 23 g** de lipides.',
      'Sous-lot sans gluten (7 des 10) : `seitan` en est exclu (il est fait de gluten), ainsi que `pates_completes`, `pates_semoule`, `boulgour`, `semoule_couscous`, `nouilles_completes`, `tortilla_complete`, `pain_complet`, `pain_pita_complet`. Autorisés : `quinoa`, `sarrasin`, `millet`, `polenta`, `riz_basmati`, `riz_complet`, `nouilles_riz`, `patate_douce`, `pomme_de_terre`, `mais`, `wrap_sans_gluten`, `pain_sans_gluten`.',
      '⚠️ **Ce lot est jugé sur le MIDI ET LE SOIR** — un repas complet est servi aux deux créneaux, et la cible du soir est plus basse. `check:enveloppe` retient le PIRE des deux.',
      '**Légumineuses : version prête à consommer** (`pois_chiches_conserve`, `lentilles_cuites`, `haricots_rouges_conserve`) quand tu en emploies en appoint. Le poids écrit est le poids ACHETÉ ; la version sèche ferait afficher un poids sec en liste de courses.',
    ],
  },
  {
    cle: 'b7-coll', titre: 'B7 — 8 collations végétales, la cellule la plus affamée du catalogue', volume: 8, categorie: 'collation',
    prefixe: 'col', idDebut: 87, idFin: 94,
    wave: '2026-08-02-b7-collations-vegan', livre: '2026-08-03',
    kcal: [170, 320], prot: [13, 27], carb: [16, 40], fat: [5, 12],
    regimes: { libre: 0, vegetarien: 0, vegan: 8, sansGluten: 6 },
    etapes: [2, 3],
    // ⚠️ LE CONSTAT LE PLUS IMPORTANT DE CE LOT, ET IL CONTREDIT LA COMMANDE ATTENDUE.
    // D19 demandait « des couples protéine × féculent NEUFS ». Sur la collation, le côté
    // PROTÉINE est arithmétiquement fermé : balayé sur 18 ancres végétales aux deux
    // sous-formats, seules `yaourt_soja_proteine`, `seitan`, `proteine_vegetale` et
    // `soja_texture` gardent un vrai féculent dans l'assiette. Toutes les autres — tofu,
    // tempeh, edamame, les 8 légumineuses — consomment le budget calorique entier avec
    // l'ancre seule et laissent 0 à 3 g de féculent, ce qui reproduit exactement le défaut
    // « sans `carb` » que le chantier veut supprimer. Ce n'est pas un manque d'imagination
    // du rédacteur : à 190 kcal pour 15 g de protéines, il faut 13 g de protéines pour
    // 100 kcal, et trois ancres du catalogue seulement y arrivent.
    // ➡️ La variété se commande donc sur le FÉCULENT, pas sur l'ancre. `familyKey` étant
    // `protéine × féculent`, un féculent neuf crée bien une famille neuve.
    // `tempeh` est le SEUL ajout côté ancre, et il ne vaut que pour le gros format —
    // vérifié sur le moteur : 13 g de féculent conservés et 4 profils sur 12 à 300 kcal /
    // 25 g de protéines, contre 9 g et 4/12 en format léger (où il tombe donc sous la
    // règle « un vrai féculent »). Sans lui, le plafond de 2 recettes par ancre ne laisse
    // AUCUN degré de liberté : 4 ancres × 2 = 8 places pour 8 recettes.
    refsEnPlus: ['millet', 'riz_complet', 'nouilles_riz', 'patate_douce', 'tempeh'],
    sousFormats: [
      { nom: 'léger dense', ids: '`col87` → `col92` · 6 recettes', kcal: [170, 210], prot: [13, 16], carb: [16, 26], fat: [5, 8] },
      { nom: 'gros format', ids: '`col93` → `col94` · 2 recettes', kcal: [280, 320], prot: [23, 27], carb: [28, 40], fat: [8, 12] },
    ],
    specifique: [
      'Les **deux sous-formats se livrent ENSEMBLE**. Aucune collation ne peut couvrir les 12 profils — la cible du créneau va de 148 à 455 kcal, soit 3,1×, quand le moteur n\'étire que d\'environ 1,8×. C\'est l\'**union** des deux formats qui couvre, jamais une recette seule.',
      '🎯 **La cellule visée est la plus affamée de tout le catalogue** : une femme de 55 kg en sèche, végétalienne et sans gluten, dispose de **3 collations sur 86, réparties sur 2 familles**. Sa cible est de 148 kcal pour 13 g de protéines. Le catalogue lui propose 34 collations compatibles avec son régime : **31 sont trop grosses** pour elle (drapeau `over_target_kcal`), il en reste 3. C\'est le format léger qui la sert, pas le gros.',
      '🎯 **VARIE LE FÉCULENT, pas l\'ancre — et c\'est l\'inverse de ce qu\'on attendrait.** À cette densité, seules quatre ancres du catalogue laissent encore la place d\'un vrai féculent en **format léger** : `yaourt_soja_proteine`, `proteine_vegetale`, `soja_texture` et `seitan`. Toutes les autres — `edamame`, `lentilles_cuites`, `pois_chiches`, le tofu sous toutes ses formes — remplissent le budget calorique à elles seules et ne laissent que 0 à 3 g de féculent. Elles sont donc **interdites comme ancre principale en format léger**, et parfaitement bienvenues en appoint. ➡️ **En gros format, `tempeh` s\'ajoute à la liste** (mesuré : 13 g de féculent, 4 profils sur 12) : c\'est une famille neuve, prends-la.',
      '⚠️ **Le plafond de 2 recettes par ancre est SERRÉ sur ce lot, compte avant d\'écrire.** Cinq ancres employables × 2 = 10 places pour 8 recettes, dont `seitan` réservé aux 2 recettes avec gluten. Il te reste donc 4 ancres pour les 6 sans gluten, soit 8 places pour 6 : **tu ne peux pas poser trois recettes sur le yaourt de soja**. Répartis dès la première.',
      '⚠️ **Chaque recette porte un vrai féculent `carb` et `scalable`.** C\'est la contrainte non négociable du lot : 24 collations du catalogue n\'en ont aucun et servent **5,8 profils sur 12** contre 8,0 pour les 62 qui en portent un. Une collation sans féculent ne peut pas s\'étirer, et c\'est précisément ce qui a vidé la cellule visée.',
      '🎯 **Les couples déjà pris sur ce créneau, en végétal** : `yaourt_soja_proteine` sans féculent (8 recettes), `proteine_vegetale` sans féculent (4), `proteine_vegetale` + `flocons_avoine` (2), + `sarrasin` (2), + `chataigne` (2), `yaourt_soja_proteine` + `galette_riz` (2), + `chataigne` (2), `edamame` + `mais` (2). **Les féculents encore libres avec ces ancres** : `quinoa`, `millet`, `polenta`, `riz_complet`, `nouilles_riz`, `patate_douce`, `pain_sans_gluten`, `mais`. Va les chercher.',
      '⚠️ **La règle des 12 g de lipides ne s\'applique PAS ici.** 12 g de lipides valent 108 kcal, soit 55 % d\'une collation de 190 kcal. L\'ancre grasse `fat` + `scalable` reste obligatoire, elle est simplement petite : 5 à 8 g en format léger, 8 à 12 g en gros format.',
      'Sous-lot sans gluten (6 des 8) : `seitan`, `flocons_avoine`, `pain_complet` et `pain_seigle` en sont exclus. Autorisés : `quinoa`, `sarrasin`, `millet`, `polenta`, `galette_riz`, `chataigne`, `riz_complet`, `nouilles_riz`, `patate_douce`, `mais`, `pain_sans_gluten`.',
      '**2 à 3 étapes, 10 minutes maximum, aucun repos au froid de plus de 10 minutes.** Une collation se prépare debout.',
    ],
  },
];

// ── Outils d'analyse du catalogue ────────────────────────────────────────────

const GLUTEN_INTERDIT = (ref: string) => !restrictionsOkFor([ref]).includes('gluten_free');

/** Refs réellement employés par les recettes de cette catégorie → pertinence garantie. */
function refsPertinents(cat: Recette['category'], enPlus: string[] = []): string[] {
  const vus = new Set<string>();
  for (const r of RECIPES) if (r.category === cat) for (const i of r.ingredients) vus.add(i.ref);
  // Les 9 refs créés le 2026-07-29 ne sont employés nulle part encore : on les force.
  for (const r of ['pois_chiches_conserve', 'lentilles_cuites', 'haricots_rouges_conserve',
    'tofu_fume', 'falafel', 'tahini', 'boisson_soja', 'pain_sans_gluten', 'wrap_sans_gluten']) {
    if (REFS[r]) vus.add(r);
  }
  // `proteine_vegetale` (73 g de protéines aux 100, 5,2 kcal par gramme de protéine) est
  // l'ancre végétale la plus dense du catalogue. Elle n'était exposée qu'au petit-déj et
  // aux collations par simple accident d'usage — or c'est en repas complet, où l'enveloppe
  // corrigée demande ~40 g de protéines, qu'elle devient indispensable : les légumineuses
  // sèches y sont mathématiquement inécrivables (143 g de lentilles sèches pour 40 g de P).
  if (REFS.proteine_vegetale) vus.add('proteine_vegetale');
  // Refs ouverts explicitement par le lot, pour pouvoir commander un couple NEUF sur un
  // créneau enfermé dans sa palette (cf. `Lot.refsEnPlus`).
  for (const r of enPlus) if (REFS[r]) vus.add(r);
  return [...vus].filter((r) => REFS[r]).sort();
}

/**
 * Un ref peut-il PORTER la protéine d'un plat ?
 *
 * Le seul critère précédent — « ≥ 7 g de protéines aux 100 » — laissait passer les amandes,
 * les flocons d'avoine, le chocolat noir et les graines de courge : riches en protéines dans
 * l'absolu, mais dont l'énergie est du gras ou de l'amidon. Tant que ce tableau se servait
 * dans les 123 refs du catalogue, ces intrus étaient noyés sous les viandes ; une fois
 * restreint au §4 d'un lot petit-déj, ils occupaient toute la table.
 *
 * Trois conditions, qui traduisent le §6.1 (« ancre protéine + scalable ») en arithmétique :
 *  - au moins 7 g de protéines aux 100 g (seuil d'origine, conservé) ;
 *  - la protéine pèse ≥ 25 % des calories du ref — c'est ce qui écarte les corps gras ;
 *  - aucun plafond absolu ≤ 40 g, sinon l'ancre ne peut pas atteindre la fourchette
 *    protéique d'une base (la levure maltée, plafonnée à 20 g, porte 10 g au maximum).
 */
function estAncreProteique(ref: string): boolean {
  const p = REFS[ref].per_100;
  if (p.protein < 7 || p.kcal <= 0) return false;
  if ((p.protein * 4) / p.kcal < 0.25) return false;
  if (REFS[ref].abs_max_qty != null && REFS[ref].abs_max_qty <= 40) return false;
  // Quatrième condition, ajoutée le 2026-08-02 : le CATALOGUE doit s'en servir comme d'une
  // protéine. Les trois critères arithmétiques laissaient passer `sauce_soja` (40 kcal,
  // 7,2 g de protéines aux 100 g — donc 72 % de calories protéiques sur le papier), qui
  // figurait dans la table « ancres encore OUVERTES » alors que ses 13 emplois sont TOUS
  // en `flavor`, à la cuillère. Un rédacteur ne bâtit pas un plat sur de la sauce soja.
  const role = roleDominant(ref);
  return role === 'protein' || role === 'dairy' || role === '—';
}

/** Rôle macro dominant d'un ref, tel qu'il est utilisé dans le catalogue. */
function roleDominant(ref: string): string {
  const compte: Record<string, number> = {};
  for (const r of RECIPES) for (const i of r.ingredients) if (i.ref === ref) compte[i.macro_role] = (compte[i.macro_role] ?? 0) + 1;
  const e = Object.entries(compte).sort((a, b) => b[1] - a[1])[0];
  return e ? e[0] : '—';
}

/** Combien de recettes de la catégorie emploient ce ref (signal de saturation). */
function usage(ref: string, cat: Recette['category']): number {
  return RECIPES.filter((r) => r.category === cat && r.ingredients.some((i) => i.ref === ref)).length;
}

/** Triplets (protéines × féculents) déjà occupés 2 fois ou plus → interdits (règle R4). */
function tripletsSatures(cat: Recette['category']): { cle: string; n: number; ids: string[] }[] {
  const m = new Map<string, string[]>();
  for (const r of RECIPES.filter((x) => x.category === cat)) {
    const p = r.ingredients.filter((i) => i.macro_role === 'protein').map((i) => i.ref).sort();
    const c = r.ingredients.filter((i) => i.macro_role === 'carb').map((i) => i.ref).sort();
    const cle = `${p.join('+') || '∅'} × ${c.join('+') || 'sans féculent'}`;
    m.set(cle, [...(m.get(cle) ?? []), r.id]);
  }
  return [...m.entries()].filter(([, ids]) => ids.length >= 2)
    .map(([cle, ids]) => ({ cle, n: ids.length, ids })).sort((a, b) => b.n - a.n);
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Ensembles de refs COMPLETS des recettes existantes de la catégorie.
 * Indispensable : les règles R1 (Jaccard ≥ 0,60) et R2 (> 3 refs communs) portent sur
 * l'ensemble ENTIER, pas seulement sur le couple protéine × féculent. Sans cette table
 * le rédacteur ne peut pas les respecter — il devine, et le contrôle rejette au retour.
 */
function tableEnsembles(cat: Recette['category']): string {
  const l = RECIPES.filter((r) => r.category === cat)
    .map((r) => `| ${r.id} | ${r.ingredients.map((i) => `\`${i.ref}\``).join(' · ')} |`);
  return ['| id | ensemble de refs |', '|---|---|', ...l].join('\n');
}

/**
 * Fréquence de chaque ref sur la catégorie, et refs jamais employés (terrain vierge).
 *
 * ⚠️ `autorises` n'est PAS optionnel, et c'est le correctif du 2026-08-01 : la version
 * précédente balayait `Object.keys(REFS)` — les 123 refs du catalogue — donc le §7
 * annonçait « terrain entièrement vierge » sur des ingrédients que le §4 du même
 * fichier interdisait deux pages plus haut (`poulet_filet`, `cabillaud`, `mozzarella`…).
 */
function frequences(cat: Recette['category'], autorises: string[]): { chauds: string; vierges: string[] } {
  const f: Record<string, number> = {};
  for (const r of RECIPES) if (r.category === cat) for (const i of r.ingredients) f[i.ref] = (f[i.ref] ?? 0) + 1;
  const chauds = Object.entries(f).filter(([, n]) => n >= 5).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `\`${k}\` ${n}`).join(' · ');
  const vierges = autorises.filter((k) => !f[k]).sort();
  return { chauds, vierges };
}

/**
 * Couples (protéine × féculent) encore DISPONIBLES — ceux à 0 ou 1 occurrence.
 * C'est le complément indispensable de la liste des saturés : dire ce qui est interdit
 * sans dire ce qui reste ouvert envoie le rédacteur dans un mur invisible. C'est
 * exactement l'erreur qu'avait la première version de ce générateur, dont les « formats
 * à viser » pointaient tous sur des couples déjà saturés.
 *
 * ⚠️ Deuxième version de la même erreur, corrigée le 2026-08-01 : ce tableau se servait
 * dans les 123 refs du catalogue, pas dans les refs autorisés par le §4 du lot. Sur `b3`,
 * 12 des 18 « ancres encore ouvertes » (poulet, bœuf, porc, cabillaud, thon, sardines,
 * crevettes, mozzarella…) n'étaient tout simplement pas employables — le §7 envoyait dans
 * le mur que le §4 venait de construire. Les places libres se comptent donc désormais sur
 * les féculents AUTORISÉS eux aussi, sinon le chiffre annoncé est faux.
 */
function couplesOuverts(cat: Recette['category'], autorises: string[]): { proteine: string; libre: number; occupe: number; deja: number }[] {
  const m = new Map<string, number>();
  for (const r of RECIPES.filter((x) => x.category === cat)) {
    const p = r.ingredients.filter((i) => i.macro_role === 'protein').map((i) => i.ref).sort().join('+') || '∅';
    const c = r.ingredients.filter((i) => i.macro_role === 'carb').map((i) => i.ref).sort().join('+') || 'sans féculent';
    m.set(`${p} × ${c}`, (m.get(`${p} × ${c}`) ?? 0) + 1);
  }
  const feculents = ['sans féculent', ...autorises.filter((k) => {
    const p = REFS[k].per_100;
    return p.carbs >= 20 && p.protein < 15;
  })];
  return autorises.filter(estAncreProteique).map((a) => {
    const libre = feculents.filter((f) => (m.get(`${a} × ${f}`) ?? 0) < 2).length;
    const occupe = [...m.entries()].filter(([k, n]) => k.startsWith(`${a} ×`) && n >= 2).length;
    return { proteine: a, libre, occupe, deja: usage(a, cat) };
  }).filter((x) => x.libre > 0).sort((a, b) => a.occupe - b.occupe || a.deja - b.deja || b.libre - a.libre);
}

function tableRefs(refs: string[], cat: Recette['category']): string {
  const lignes = refs.map((ref) => {
    const d = REFS[ref];
    const p = d.per_100;
    const cap = d.abs_max_qty != null ? `≤ ${d.abs_max_qty}` : '—';
    const basis = d.basis === 'dry' ? 'SEC' : d.basis === 'raw' ? 'cru' : '—';
    const u = usage(ref, cat);
    const gl = GLUTEN_INTERDIT(ref) ? ' ⛔SG' : '';
    return `| \`${ref}\`${gl} | ${d.name} | ${d.unit} | ${fmt(p.kcal)} | ${fmt(p.protein)} | ${fmt(p.carbs)} | ${fmt(p.fat)} | ${basis} | ${cap} | ${u} |`;
  });
  return [
    '| `ref` | Nom affiché | Unité | kcal/100 | P/100 | C/100 | L/100 | Pesée | Max abs. | Déjà utilisé |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...lignes,
  ].join('\n');
}

function exemple(cat: Recette['category'], wave: string): string {
  // On prend une recette RÉELLE de la catégorie, parmi les plus détaillées : c'est le
  // gabarit à imiter, et il vient du catalogue live donc il est forcément valide.
  const r = RECIPES.filter((x) => x.category === cat).sort((a, b) => b.instructions.length - a.instructions.length)[0];
  return JSON.stringify({
    id: r.id, name: r.name, category: r.category,
    tags: r.tags, base_servings: r.base_servings,
    ingredients: r.ingredients, instructions: r.instructions,
    why: r.why,
    // Recalculé depuis la table du §4 plutôt que recopié du catalogue : sinon l'exemple
    // affiche le repère manuel et contredit la table que le rédacteur doit utiliser.
    macros_per_serving: (() => {
      const m = r.ingredients.reduce((s, i) => {
        const p = REFS[i.ref].per_100;
        return { kcal: s.kcal + p.kcal * i.qty / 100, protein: s.protein + p.protein * i.qty / 100,
          carbs: s.carbs + p.carbs * i.qty / 100, fat: s.fat + p.fat * i.qty / 100 };
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      return { kcal: +m.kcal.toFixed(1), protein: +m.protein.toFixed(1), carbs: +m.carbs.toFixed(1), fat: +m.fat.toFixed(1) };
    })(),
    wave,
  }, null, 2);
}

// ── §2 : les facteurs de redimensionnement, LUS DANS LA CONFIG DU MOTEUR ─────

/**
 * ⚠️ Ce tableau était écrit EN DUR, et il mentait depuis le 2026-07-30.
 * Il annonçait `protein | 1,00 | 1,70 | ne descend JAMAIS sous ta quantité`, alors que
 * `config.scaling_factors_by_role.protein` vaut **[0,5 ; 1,7]** — la borne est passée de
 * 1,0 à 0,5 ce jour-là (`ENGINE_VERSION` v25, cf. AGENTS.md), et `CLAUDE.md` §1 l'écrit
 * noir sur blanc. Toute la doctrine du §2 (« écris des quantités de base PETITES, une
 * base grosse ne peut pas descendre ») reposait sur cette borne disparue — et les
 * enveloppes du §3 ont été calées dessus.
 * Il est désormais DÉRIVÉ de la config : il ne peut plus diverger du moteur.
 */
const IMPLICATION: Record<string, string> = {
  protein: 'Porte la protéine du plat. Sa borne basse est le levier qui permet de servir les petits gabarits.',
  carb: 'Le plus élastique, et aucun plafond absolu : c\'est lui qui va chercher les grosses cibles.',
  fat: 'Plafonné en plus par la colonne « Max abs. » du §4.',
  dairy: '**Ne tient aucun plancher protéique** — un laitage qui porte la protéine se déclare `protein`.',
  fruit: '',
};

function tableauFacteurs(): string {
  const f = RECIPE_CONFIG.scaling_factors_by_role as Record<string, [number, number]>;
  const fmtF = (n: number) => n.toFixed(2).replace('.', ',');
  const lignes = Object.entries(f).map(([role, [lo, hi]]) =>
    `| \`${role}\` | ${fmtF(lo)} | ${fmtF(hi)} | ${IMPLICATION[role] ?? ''} |`);
  return [
    '| `macro_role` | Min | Max | Ce que ça implique |',
    '|---|---|---|---|',
    ...lignes,
    '| `vegetable`, `flavor` | fixe | fixe | Jamais redimensionnés → **toujours `"scalable": false`**. |',
  ].join('\n');
}

// Cibles réelles des 12 profils, calculées une seule fois (48 générations de plan).
const CIBLES = PROFILS_REF.map((g) => ({ nom: g.nom, c: ciblesDe(g) }));

/** Recette synthétique minimale, pour MESURER une enveloppe au lieu de l'affirmer. */
function eprouvette(slot: MealType, parts: [string, number, string][]): Recipe {
  const ings = parts.map(([ref, qty, role]) => ({ ref, qty, macro_role: role, scalable: role !== 'vegetable' && role !== 'flavor' }));
  return {
    id: 'eprouvette', name_fr: 'eprouvette', prep_time_min: 20, portions: 1,
    macros_per_portion: macrosForRefIngredients(ings.map((i) => ({ ref: i.ref, qty: i.qty }))),
    ingredients: ings.map((i) => ({ name: REFS[i.ref]?.name ?? i.ref, quantity_g: i.qty, unit: 'g', ref: i.ref, macro_role: i.macro_role, scalable: i.scalable })),
    steps: [], tags: [slot], restrictions_ok: restrictionsOkFor(ings.map((i) => i.ref)),
    objectives: [], sports: [], rest_day_ok: true, why_fr: '',
  } as unknown as Recipe;
}

const CAT_VERS_SLOT: Record<Recette['category'], MealType> = {
  petit_dej: 'breakfast', collation: 'snack', repas_complet: 'lunch',
};

/** Profils servis par une éprouvette, MESURÉ par `adaptRecipe` — jamais estimé. */
function profilsServis(r: Recipe, slot: MealType): number {
  return CIBLES.filter(({ c }) => servable(r, c[slot])).length;
}

// ── Auto-contrôle du brief ───────────────────────────────────────────────────

const CASSE_VEGETARIEN = (ref: string) => !restrictionsOkFor([ref]).includes('vegetarian');
const CASSE_VEGAN = (ref: string) => !restrictionsOkFor([ref]).includes('vegan');

/** Plafond d'occurrences d'une même ancre protéique sur un lot (§7). */
const plafondAncre = (volume: number) => Math.floor(volume * 0.25);

/**
 * Mots entre backticks qui ne désignent PAS un ingrédient : rôles macro, champs du schéma,
 * littéraux. Tout le reste, dans une consigne §3, doit être un `ref` autorisé — c'est ce
 * qui rend la liste ci-dessous volontairement courte. L'élargir sans raison rouvre le trou.
 */
const TERMES_TECHNIQUES = new Set([
  'protein', 'carb', 'fat', 'dairy', 'fruit', 'vegetable', 'flavor',
  'scalable', 'true', 'false', 'ref', 'qty', 'macro_role', 'base_servings',
  'wave', 'category', 'id', 'name', 'tags', 'instructions', 'why', 'macros_per_serving',
  // Les 3 drapeaux BLOQUANTS du moteur : une consigne a le droit de nommer ce qui fera
  // rejeter la recette. Sans eux, le contrôle les prenait pour des `ref` inexistants.
  'over_target_kcal', 'under_target_kcal', 'protein_below_target',
]);

/**
 * Refuse de produire un brief qui se contredit lui-même.
 *
 * Pourquoi ça existe : les quatre défauts trouvés en relisant `b2.md` après livraison
 * étaient tous du même type — une consigne écrite à la main qui parlait d'ingrédients ou
 * de volumes que les tables CALCULÉES du même fichier rendaient impossibles. Un brief
 * incohérent ne se voit pas à la lecture ; il se voit au retour du rédacteur, une
 * conversation entière plus tard. Ces contrôles-là échouent en 200 ms.
 */
function verifieCoherence(lot: Lot, refs: string[]): void {
  const err: string[] = [];
  const autorises = new Set(refs);

  // 1. Aucune consigne §3 ne cite un `ref` que le §4 n'expose pas — ni, a fortiori, un
  //    ref inexistant (`b2.md` recommandait `yaourt_nature` et `petit_suisse`, absents
  //    des 123 refs du catalogue).
  for (const ligne of lot.specifique) {
    for (const [, cite] of ligne.matchAll(/`([a-z0-9_]+)`/g)) {
      if (!autorises.has(cite) && !TERMES_TECHNIQUES.has(cite)) {
        err.push(REFS[cite]
          ? `consigne §3 : \`${cite}\` existe au catalogue mais n'est PAS dans les ${refs.length} refs du §4`
          : `consigne §3 : \`${cite}\` n'existe pas dans ingredients_reference`);
      }
    }
  }

  // 2. La répartition par régime doit couvrir le lot, exactement.
  const { libre, vegetarien, vegan, sansGluten } = lot.regimes;
  const somme = libre + vegetarien + vegan;
  if (somme !== lot.volume) err.push(`régimes : ${libre}+${vegetarien}+${vegan} = ${somme} ≠ ${lot.volume} recettes`);
  if (sansGluten > lot.volume) err.push(`régimes : ${sansGluten} sans gluten demandés pour ${lot.volume} recettes`);

  // 3. Et elle doit être TENABLE avec les refs du §4. Une recette carnée a besoin d'une
  //    ancre carnée, et aucune ancre ne peut porter plus de 25 % du lot : le produit des
  //    deux est un plafond dur. `b2.md` demandait 7 collations carnées avec une seule
  //    ancre disponible, plafonnée à 3.
  const cap = plafondAncre(lot.volume);
  const ancresCarnees = refs.filter((r) => CASSE_VEGETARIEN(r) && estAncreProteique(r));
  if (libre > ancresCarnees.length * cap) {
    err.push(`régimes : ${libre} recettes carnées demandées, mais le §4 n'expose que `
      + `${ancresCarnees.length} ancre(s) carnée(s) (${ancresCarnees.join(', ') || 'aucune'}) `
      + `× ${cap} au plus chacune = ${ancresCarnees.length * cap} maximum`);
  }
  const ancresOvo = refs.filter((r) => CASSE_VEGAN(r) && !CASSE_VEGETARIEN(r));
  if (vegetarien > 0 && ancresOvo.length === 0) err.push('régimes : aucune source œuf/laitage dans le §4');
  if (vegan > 0 && refs.filter((r) => !CASSE_VEGAN(r) && estAncreProteique(r)).length === 0) {
    err.push('régimes : aucune ancre protéique végétale dans le §4');
  }
  if (sansGluten > 0 && refs.filter((r) => !GLUTEN_INTERDIT(r)).length === 0) {
    err.push('régimes : aucun ref sans gluten dans le §4');
  }

  // 4. Les ids commandés doivent être libres. C'est le garde-fou qui empêche de
  //    recommander un lot déjà livré après régénération.
  const pris = new Set(RECIPES.map((r) => r.id));
  const collisions = Array.from({ length: lot.volume }, (_, i) => `${lot.prefixe}${lot.idDebut + i}`).filter((id) => pris.has(id));
  if (collisions.length) err.push(`ids déjà au catalogue : ${collisions.join(', ')} — ce lot est-il déjà livré ?`);

  if (err.length) {
    console.error(`\n❌ ${lot.cle} — brief incohérent, rien n'est écrit :`);
    for (const e of err) console.error(`   · ${e}`);
    process.exit(1);
  }
}

// ── Génération ───────────────────────────────────────────────────────────────

function genere(lot: Lot): string {
  const refs = refsPertinents(lot.categorie, lot.refsEnPlus);
  verifieCoherence(lot, refs);
  const sansGlutenOk = refs.filter((r) => !GLUTEN_INTERDIT(r));
  const trip = tripletsSatures(lot.categorie);
  const ids = Array.from({ length: lot.volume }, (_, i) => `${lot.prefixe}${lot.idDebut + i}`);
  const catFr = { petit_dej: 'petit-déjeuner', collation: 'collation', repas_complet: 'repas complet' }[lot.categorie];

  return `# ${lot.titre}

**Lot autonome.** Tout ce qu'il faut est dans ce fichier : le format de sortie, les ingrédients
autorisés avec leurs macros, les règles, et ce qui est déjà pris dans le catalogue. Tu n'as besoin
d'aucun autre document et d'aucun accès au code.

Généré depuis le catalogue live (${RECIPES.length} recettes) — les valeurs ci-dessous sont exactes.

---

## 1. La commande

**${lot.volume} recettes de catégorie \`${lot.categorie}\` (${catFr}).**

ids à produire, dans cet ordre, sans trou et sans doublon :
\`${ids.join('\`, \`')}\`

Répartition par régime, à respecter exactement. **Les trois lignes sont exclusives** : une
recette tombe dans une seule, et c'est l'ingrédient le plus restrictif qui décide.

| | Nombre |
|---|---|
| **Carnées ou marines** — contiennent viande, volaille ou poisson | **${lot.regimes.libre}** |
| **Végétariennes** — œufs et/ou laitages, **aucune** chair animale | **${lot.regimes.vegetarien}** |
| **Vegan** — aucun produit animal (ni œuf, ni laitage, ni miel) | **${lot.regimes.vegan}** |
| **dont sans gluten, toutes lignes confondues** | **≥ ${lot.regimes.sansGluten}** |

${lot.regimes.libre > 0 ? `Les seules ancres carnées que le §4 t'autorise sur ce créneau : ${refs.filter((r) => CASSE_VEGETARIEN(r) && estAncreProteique(r)).map((r) => `\`${r}\``).join(' · ')}. Aucune ne peut porter plus de ${plafondAncre(lot.volume)} recettes (§7).

` : ''}Le sans-gluten est **transverse** : une recette vegan peut compter dans les deux colonnes. N'écris
jamais le régime dans la recette — il est **déduit** des \`ref\` employés.

---

## 2. Comment l'application utilise ta recette (à lire, ça change tout)

**L'application ne sert jamais la recette telle que tu l'écris.** Un moteur redimensionne chaque
ingrédient marqué \`scalable\` pour tomber sur la cible calorique de la personne, repas par repas.
Ta recette n'est pas un plat, c'est une **enveloppe**.

Les facteurs de redimensionnement, par \`macro_role\` — **lus dans la config du moteur au moment
de générer ce fichier**, donc jamais périmés :

${tableauFacteurs()}

**Ce qui compte n'est PAS d'écrire une base petite, c'est d'écrire une base ÉQUILIBRÉE.** Tous
les rôles redimensionnables descendent à la moitié de ta quantité et montent au moins de moitié :
une base bien répartie s'étire dans les deux sens. Ce qui coince, c'est un ingrédient qui pèse
trop lourd par rapport aux autres — il tape sa borne avant que la cible soit atteinte.

Mesuré en passant la même composition au moteur à différentes tailles de base, sur les 12 profils :

${(() => {
    const slot = CAT_VERS_SLOT[lot.categorie];
    const arch: Record<Recette['category'], (k: number) => [string, number, string][]> = {
      repas_complet: (k) => [['poulet_filet', Math.round(0.20 * k), 'protein'], ['riz_basmati', Math.round(0.155 * k), 'carb'], ['huile_olive', Math.round(0.022 * k), 'fat'], ['brocoli', 120, 'vegetable']],
      petit_dej: (k) => [['skyr', Math.round(0.28 * k), 'protein'], ['sarrasin', Math.round(0.13 * k), 'carb'], ['amandes', Math.round(0.03 * k), 'fat'], ['myrtilles', 90, 'fruit']],
      collation: (k) => [['skyr', Math.round(0.45 * k), 'protein'], ['galette_riz', Math.round(0.10 * k), 'carb'], ['amandes', Math.round(0.04 * k), 'fat'], ['framboises', 60, 'fruit']],
    };
    // Le CENTRE de l'enveloppe du lot est toujours un palier : sans lui, le tableau
    // mesure tout sauf ce qu'on demande au rédacteur d'écrire.
    const centre = Math.round((lot.kcal[0] + lot.kcal[1]) / 2);
    const base = lot.categorie === 'collation' ? [130, 180, 230, 280, 330] : lot.categorie === 'petit_dej' ? [430, 500, 560, 620, 700, 800] : [500, 560, 620, 700, 800, 900];
    const paliers = [...new Set([...base, centre])].sort((a, b) => a - b);
    const lignes = paliers.map((k) => {
      const r = eprouvette(slot, arch[lot.categorie](k));
      const m = (r as unknown as { macros_per_portion: { kcal: number; protein_g: number } }).macros_per_portion;
      const n = profilsServis(r, slot);
      const dansLot = m.kcal >= lot.kcal[0] && m.kcal <= lot.kcal[1];
      return `| ${Math.round(m.kcal)} kcal · ${Math.round(m.protein_g)} g P | ${n} / 12 |${dansLot ? ' ← l\'enveloppe de CE lot' : ''}`;
    });
    return ['| Base écrite | Profils servis | |', '|---|---|---|', ...lignes].join('\n');
  })()}

Retiens-en la ligne de crête : trop bas, la recette ne monte pas jusqu'aux gros gabarits ; trop
haut, elle sur-sert les petits. L'enveloppe du §3 est le point mesuré le plus couvrant — **tiens-la
sans chercher à la déborder dans un sens ou dans l'autre**.

⚠️ **Ne vise pas le 12/12.** Le tableau ci-dessus montre UNE composition, et une composition
peut atteindre 12. Une ENVELOPPE, non : balayée sur les 250 recettes du catalogue, la moyenne
la plus haute jamais atteinte est **10,2 profils sur 12**, quelle que soit l'enveloppe. Ce que
l'enveloppe du §3 délivre en moyenne, mesuré : **9,6/12 en repas complet, 9,9/12 en petit-déj**.
Une recette parfaitement conforme peut tomber à 5/12 — c'est la composition qui décide, et c'est
pour ça que \`check:enveloppe\` note recette par recette.

### Les 12 profils que ta recette doit couvrir

Cibles réelles calculées par l'application, moyennées sur 4 semaines de plans. La colonne qui
compte pour toi est **${catFr}**.

| Profil | kcal/jour | Petit-déj | Repas complet | Collation |
|---|---|---|---|---|
| Femme 55 kg, sèche | 1342 | 332 · 24 P | 421 · 31 P | 115 · 4 P |
| Femme 60 kg, maintien | 1728 | 449 · 22 P | 540 · 26 P | 190 · 1 P |
| Femme 65 kg, sèche | 1531 | 390 · 29 P | 477 · 35 P | 162 · 11 P |
| Femme 65 kg, maintien | 1816 | 470 · 24 P | 568 · 28 P | 203 · 1 P |
| Femme 70 kg, prise de masse | 2295 | 597 · 25 P | 720 · 28 P | 240 · 1 P |
| Femme 80 kg, sèche | 1731 | 450 · 34 P | 549 · 41 P | 213 · 15 P |
| Homme 65 kg, sèche | 1779 | 463 · 33 P | 563 · 40 P | 212 · 15 P |
| Homme 70 kg, maintien | 2147 | 558 · 28 P | 677 · 33 P | 227 · 4 P |
| Homme 80 kg, sèche | 2104 | 548 · 39 P | 671 · 48 P | 263 · 18 P |
| Homme 80 kg, maintien | 2328 | 605 · 32 P | 738 · 38 P | 276 · 8 P |
| Homme 95 kg, prise de masse | 2967 | 771 · 36 P | 928 · 41 P | 358 · 5 P |
| Homme 110 kg, prise de masse | 3206 | 834 · 41 P | 1005 · 46 P | 381 · 7 P |

Rien n'est genré dans une recette. Ce qui change entre un homme et une femme, c'est **la cible** :
à poids et taille égaux la formule de dépense énergétique retire 161 kcal, et la moitié basse de
la population est très majoritairement féminine. Un homme léger en sèche a exactement le même
besoin qu'une femme au maintien.

---

## 3. Enveloppe imposée pour CE lot

${lot.sousFormats
    ? `⚠️ **Ce lot porte ${lot.sousFormats.length} enveloppes distinctes, pas une seule.** Chaque recette doit
tenir dans l'UNE des deux, jamais entre les deux — une collation de 200 kcal à 8 g de protéines
n'appartient à aucun format et sera rejetée.

| Sous-format | ids | kcal | Protéines | Glucides | Lipides |
|---|---|---|---|---|---|
${lot.sousFormats.map((f) => `| **${f.nom}** | ${f.ids} | **${f.kcal[0]} – ${f.kcal[1]}** | **${f.prot[0]} – ${f.prot[1]} g** | ${f.carb[0]} – ${f.carb[1]} g | ${f.fat[0]} – ${f.fat[1]} g |`).join('\n')}`
    : `| | Base à écrire |
|---|---|
| Calories | **${lot.kcal[0]} – ${lot.kcal[1]} kcal** |
| Protéines | **${lot.prot[0]} – ${lot.prot[1]} g** |
| Glucides | ${lot.carb[0]} – ${lot.carb[1]} g |
| Lipides | ${lot.fat[0]} – ${lot.fat[1]} g |`}

${(() => {
    // ⚠️ Calculée PAR SOUS-FORMAT quand il y en a plusieurs. Sur l'union, la bande annoncée
    // est un mensonge arithmétique : le lot b7-coll affichait « 4,1 à 15,9 g/100 kcal »,
    // c'est-à-dire la fourchette la plus large permise par un croisement des bornes que le
    // tableau juste au-dessus INTERDIT (« jamais entre les deux »). Un chiffre affiché doit
    // être celui qu'on servira — la règle vaut pour un brief comme pour un écran.
    const bande = (kcal: [number, number], prot: [number, number]) => ({
      lo: prot[0] / kcal[1] * 100, hi: prot[1] / kcal[0] * 100,
    });
    const dans = (b: { lo: number; hi: number }) => b.hi >= DENSITE_CIBLE[0] && b.lo <= DENSITE_CIBLE[1];
    const entete = `> C'est la conséquence arithmétique des fourchettes ci-dessus, et c'est **la contrainte qui
> décide** de la couverture — plus que les calories. Vérifie-la sur chaque recette :
> \`protéines × 100 ÷ kcal\`.`;
    if (lot.sousFormats) {
      const l = lot.sousFormats.map((f) => {
        const b = bande(f.kcal, f.prot);
        return `> · **${f.nom}** : ${b.lo.toFixed(1)} à ${b.hi.toFixed(1)} g de protéines pour 100 kcal.`
          + (dans(b) ? '' : ` _(hors du plateau ${DENSITE_CIBLE[0]}–${DENSITE_CIBLE[1]}, assumé pour ce format)_`);
      }).join('\n');
      return `> **Densité protéique imposée, sous-format par sous-format :**\n${l}\n${entete}\n> ⚠️ Ne calcule JAMAIS cette bande sur l'union des sous-formats : elle autoriserait des\n> combinaisons qu'aucun des deux ne permet.`;
    }
    const b = bande(lot.kcal, lot.prot);
    return `> **Densité protéique imposée : ${b.lo.toFixed(1)} à ${b.hi.toFixed(1)} g de protéines pour 100 kcal.**
${entete}${dans(b) ? '' : '\n> ⚠️ Cette bande sort du plateau mesuré ' + DENSITE_CIBLE[0] + '–' + DENSITE_CIBLE[1] + ' g/100 kcal.'}`;
  })()}

${lot.specifique.map((x) => `- ${x}`).join('\n')}

---

## 4. Les ${refs.length} \`ref\` autorisés

**Règle absolue : tu n'emploies QUE ces clés.** Un ingrédient absent de cette table n'existe pas
pour l'application — il serait invisible au calcul des macros, au filtre des régimes et à la liste
de courses. Si un ingrédient te manque vraiment, ne l'invente pas : signale-le à la fin de ta
réponse, hors du JSON.

Les valeurs /100 g ci-dessous sont **celles que l'application sert réellement** — c'est avec
elles qu'elle calcule les macros de l'assiette et qu'elle juge si ta recette est servable.
Calcule ton \`macros_per_serving\` avec elles et rien d'autre.

Colonnes : **Pesée** = « SEC » signifie que la quantité écrite est le poids sec avant cuisson (riz,
pâtes, légumes secs), « cru » le poids cru (viandes, poissons, tubercules). **Max abs.** = plafond
absolu que la quantité de base ne peut pas dépasser. **Déjà utilisé** = nombre de recettes de cette
catégorie qui emploient déjà ce \`ref\` (un chiffre élevé = format saturé, cherche ailleurs).
**⛔SG** = contient du gluten, donc exclu des recettes sans gluten.

${tableRefs(refs, lot.categorie)}

**${sansGlutenOk.length} de ces ${refs.length} refs sont compatibles sans gluten** (ceux sans ⛔SG).

---

## 5. Format de sortie exact

Un seul objet JSON, une seule clé \`recipes\`, ${lot.volume} objets. Pas de \`_meta\`, pas de
\`config\`, pas de commentaire dans le JSON.

\`\`\`json
{ "recipes": [ /* les ${lot.volume} recettes */ ] }
\`\`\`

Voici une recette **réelle** du catalogue, dans la bonne catégorie. C'est le gabarit exact à
imiter — structure, nommage, niveau de détail :

\`\`\`json
${exemple(lot.categorie, lot.wave)}
\`\`\`

### Champ par champ

| Champ | Règle |
|---|---|
| \`id\` | exactement ceux listés au §1, dans l'ordre |
| \`name\` | français, descriptif, sans marqueur de régime (« vegan », « healthy », « fit ») et sans superlatif. Deux recettes ne peuvent pas partager leurs 3 premiers mots significatifs. |
| \`category\` | \`"${lot.categorie}"\` pour les ${lot.volume} |
| \`base_servings\` | \`1\`, sans exception |
| \`tags.objectif\` | mécanique, depuis les kcal de base — voir §6 |
| \`tags.recup_jour_repos\` | \`true\` si les glucides font moins de 45 % des calories, sinon \`false\`. Rien d'éditorial. |
| \`tags.sport\` | \`["muscu"]\` par défaut ; ajoute \`"endurance"\` si les glucides dépassent 55 % des calories. **\`"combats"\` est interdit.** |
| \`tags.temps_min\` | temps TOTAL de cuisine, cuisson comprise. Aucune durée des \`instructions\` ne peut le dépasser. |
| \`ingredients\` | **4 à 6 entrées.** Chacune : \`ref\` (§4), \`qty\` entier, \`macro_role\`, \`scalable\`. |
| \`instructions\` | **${lot.etapes[0]} à ${lot.etapes[1]} étapes** — voir §6 |
| \`why\` | une phrase sobre sur l'intérêt nutritionnel. Aucune promesse de santé, aucune revendication de régime. |
| \`macros_per_serving\` | **calculé**, pas estimé : pour chaque ingrédient \`per_100 × qty / 100\`, puis somme. Tolérance ±10 %. |
| \`wave\` | \`"${lot.wave}"\` pour les ${lot.volume} — c'est le nom du dossier de drop qui portera cette livraison, la convention du catalogue (\`_meta.waves\`). Recopie-le tel quel. |

---

## 6. Règles dures

### 6.1 Ancres — la règle la plus importante

- **Ancre protéine obligatoire** : au moins un ingrédient en \`"macro_role": "protein"\` **et**
  \`"scalable": true\`. **Jamais \`"dairy"\` pour porter la protéine** — le rôle \`dairy\` descend à
  0,6× et fait perdre le plancher protéique. Un skyr ou un fromage blanc qui porte la protéine du
  plat se déclare \`"protein"\`, pas \`"dairy"\`.
- **Ancre grasse obligatoire** : au moins un ingrédient en \`"macro_role": "fat"\` **et**
  \`"scalable": true\`, dans la fourchette de lipides du §3.
- \`vegetable\` et \`flavor\` ⇒ **toujours** \`"scalable": false\`.
- **Le plafond calorique vient des glucides, jamais du gras** : les matières grasses sont bloquées
  bas par leur « Max abs. », aucun féculent n'a de plafond.

### 6.2 Instructions — ${lot.etapes[0]} à ${lot.etapes[1]} étapes${lot.categorie === 'collation' ? `

Le catalogue actuel est trop laconique (médiane : 2 étapes, une recette dit « Mixe tout. » pour
cinq ingrédients). Mais sur une collation il n'y a **rien à cuisiner**, et exiger 6 étapes ne
produit que du remplissage. Donc : **2 à 3 étapes nettes**, et ce qu'on attend à la place du geste
évident, c'est ce qui **rate** quand on ne le dit pas — l'ordre qui évite que ça détrempe,
l'égouttage qui change la texture, la température de service, la découpe.

> ✅ « Verse le skyr dans un bol. Coupe la banane en rondelles épaisses par-dessus. Concasse
>    grossièrement les amandes et parsème **juste avant de manger** — ajoutées à l'avance, elles
>    ramollissent. »
> ❌ trois étapes creuses pour meubler.` : `

Le catalogue actuel est trop laconique : médiane de 2 étapes, et une recette dit littéralement
« Mixe tout. » pour cinq ingrédients. Quelqu'un qui ne cuisine pas ne sait pas quoi faire avec ça.
Ici il y a de la cuisson, donc il y a matière à se planter : chaque étape porte une action complète
avec **sa durée, son feu et son indice de réussite visuel**.

> ✅ « Chauffe 1 cuillère d'huile à feu moyen-vif. Saisis le filet 3 à 4 min sans y toucher : il
>    doit se décoller seul et la face dorée être franchement colorée. Retourne, baisse à moyen,
>    3 min de plus. »
> ❌ « Cuis le poulet. »`}

Dans tous les cas : **impératif, tutoiement, jamais d'infinitif.**

### 6.3 Une instruction n'introduit jamais un ingrédient absent de \`ingredients\`

Interdits tant qu'ils n'ont pas de \`ref\` dans la table du §4 : bouillon, vin, crème, beurre, miso,
sirop, vinaigre, yaourt, fromage, épices composées, sauces préparées. Les régimes et la liste de
courses sont déduits des seuls \`ref\` : un ingrédient cité hors liste fait mentir la recette. Huit
recettes du catalogue citent un « bouillon » inexistant, dont trois se revendiquent vegan.

Le sel, le poivre et les herbes non listés sont tolérés dans les instructions.

### 6.4 Poids et cohérence physique

Respecte la colonne « Pesée » du §4. On n'écrit jamais « égoutté », « cuit » ou « cuisiné » dans le
\`name\` d'une recette dont un ingrédient est pesé SEC, et les instructions doivent être cohérentes
avec cette pesée.

### 6.5 \`tags.objectif\` — mécanique, depuis les kcal de base

| Catégorie | \`["perte_de_gras"]\` | \`["perte_de_gras","maintien"]\` | \`["maintien","prise_de_masse"]\` |
|---|---|---|---|
| repas_complet | < 560 kcal | 560 – 660 | > 660 |
| petit_dej | < 450 kcal | 450 – 540 | > 540 |
| collation | < 220 kcal | 220 – 280 | > 280 |

Interdits : \`["perte_de_gras","prise_de_masse"]\` et les trois ensemble. **Aux enveloppes basses de
cette vague, la majorité tombera sur \`perte_de_gras\` — c'est normal**, le tag lit la base écrite,
pas la portion servie. N'ajuste pas les calories pour « équilibrer » la répartition des tags.

### 6.6 Aucun repos long

Pas de marinade, de réfrigération ou de repos de plus de 10 minutes : le schéma n'a aucun champ
pour le porter, et un plan affiché le matin doit être cuisinable le jour même.

---

## 7. Anti-doublons — ce qui est DÉJÀ pris

Le catalogue contient 8 groupes de quasi-doublons, produits par des vagues successives qui ne se
voyaient pas. Ton lot sera passé au crible par un script avant intégration : ce qui est refusé est
**réécrit, pas retouché** — une correction locale déplace le clone au lieu de le supprimer.

Les trois règles qui refusent une recette :

1. **Similarité de composition** : rejet si une recette existante de même catégorie partage
   ≥ 60 % de son ensemble de \`ref\` (indice de Jaccard).
2. **Refs communs** : au plus **3** \`ref\` en commun avec toute recette existante de même
   catégorie. Les recettes font 4 à 6 refs, donc 4 en commun = quasi-clone.
3. **Triplet structurel** : au plus **2** recettes par couple (ensemble des protéines × ensemble
   des féculents).

Ces contrôles s'appliquent aussi **entre les ${lot.volume} recettes de ce lot**.

### Couples protéine × féculent déjà saturés en \`${lot.categorie}\` — INTERDITS

${trip.length === 0 ? '_Aucun couple saturé sur cette catégorie._' : `Ces ${trip.length} couples portent déjà 2 recettes ou plus. Le seuil est atteint : n'en produis aucune de plus.

| Protéines × féculents | Déjà | Recettes |
|---|---|---|
${trip.slice(0, 30).map((t) => `| ${t.cle} | ${t.n} | ${t.ids.join(', ')} |`).join('\n')}${trip.length > 30 ? `\n\n_(+ ${trip.length - 30} autres couples à 2 occurrences ; la règle générale « au plus 2 » suffit à les couvrir.)_` : ''}`}

### Plafond par ancre sur ce lot

Aucun \`ref\` protéique ne peut porter plus de **25 % des ${lot.volume} recettes**, soit
**${plafondAncre(lot.volume)} au maximum**. Il te faut au moins
**${Math.min(6, Math.floor(lot.volume / 2))} ancres protéiques distinctes** et
**${Math.min(4, Math.max(2, Math.floor(lot.volume / 3)))} ancres grasses distinctes**.

Refs les plus employés dans cette catégorie — à ne PAS renforcer :

${refs.map((r) => ({ r, n: usage(r, lot.categorie), role: roleDominant(r) }))
    .filter((x) => x.n >= 8 && ['protein', 'fat', 'carb'].includes(x.role))
    .sort((a, b) => b.n - a.n).slice(0, 15)
    .map((x) => `- \`${x.r}\` (${x.role}) — déjà dans ${x.n} recettes`).join('\n')}

### Ancres encore OUVERTES — c'est là qu'il faut aller

Dire ce qui est interdit sans dire ce qui reste libre envoie dans un mur. Voici les ancres
protéiques par ordre de **disponibilité** — **toutes prises dans les ${refs.length} refs du §4**,
donc toutes réellement employables. « Couples saturés » = combinaisons déjà fermées pour cette
ancre, « places libres » = combinaisons (ancre × féculent autorisé) encore utilisables.

| Ancre protéine | Déjà employée ici | Couples saturés | Places libres |
|---|---|---|---|
${(() => {
    // ⚠️ TROISIÈME version de la même erreur, trouvée le 2026-08-02 sur le premier lot
    // 100 % végétal. Le §4 restreint déjà la table aux refs du créneau, mais PAS au régime
    // commandé au §5 : sur `b7-repas` (10 recettes vegan, 0 carnée), ce tableau proposait
    // encore `maquereau`, `mozzarella`, `saumon_fume`, `sardines`, `thon_frais`,
    // `yaourt_grec` — six lignes sur dix-huit strictement inemployables. « Va là, c'est
    // ouvert » sur une ancre que la répartition du lot interdit, c'est le mur que ce
    // tableau existe pour éviter.
    const dispo = couplesOuverts(lot.categorie, refs).filter((x) => {
      if (lot.regimes.libre === 0 && CASSE_VEGETARIEN(x.proteine)) return false;
      if (lot.regimes.libre === 0 && lot.regimes.vegetarien === 0 && CASSE_VEGAN(x.proteine)) return false;
      return true;
    });
    return dispo.slice(0, 18).map((x) => `| \`${x.proteine}\` | ${x.deja || '—'} | ${x.occupe || '—'} | ${x.libre} |`).join('\n');
  })()}

${(() => {
    const v = frequences(lot.categorie, refs).vierges;
    return v.length === 0
      ? `_Tous les refs du §4 sont déjà employés au moins une fois sur ce créneau._`
      : `**Refs du §4 JAMAIS employés en \`${lot.categorie}\`** — terrain entièrement vierge, aucun risque de
doublon :

${v.map((x) => `\`${x}\``).join(' · ')}`;
  })()}

### Diversité de format

Au plus **3 recettes** de ce lot peuvent partager le même format de service : wrap/pita/tartine,
bowl, poêlée, salade, porridge/pudding, galette/pancake, soupe.

---

## 8. Annexe — les ${RECIPES.filter((r) => r.category === lot.categorie).length} recettes \`${lot.categorie}\` déjà au catalogue

**Tu as besoin de cette table pour respecter R1 et R2**, qui portent sur l'ensemble ENTIER des refs
et pas seulement sur le couple protéine × féculent. Vérifie chacune de tes recettes contre elle.

Refs les plus fréquents sur ce créneau (à éviter de renforcer) : ${frequences(lot.categorie, refs).chauds}

${tableEnsembles(lot.categorie)}

---

## 9. Avant de répondre — auto-contrôle

Passe cette liste sur **chaque** recette. Ce sont les erreurs réellement constatées sur les vagues
précédentes.

- [ ] Tous les \`ref\` existent dans la table du §4, à l'orthographe exacte.
- [ ] 4 à 6 ingrédients. \`base_servings: 1\`. \`qty\` entiers.
- [ ] Une ancre \`protein\` + \`scalable: true\` (**pas** \`dairy\`), une ancre \`fat\` + \`scalable: true\`.
- [ ] \`vegetable\` et \`flavor\` en \`scalable: false\`.
- [ ] \`qty\` de base ≤ « Max abs. » quand la colonne est renseignée.
- [ ] \`macros_per_serving\` recalculé ingrédient par ingrédient, dans l'enveloppe du §3.
- [ ] **Protéines de base dans la fourchette du §3, sans dépassement.** C'est l'erreur la plus
      coûteuse : elle est irréversible côté moteur.${lot.sousFormats ? `
- [ ] Chaque recette tient dans **l'un** des ${lot.sousFormats.length} sous-formats du §3, pas entre les deux, et les
      volumes de chacun sont respectés.` : ''}
- [ ] Aucune instruction n'introduit un ingrédient hors liste.
- [ ] Aucune durée d'instruction ne dépasse \`tags.temps_min\`. Aucun repos > 10 min.
- [ ] ${lot.etapes[0]} à ${lot.etapes[1]} étapes, à l'impératif.
- [ ] Aucun couple protéine × féculent de la liste des saturés.
- [ ] Au plus 3 \`ref\` en commun avec une recette existante, et entre les recettes du lot.
- [ ] Deux recettes du lot ne partagent pas leurs 3 premiers mots significatifs.
- [ ] Répartition par régime du §1 respectée, **les trois lignes étant exclusives**, sans écrire
      le régime dans la recette.
- [ ] \`wave\` = \`"${lot.wave}"\` sur les ${lot.volume}.

Réponds avec **le JSON seul**. Si un ingrédient t'a manqué, ou si une recette t'a semblé
impossible à tenir dans l'enveloppe, dis-le **après** le JSON, en clair.
`;
}

const dossier = join(__dirname, '..', 'Recette', 'lots');
mkdirSync(dossier, { recursive: true });

const filtre = process.argv[2];
const aFaire = filtre ? LOTS.filter((l) => l.cle === filtre) : LOTS;
if (!aFaire.length) {
  console.error(`Lot inconnu : ${filtre}. Disponibles : ${LOTS.map((l) => l.cle).join(', ')}`);
  process.exit(2);
}

let total = 0;
for (const lot of aFaire) {
  // Un lot livré garde sa définition (c'est l'historique de la commande) mais n'a plus de
  // brief : ses ids sont pris, et le régénérer produirait une commande impossible à honorer.
  if (lot.livre) {
    console.log(`⏭  ${lot.cle} — déjà livré le ${lot.livre} (vague \`${lot.wave}\`), brief non régénéré.`);
    continue;
  }
  const contenu = genere(lot);
  const chemin = join(dossier, `${lot.cle}.md`);
  writeFileSync(chemin, contenu, 'utf8');
  total += lot.volume;
  console.log(`✅ Recette/lots/${lot.cle}.md — ${lot.volume} recettes, ${lot.prefixe}${lot.idDebut}–${lot.prefixe}${lot.idFin}, ${(contenu.length / 1024).toFixed(0)} Ko`);
}
const restants = aFaire.filter((l) => !l.livre);
if (!restants.length) {
  console.log('\nTous les lots définis ici sont livrés — aucun brief à produire.');
  console.log('Pour commander une nouvelle vague : ajouter un `Lot` dans LOTS, puis relancer.');
  process.exit(0);
}
console.log(`\n${restants.length} fichier(s), ${total} recettes commandées au total.`);
console.log(`À donner au rédacteur UN PAR CONVERSATION, dans l'ordre : ${restants.map((l) => l.cle).join(', ')}.`);
console.log('Après merge d\'un lot, régénérer les suivants : ils verront ce que le lot a consommé.');
