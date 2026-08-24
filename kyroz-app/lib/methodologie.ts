import {
  MIN_AGE, MIN_KCAL, EA_HARD_FLOOR, EA_OPTIMAL, LOW_EA_BUDGET_WEEKS,
  HIGH_ADIPOSITY_PCT, DIET_BREAK_AFTER_WEEKS, BF_CHART_MAX,
} from './safety';
import {
  NEAT_PAL, FAT_MIN_PER_KG_BW, PROTEIN_MIN_PER_KG_FFM, PROTEIN_MAX_PER_KG_FFM,
  BF_UNCERTAINTY_PTS,
} from './tdee';
import { MAX_DEFICIT_TDEE_RATIO } from './datedGoal';
import { CIQUAL_ATTRIBUTION } from './foods';

/**
 * Contenu de l'écran « Méthodologie & sources » (app/methodologie.tsx).
 *
 * 🔴 AUCUN CHIFFRE N'EST ÉCRIT ICI — ILS SONT TOUS LUS DANS LE MOTEUR. C'est la
 * condition d'existence de cet écran, pas une élégance : une page de méthodologie est
 * une AFFIRMATION SUR LE CODE, exactement comme une bulle de visite guidée (CLAUDE.md
 * §8), et le dépôt a déjà mesuré ce que devient une affirmation recopiée — trois bulles
 * sur cinq étaient fausses à l'audit, chacune vraie le jour de son écriture. Un plancher
 * annoncé « 1 200 kcal » en dur survivrait au jour où la constante change, et cette
 * page-ci est lue par le relecteur Apple.
 *
 * ➡️ Corollaire pour qui ajoute une ligne : si le chiffre n'est pas importable, c'est
 * qu'il n'a pas de source unique — l'exporter d'abord, l'afficher ensuite.
 *
 * Fichier PUR (aucun import react-native) pour être testable sous vitest, même procédé
 * que `lib/tours.ts`, `lib/collapsingTitle.ts` et `lib/materiau.ts`.
 *
 * Pourquoi cet écran existe : Apple 1.4.1 exige la divulgation des données et des
 * méthodes derrière toute mesure liée à la santé, et rejette les apps nutrition dont
 * les sources restent vagues. Il sert aussi les notes de soumission (STORE-RELEASE §11).
 */

/** Une référence citable — séparée du texte pour qu'on ne puisse pas en inventer une au fil d'une phrase. */
export interface MethodoSource {
  auteurs: string;
  titre: string;
  publication: string;
}

export interface MethodoSection {
  titre: string;
  paragraphes: string[];
  sources?: MethodoSource[];
}

/** Nombre à la française : séparateur décimal virgule, et pas de zéro inutile. */
export function nb(n: number): string {
  return String(n).replace('.', ',');
}

/** Milliers séparés par une espace insécable (1 500, jamais 1500). */
export function millier(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function methodologie(): MethodoSection[] {
  return [
    {
      titre: 'Ce que Kyroz calcule — et ce qu\'il n\'est pas',
      paragraphes: [
        'Kyroz estime une dépense énergétique quotidienne à partir de ce que vous déclarez, puis construit des repas qui s\'en approchent. C\'est un outil de bien-être alimentaire pour adultes en bonne santé.',
        'Kyroz n\'est pas un dispositif médical. Il ne diagnostique, ne traite, ne guérit ni ne prévient aucune pathologie, et ne remplace pas l\'avis d\'un médecin ou d\'un diététicien-nutritionniste.',
        `L'app est réservée aux personnes de ${MIN_AGE} ans et plus : les équations utilisées ci-dessous ne sont pas validées chez l'adolescent.`,
      ],
    },
    {
      titre: 'La dépense énergétique (TDEE)',
      paragraphes: [
        'La dépense est la somme de trois termes : le métabolisme de base, multiplié par un facteur d\'activité quotidienne hors sport, auquel s\'ajoute la dépense des séances déclarées.',
        'Le métabolisme de base est estimé par l\'équation de Mifflin-St Jeor, à partir du sexe, de l\'âge, du poids et de la taille.',
        `L'équation de Katch-McArdle, qui repose sur la masse maigre, est utilisée telle quelle si le taux de masse grasse a été MESURÉ (impédancemétrie, DEXA, plis cutanés) et déclaré comme tel. Un taux estimé à partir d'une silhouette porte une marge d'erreur de l'ordre de ±${BF_UNCERTAINTY_PTS} points : quand il indique nettement plus de masse maigre que la moyenne du gabarit — au-delà de ce bruit —, le calcul glisse progressivement de Mifflin-St Jeor vers Katch-McArdle. Jamais l'inverse : si la formule à masse maigre donne une dépense plus basse, c'est Mifflin-St Jeor qui reste servie. La question de provenance n'est posée qu'au-delà de ${BF_CHART_MAX.male} % (homme) et ${BF_CHART_MAX.female} % (femme).`,
        `Le facteur d'activité hors sport va de ${nb(NEAT_PAL.desk)} (travail assis) à ${nb(NEAT_PAL.physical)} (métier physique). La table s'arrête volontairement à ${nb(NEAT_PAL.physical)} : les valeurs plus hautes des tables classiques incluent l'exercice, qui est déjà compté à part.`,
        'La dépense des séances est calculée par la méthode des équivalents métaboliques (MET), en valeur NETTE : le métabolisme de repos de l\'heure de séance est retiré, parce qu\'il est déjà compté par les deux premiers termes.',
      ],
      sources: [
        {
          auteurs: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO',
          titre: 'A new predictive equation for resting energy expenditure in healthy individuals',
          publication: 'The American Journal of Clinical Nutrition, 1990;51(2):241-247',
        },
        {
          auteurs: 'McArdle WD, Katch FI, Katch VL',
          titre: 'Exercise Physiology: Nutrition, Energy, and Human Performance',
          publication: 'Lippincott Williams & Wilkins (équation dite de Katch-McArdle)',
        },
        {
          auteurs: 'Ainsworth BE, Haskell WL, Herrmann SD, et al.',
          titre: '2011 Compendium of Physical Activities: a second update of codes and MET values',
          publication: 'Medicine & Science in Sports & Exercise, 2011;43(8):1575-1581',
        },
      ],
    },
    {
      titre: 'La répartition des macronutriments',
      paragraphes: [
        `La cible protéique dépend de l'objectif et se calcule sur un poids ajusté à la composition corporelle. Elle est ensuite bornée entre ${nb(PROTEIN_MIN_PER_KG_FFM)} et ${nb(PROTEIN_MAX_PER_KG_FFM)} g par kg de MASSE MAIGRE, quelle que soit la corpulence.`,
        `Les lipides ne descendent jamais sous ${nb(FAT_MIN_PER_KG_BW)} g par kg de poids de corps, seuil en deçà duquel l'apport en acides gras essentiels et l'absorption des vitamines liposolubles ne sont plus assurés.`,
        'Les glucides reçoivent le budget restant.',
      ],
      sources: [
        {
          auteurs: 'Jäger R, Kerksick CM, Campbell BI, et al.',
          titre: 'International Society of Sports Nutrition Position Stand: protein and exercise',
          publication: 'Journal of the International Society of Sports Nutrition, 2017;14:20',
        },
        {
          auteurs: 'Helms ER, Zinn C, Rowlands DS, Brown SR',
          titre: 'A systematic review of dietary protein during caloric restriction in resistance trained lean athletes',
          publication: 'International Journal of Sport Nutrition and Exercise Metabolism, 2014;24(2):127-138',
        },
        {
          auteurs: 'Thomas DT, Erdman KA, Burke LM',
          titre: 'Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance',
          publication: 'Journal of the Academy of Nutrition and Dietetics, 2016;116(3):501-528',
        },
      ],
    },
    {
      titre: 'Les limites de sécurité',
      paragraphes: [
        'Aucun plan ne peut descendre sous ces limites, quel que soit l\'objectif choisi ou la date visée. Ce ne sont pas des réglages : le code les applique à chaque calcul.',
        `Énergie disponible : au moins ${EA_HARD_FLOOR} kcal par kg de masse maigre, une fois la dépense sportive retirée. C'est le seuil sous lequel la littérature documente des perturbations hormonales et osseuses (déficit énergétique relatif dans le sport, RED-S).`,
        `Au-delà de ${LOW_EA_BUDGET_WEEKS} semaines cumulées en zone basse, ce plancher remonte progressivement vers ${EA_OPTIMAL} kcal par kg de masse maigre : l'app force une sortie de déficit au lieu de la laisser durer.`,
        `Filet absolu : jamais moins de ${millier(MIN_KCAL.male)} kcal par jour chez l'homme et ${millier(MIN_KCAL.female)} kcal chez la femme.`,
        `Déficit plafonné à ${Math.round(MAX_DEFICIT_TDEE_RATIO * 100)} % de la dépense estimée.`,
        `Après ${DIET_BREAK_AFTER_WEEKS} semaines de déficit consécutives, la semaine suivante est servie à la maintenance.`,
        'Un déficit est refusé si l\'indice de masse corporelle de départ est inférieur à 18,5, ainsi que pour tout poids cible sortant de la plage saine.',
      ],
      sources: [
        {
          auteurs: 'Mountjoy M, Sundgot-Borgen JK, Burke LM, et al.',
          titre: 'IOC consensus statement on relative energy deficiency in sport (RED-S): 2018 update',
          publication: 'British Journal of Sports Medicine, 2018;52(11):687-697',
        },
        {
          auteurs: 'Loucks AB, Thuma JR',
          titre: 'Luteinizing hormone pulsatility is disrupted at a threshold of energy availability in regularly menstruating women',
          publication: 'The Journal of Clinical Endocrinology & Metabolism, 2003;88(1):297-311',
        },
      ],
    },
    {
      titre: 'Les données nutritionnelles',
      paragraphes: [
        CIQUAL_ATTRIBUTION,
        'Les aliments que la table ne couvre pas proprement (produits protéinés, préparations composées) sont saisis à la main, à partir des valeurs déclarées par les fabricants. Aucune source tierce automatique n\'alimente le catalogue.',
        'Les recettes de Kyroz n\'ont pas été validées par un diététicien-nutritionniste, et l\'app ne le prétend nulle part.',
      ],
      sources: [
        {
          auteurs: 'ANSES',
          titre: 'Table de composition nutritionnelle des aliments Ciqual',
          publication: 'ciqual.anses.fr',
        },
      ],
    },
    {
      titre: 'Ce qui relève d\'un choix de Kyroz',
      paragraphes: [
        'Tout ce qui précède ne sort pas de la littérature au même titre, et la distinction est faite ici plutôt que laissée à l\'interprétation.',
        `Viennent de la littérature : les deux équations de métabolisme de base, les valeurs MET, le seuil de ${EA_HARD_FLOOR} kcal par kg de masse maigre et les fourchettes protéiques.`,
        `Sont des choix de Kyroz, prudents par construction : le plafond de ${nb(NEAT_PAL.physical)} sur l'activité quotidienne, le déficit borné à ${Math.round(MAX_DEFICIT_TDEE_RATIO * 100)} %, la pause à la maintenance toutes les ${DIET_BREAK_AFTER_WEEKS} semaines, et le retrait des planchers dérivés de la masse maigre au-delà de ${HIGH_ADIPOSITY_PCT.male} % (homme) et ${HIGH_ADIPOSITY_PCT.female} % (femme) de masse grasse — au-delà, la réserve adipeuse est la source d'énergie que ces planchers, conçus pour des athlètes maigres, interdisaient d'utiliser.`,
        'Une estimation de dépense reste une estimation : elle porte une marge d\'erreur individuelle que ces équations ne suppriment pas. Le poids relevé au fil des semaines est le seul juge, et c\'est lui que Kyroz suit.',
      ],
    },
  ];
}
