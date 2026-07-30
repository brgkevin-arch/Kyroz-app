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

/** Features réservées à Kyroz+ une fois le paywall lancé. */
export type PremiumFeature = 'dated_goal' | 'transformation' | 'calorie_bank';

export const PREMIUM_FEATURES: PremiumFeature[] = ['dated_goal', 'transformation', 'calorie_bank'];

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
