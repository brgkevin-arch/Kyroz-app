import type { PremiumFeature } from './premium';

/**
 * CE QUE VEND KYROZ+, ET L'ESSAI — une seule source (décisions fondateur du 2026-10-20).
 *
 * 🔴 UNE SEULE LISTE. La page d'arrivée (`app/offre-kyroz-plus.tsx`), l'écran Kyroz+ du Profil
 * (`app/kyroz-plus.tsx`) et les CGU §3 (`constants/legal.ts`) lisent `FONCTIONS_KYROZ_PLUS`.
 * Ajouter une fonction Kyroz+, c'est une ligne ici ; les trois surfaces suivent, en OTA si la
 * fonction ne demande pas de build. Elles avaient chacune leur copie — c'est ainsi que la page
 * de vente a promis le réglage des « jours plus copieux » éteint depuis août (relevé le 2026-09-30).
 * ⚠️ Chaque ligne nomme sa `feature` : `verrouKyrozPlus.test.ts` exige qu'une fonction VENDUE
 * soit réellement verrouillée quelque part, et `offreKyrozPlus.test.ts` que la liste couvre
 * exactement `PREMIUM_FEATURES`.
 *
 * 🔴 PAS DE « À VENIR » (avis donné et retenu le 2026-10-20). Une page d'achat ne liste que ce
 * qui existe : vendre une promesse contredit « pas de mensonge » et Apple le refuse (2.3.1,
 * 3.1.2). Les fonctions futures entrent dans la liste le jour où elles sont codées ; d'ici là,
 * une phrase sans liste ni date (`NOUVEAUTES_INCLUSES`).
 *
 * Fichier PUR (aucun import d'exécution) : testable sous vitest.
 */

export interface FonctionKyrozPlus {
  feature: PremiumFeature;
  /** Nom d'icône Ionicons. */
  icone: string;
  titre: string;
  corps: string;
}

// ⚠️ RÉÉCRITS LE 2026-10-23 (fondateur : « ça fait beaucoup trop IA, humanifie »), puis
// RACCOURCIS le même jour (« pas convaincu » par la première réécriture ; « go » sur
// celle-ci) : une phrase, des mots de tous les jours, et rien que ce que l'app sert. Le
// second promettait encore « la trajectoire visée » sur la courbe (partie le 2026-09-20) et
// « un mot sur ta pente » (le verdict, retiré de l'onglet Poids le 2026-10-23).
export const FONCTIONS_KYROZ_PLUS: FonctionKyrozPlus[] = [
  {
    feature: 'dated_goal',
    icone: 'rocket-outline',
    titre: 'Objectif daté',
    corps: 'Un poids, une date. Kyroz règle tes calories pour y arriver.',
  },
  {
    feature: 'transformation',
    icone: 'trending-up-outline',
    titre: 'Suivi de transformation',
    corps: 'Tes photos avant/après, côte à côte.',
  },
];

export const NOUVEAUTES_INCLUSES = 'Les nouvelles fonctions Kyroz+ arrivent dans ton abonnement, sans supplément.';

/** « objectif daté et suivi de transformation » — pour une phrase (CGU §3). */
export function fonctionsEnPhrase(): string {
  const noms = FONCTIONS_KYROZ_PLUS.map((f) => f.titre.charAt(0).toLowerCase() + f.titre.slice(1));
  return noms.length <= 1 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

// ── L'ESSAI GRATUIT (décision fondateur du 2026-10-20 : « un essai de deux semaines ») ──────
//
// 🔴 L'ÉCRAN NE L'ANNONCE QUE SI LE STORE LE SERT. L'essai est une offre d'introduction posée
// sur l'abonnement dans App Store Connect, et Apple ne l'accorde qu'UNE fois par identifiant
// Apple et par groupe d'abonnements. Écrire « 14 jours offerts » en dur promettrait un essai à
// qui n'y a plus droit — puis le débiterait au premier tap. On lit donc deux choses du store :
// l'offre (`introPrice`, gratuite, et sa durée) et le droit de la personne (`eligibilite`).
// Tant qu'aucune offre n'existe côté store, rien ne s'affiche : la page vend l'abonnement seul.

/** Le droit à l'offre d'introduction, tel que le store le rapporte. */
export type EligibiliteEssai = 'eligible' | 'non_eligible' | 'inconnue' | 'sans_offre';

/**
 * Le statut rendu par `checkTrialOrIntroductoryPriceEligibility` (`INTRO_ELIGIBILITY_STATUS` :
 * 0 inconnu, 1 refusé, 2 accordé, 3 aucune offre). Recopié en nombres parce que ce fichier
 * n'importe rien d'exécutable ; `offreKyrozPlus.test.ts` les confronte au SDK.
 */
export function eligibiliteDepuisStatut(statut: number | undefined): EligibiliteEssai {
  return statut === 2 ? 'eligible' : statut === 1 ? 'non_eligible' : statut === 3 ? 'sans_offre' : 'inconnue';
}

/** L'offre d'introduction d'un produit (`PurchasesIntroPrice` de RevenueCat). */
export interface OffreIntro {
  price: number;
  cycles: number;
  periodUnit: string;
  periodNumberOfUnits: number;
}

const JOURS_PAR_UNITE: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/**
 * Le nombre de jours d'essai GRATUIT servi à cette personne, ou `null`.
 * `null` dès qu'un seul doute existe : pas d'offre, une offre payante (prix réduit, pas un
 * essai), un droit inconnu ou refusé, une unité inconnue.
 */
export function joursEssai(intro: OffreIntro | null | undefined, eligibilite: EligibiliteEssai): number | null {
  if (!intro || eligibilite !== 'eligible' || intro.price !== 0) return null;
  const parUnite = JOURS_PAR_UNITE[intro.periodUnit];
  if (!parUnite || !(intro.periodNumberOfUnits > 0)) return null;
  return parUnite * intro.periodNumberOfUnits * Math.max(1, intro.cycles || 1);
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];

export interface EtapeFrise { quand: string; titre: string; texte: string }

/**
 * La frise de la page d'arrivée, sur le modèle montré par le fondateur (Wikiloc) — mais sans
 * rien promettre que Kyroz ne fasse pas : pas de « on t'enverra des conseils », pas de rappel
 * avant la fin de l'essai (Kyroz n'en envoie pas).
 * `prixApres` : la chaîne du STORE (« 29,99 € »), jamais nos tarifs de repli.
 */
export function friseEssai(
  jours: number,
  aujourdHui: Date,
  prixApres: string,
  periode: 'monthly' | 'annual',
  store: string,
): EtapeFrise[] {
  const fin = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate() + jours);
  const le = `${JOURS[fin.getDay()]} ${fin.getDate()} ${MOIS[fin.getMonth()]}`;
  return [
    {
      quand: 'Aujourd’hui',
      titre: 'Kyroz+ en entier',
      texte: `${FONCTIONS_KYROZ_PLUS.map((f) => f.titre).join(', ')}. Rien à payer aujourd’hui.`,
    },
    {
      quand: `Pendant ${jours} jours`,
      titre: 'Tu essaies, tu décides',
      texte: `Tu peux résilier à tout moment, au plus tard 24 h avant la fin, dans les réglages de ton compte ${store}\u00A0: tu ne paieras rien.`,
    },
    {
      quand: `Le ${le}`,
      titre: 'Premier paiement',
      texte: `${prixApres} ${periode === 'annual' ? 'pour l’année' : 'par mois'}, sauf si tu as résilié avant.`,
    },
  ];
}

/**
 * La mention de paiement sous le bouton (Apple 3.1.2). 🔴 Elle change avec l'essai : « débité à la
 * confirmation de l'achat » devient FAUX dès qu'un essai est accordé — rien n'est débité ce
 * jour-là. Une seule fonction pour les deux écrans de vente, sinon l'un des deux mentirait.
 */
export function mentionPaiement(store: string, essai: number | null | undefined): string {
  const renouvellement =
    'L’abonnement se renouvelle automatiquement au même tarif à la fin de chaque période, ' +
    `sauf si tu le désactives au moins 24 h avant. Tu peux le gérer ou l’arrêter à tout moment dans les réglages de ton compte ${store}.`;
  return essai
    ? `Rien n’est débité aujourd’hui. À la fin des ${essai} jours d’essai, le paiement est débité de ton compte ${store}, ` +
      `sauf si tu résilies au moins 24 h avant. ${renouvellement}`
    : `Le paiement est débité de ton compte ${store} à la confirmation de l’achat. ${renouvellement}`;
}
