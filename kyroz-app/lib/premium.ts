// ── Accès premium (Kyroz+) ───────────────────────────────────────────────────
//
// Qui a droit à quoi. Module PUR : aucun SDK, aucun réseau, aucun état. Le
// fournisseur de paiement (RevenueCat) branchera son verdict ICI, en passant
// `entitled` — le reste de l'app ne connaît que ce module.
//
// ── LA DÉCISION QUI STRUCTURE TOUT LE FICHIER ────────────────────────────────
//
// L'objectif daté et le suivi de transformation sont EN LIGNE et GRATUITS depuis
// le 2026-07-27. Les mettre derrière un paywall reviendrait à retirer aux gens ce
// qu'ils utilisent déjà — `MONETISATION.md` appelle ça « le plus sûr moyen de
// casser la confiance et le North Star ».
//
// Décision fondateur (2026-07-30) : **les comptes existants gardent tout, à vie.**
// Le paywall ne s'applique qu'aux comptes créés APRÈS son lancement. Ce n'est pas
// une concession, c'est un argument : les premiers ont tout.
//
// L'ancre est `profiles.created_at` — une date SERVEUR, posée par Postgres. Un
// horodatage local aurait été remis à zéro par une réinstallation, et un drapeau
// local se serait recopié d'un appareil à l'autre par la synchro.

import { UserProfile } from './types';

/**
 * Date de lancement du paywall (ISO). `null` = **pas encore lancé** → personne
 * n'est verrouillé, tout reste gratuit pour tout le monde.
 *
 * C'est l'interrupteur unique de la mise en vente. Le jour où les comptes stores
 * et RevenueCat sont prêts, on pose une date ici — et rien d'autre ne change :
 * les comptes antérieurs restent grand-pérés, les suivants passent par l'achat.
 *
 * ⚠️ Ne JAMAIS reculer cette date une fois posée : ça déverrouillerait des comptes
 * qui payaient, et verrouillerait des comptes à qui on avait promis la gratuité.
 */
export const PAYWALL_LAUNCH: string | null = null;

// 🔴 `calorie_bank` A ÉTÉ RETIRÉ D'ICI le 2026-08-18 (décision fondateur). Ce n'est PAS
// une suppression de fonction : le moteur reste en place et INCHANGÉ (`lib/calorieBank.ts`,
// branché dans `planEngine.ts`), ses tests aussi. C'est sa VENTE qui disparaît — elle
// cesse d'être un pilier Kyroz+ et devient un réglage gratuit du rythme de la semaine
// (« Jours plus copieux », onglet Profil), ce qui décrit enfin ce que le code fait
// vraiment : la clé est un JOUR DE LA SEMAINE et l'écart est PERMANENT.
// ⚠️ Ne pas le remettre ici sans rouvrir la décision — et sans repasser sur les CGU
// (`constants/legal.ts` + `public/legal.html`), qui ÉNUMÈRENT ce que Kyroz+ contient :
// elles sont contractuelles, et publiées.

/** Features réservées à Kyroz+ une fois le paywall lancé. */
export type PremiumFeature = 'dated_goal' | 'transformation';

export const PREMIUM_FEATURES: PremiumFeature[] = ['dated_goal', 'transformation'];

/** Pourquoi l'accès est (ou n'est pas) accordé — sert aussi à l'affichage. */
export type AccessReason =
  | 'not_launched'   // le paywall n'existe pas encore
  | 'grandfathered'  // compte antérieur au lancement → gratuit à vie
  | 'entitled'       // abonnement actif
  | 'locked';        // compte postérieur, sans abonnement

export interface PremiumAccess {
  allowed: boolean;
  reason: AccessReason;
}

/**
 * Le compte est-il antérieur au lancement du paywall ?
 *
 * Prudence VOLONTAIRE sur les cas douteux : une date absente ou illisible rend
 * `true` (grand-péré). Se tromper dans ce sens offre une feature à quelqu'un qui
 * aurait dû payer ; se tromper dans l'autre RETIRE une feature à un utilisateur
 * de longue date, ce qui est exactement ce que la décision cherche à éviter.
 */
export function isGrandfathered(createdAt: string | null | undefined, launch = PAYWALL_LAUNCH): boolean {
  if (!launch) return true;              // paywall pas lancé → tout le monde
  if (!createdAt) return true;           // date inconnue → on donne
  const t = Date.parse(createdAt);
  const l = Date.parse(launch);
  if (!Number.isFinite(t) || !Number.isFinite(l)) return true;
  return t < l;
}

/**
 * Verdict d'accès à une feature premium.
 *
 * `entitled` vient du fournisseur de paiement (RevenueCat). Tant qu'il n'est pas
 * branché, il vaut `false` partout — et ça ne verrouille RIEN, puisque
 * `PAYWALL_LAUNCH` est `null`.
 */
export function premiumAccess(opts: {
  entitled: boolean;
  createdAt?: string | null;
  launch?: string | null;
}): PremiumAccess {
  const launch = opts.launch !== undefined ? opts.launch : PAYWALL_LAUNCH;
  if (!launch) return { allowed: true, reason: 'not_launched' };
  if (isGrandfathered(opts.createdAt, launch)) return { allowed: true, reason: 'grandfathered' };
  if (opts.entitled) return { allowed: true, reason: 'entitled' };
  return { allowed: false, reason: 'locked' };
}

/** Raccourci : cette feature est-elle accessible à ce profil ? */
export function canUse(
  feature: PremiumFeature,
  opts: { entitled: boolean; profile?: UserProfile | null; launch?: string | null },
): boolean {
  if (!PREMIUM_FEATURES.includes(feature)) return true; // feature gratuite
  return premiumAccess({
    entitled: opts.entitled,
    createdAt: opts.profile?.created_at,
    launch: opts.launch,
  }).allowed;
}

/**
 * Phrase affichée sous une feature accessible parce que le compte est ancien.
 * Ni culpabilisante ni triomphale : un fait, une fois (règle produit §10).
 */
export function grandfatheredNotice(reason: AccessReason): string | null {
  return reason === 'grandfathered'
    ? 'Inclus dans ton compte, à vie — tu étais là avant Kyroz+.'
    : null;
}

// ── Tarifs ───────────────────────────────────────────────────────────────────
//
// ⚠️ SOURCE PROVISOIRE, et c'est un point de « pas de mensonge » à ne pas rater.
// Ces montants sont les tarifs FRANÇAIS déclarés dans App Store Connect
// (cf. STORE-RELEASE.md §1-bis). Ils sont écrits ici pour UNE raison : produire
// la capture d'écran que la revue Apple exige avant d'activer les abonnements,
// alors que RevenueCat n'est pas branché.
//
// ✅ CÂBLÉ le 2026-08-02 : `withStorePrices()` ci-dessous substitue le `priceString`
// renvoyé par le store — qui est LOCALISÉ — dès qu'il est disponible. Un montant en
// euros affiché à quelqu'un qui sera facturé en dollars serait exactement le mensonge
// que la règle interdit. Ces chaînes restent le REPLI, et l'écran dit que c'en est un.

/**
 * Vrai tant qu'aucun prix ne vient du store.
 * ⚠️ Conservé comme valeur par défaut (aucun store branché aujourd'hui) ; l'écran
 * doit lire le drapeau renvoyé par `withStorePrices`, qui est le seul à jour.
 */
export const PREMIUM_PRICES_ARE_LOCAL_FALLBACK = true;

export interface PremiumPlan {
  id: 'monthly' | 'annual';
  /** Identifiant produit côté stores — doit correspondre à App Store Connect / Play. */
  storeProductId: string;
  label: string;
  /** Prix affiché. Remplacé par le `priceString` du store au câblage. */
  price: string;
  /** Ce qui est réellement débité, en toutes lettres. */
  billed: string;
}

export const PREMIUM_PRICES: PremiumPlan[] = [
  {
    id: 'monthly',
    storeProductId: 'kyroz_plus_monthly',
    label: 'Mensuel',
    price: '4,99 €',
    billed: 'Débité chaque mois. Sans engagement, tu arrêtes quand tu veux.',
  },
  {
    // ⚠️ `kyroz_plus_yearly`, PAS `_annual`. Corrigé le 2026-08-02, et ce n'était pas
    // un détail : l'identifiant doit être celui réellement créé dans App Store Connect
    // le 2026-07-30 (`STORE-RELEASE.md` §4 et `MONETISATION.md` §A, tous deux écrits au
    // moment de la création). `_annual` a été inventé par le code du paywall le
    // 2026-08-01, APRÈS. Un test verrouillait d'ailleurs la mauvaise valeur.
    // Conséquence si on l'avait laissée : `getProducts()` ne trouve rien, l'achat rend
    // « indisponible » et le prix reste au tarif de repli — un échec SILENCIEUX. C'est
    // exactement le piège que `STORE-RELEASE.md` appelle « la source d'erreur n°1 ».
    id: 'annual',
    storeProductId: 'kyroz_plus_yearly',
    label: 'Annuel',
    price: '39,99 €',
    billed: 'Débité une fois par an, soit 3,33 € par mois.',
  },
];

/**
 * Substitue les prix RÉELS du store à nos tarifs de repli.
 *
 * Vit ici et non dans l'écran pour la raison habituelle : `vitest.config.ts` ne
 * collecte que `lib/__tests__/**`, donc rien de ce qui est écrit dans `app/` n'est
 * testable — et ces montants engagent le produit.
 *
 * `fallback` vaut vrai dès qu'UNE SEULE formule affiche encore un prix local : la
 * mention « ce sont les tarifs français » doit s'afficher tant qu'un seul montant
 * n'est pas celui du store. Se tromper dans l'autre sens afficherait un prix en
 * euros à quelqu'un facturé en dollars, sans le dire.
 */
export function withStorePrices(
  store: StorePrices,
  plans: PremiumPlan[] = PREMIUM_PRICES,
): { plans: PremiumPlan[]; fallback: boolean } {
  let fallback = false;
  const out = plans.map((p) => {
    const prix = store[p.id];
    if (typeof prix === 'string' && prix.trim() !== '') return { ...p, price: prix.trim() };
    fallback = true;
    return p;
  });
  return { plans: out, fallback };
}

/** Prix localisés renvoyés par le store, par formule (cf. `lib/purchases.ts`). */
export type StorePrices = Partial<Record<PremiumPlan['id'], string>>;

/**
 * Économie de l'annuel par rapport à 12 mensualités, en pourcentage ENTIER
 * arrondi vers le bas. Arrondir vers le bas garantit qu'on n'annonce jamais une
 * économie plus grande que la vraie.
 *
 * Renvoie `null` si les prix ne sont pas comparables (formats inattendus) ou si
 * l'annuel n'est pas moins cher — dans ce cas l'écran n'affiche simplement rien,
 * plutôt qu'un « 0 % » ou un chiffre faux.
 */
export function annualSavingPct(plans: PremiumPlan[] = PREMIUM_PRICES): number | null {
  const eur = (p?: PremiumPlan) => {
    if (!p) return NaN;
    const n = Number(p.price.replace(/[^0-9,.]/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : NaN;
  };
  const m = eur(plans.find((p) => p.id === 'monthly'));
  const a = eur(plans.find((p) => p.id === 'annual'));
  if (!Number.isFinite(m) || !Number.isFinite(a)) return null;
  const plein = m * 12;
  if (a >= plein) return null;
  return Math.floor(((plein - a) / plein) * 100);
}

/**
 * Bandeau d'état en tête du paywall : ce que la personne doit lire EN PREMIER,
 * selon la raison de son accès.
 *
 * Vit ici et non dans l'écran pour une raison concrète : `vitest.config.ts` ne
 * collecte que `lib/__tests__/**`, donc rien de ce qui est écrit dans `app/` ou
 * `hooks/` n'est testable. Ces phrases-là engagent le produit — elles méritent
 * un verrou.
 */
export function paywallBanner(reason: AccessReason): { title: string; body: string } {
  switch (reason) {
    case 'not_launched':
      return {
        title: "Kyroz+ n'est pas encore en vente",
        body:
          "Ces deux outils sont actifs dans ton compte aujourd'hui, et ils y resteront : " +
          'les comptes ouverts avant la mise en vente gardent tout, à vie.',
      };
    case 'grandfathered':
      return {
        title: "C'est déjà à toi",
        body:
          'Inclus dans ton compte, à vie — tu étais là avant Kyroz+. ' +
          "Tu n'as rien à faire, et rien à payer.",
      };
    case 'entitled':
      return {
        title: 'Ton abonnement Kyroz+ est actif',
        body: 'Le renouvellement et la résiliation se gèrent dans les réglages de ton compte App Store ou Google Play.',
      };
    case 'locked':
      return {
        title: 'Piloter ton objectif dans le temps',
        body: 'Ton plan, tes courses et tes recettes ne changent pas — ils restent gratuits.',
      };
  }
}
