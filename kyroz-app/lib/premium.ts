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
 * Date de lancement du paywall (ISO). `null` = pas encore lancé.
 *
 * 🔴 **POSÉE LE 2026-08-27** (décision fondateur : « date-le à aujourd'hui »). C'est
 * l'interrupteur unique de la mise en vente ; la clé RevenueCat, elle, était déjà là
 * depuis le 2026-08-03. Les deux sont désormais allumés.
 *
 * **Ce que la date fait, et rien d'autre** : tout compte dont `profiles.created_at` est
 * ANTÉRIEUR reste servi gratuitement **à vie** — c'est une promesse contractuelle, CGU §3,
 * publiée. Les comptes suivants passent par l'achat pour `dated_goal` et `transformation`.
 *
 * ⚠️ **LE FUSEAU EST EXPLICITE, ET IL N'EST PAS DÉCORATIF.** `Date.parse('2026-08-27')`
 * vaut minuit **UTC**, soit 02 h à Paris : les comptes créés entre minuit et 2 h ce
 * jour-là seraient tombés du côté grand-péré, offerts à vie par une convention
 * d'écriture. `+02:00` coupe à minuit heure de Paris, qui est la frontière voulue.
 * Compté par `premium.test.ts`.
 *
 * ⚠️ **ELLE N'ATTEINT ENCORE PERSONNE, et c'est une conséquence du 2026-08-27** : cette
 * constante voyage dans le bundle JS, et la ligne OTA est **coupée** depuis le passage en
 * SDK 57 + `runtimeVersion: fingerprint` (A44). Elle ne s'appliquera donc qu'au **build
 * (7)**, puis aux OTA publiées sur cette même surface native. Poser la date n'ouvre pas
 * la vente : elle l'ouvrira à la livraison.
 *
 * 🔴 **CE QUI RESTE DÛ AVANT QUE LA VENTE S'OUVRE VRAIMENT** — trois choses, aucune n'est
 * du code :
 *   1. les quatre produits en « Prêt à soumettre » (capture de review) ;
 *   2. le bac à sable, jamais passé à ce jour ;
 *   3. 🔴 **un MÉDIATEUR de la consommation** — l'obligation d'adhésion (L.612-1) ne vise
 *      que le professionnel qui VEND, donc elle ne mordait pas tant que Kyroz était
 *      gratuit. Elle mord à la première vente, et les CGU doivent porter son NOM et ses
 *      coordonnées (L.616-1). Aucune adhésion n'existe. Cf. `constants/legal.ts`, §
 *      « Droit applicable », et la procédure de mise en vente.
 *
 * ⚠️ Ne JAMAIS reculer cette date une fois posée : ça déverrouillerait des comptes
 * qui payaient, et verrouillerait des comptes à qui on avait promis la gratuité.
 */
export const PAYWALL_LAUNCH: string | null = '2026-08-27T00:00:00+02:00';

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
 * Date de création du COMPTE, prise à la meilleure source disponible.
 *
 * 🔴 POSÉE LE 2026-08-27, APRÈS AVOIR VU LE DÉFAUT À L'ÉCRAN — un compte créé onze
 * minutes plus tôt affichait « Kyroz+ · Inclus à vie », et redevenait verrouillé au
 * lancement SUIVANT. La cause n'était pas le repli mais sa SOURCE : `usePremium`
 * lisait `profile.created_at`, qui n'est écrit qu'en UN endroit (`sync.ts`, à la
 * LECTURE du miroir Supabase). Un compte tout juste créé ne l'a donc pas encore, et
 * `isGrandfathered` — qui donne l'accès quand la date manque — s'appliquait à
 * l'intégralité des nouveaux inscrits, pendant toute leur première session.
 *
 * ⚠️ **Le repli « date absente → on donne » n'est pas en cause et ne bouge pas.** Il
 * vise celui dont on a PERDU la date. Ce qui était faux, c'est de le laisser couvrir
 * celui dont on ne l'a pas ENCORE demandée. *Un repli de sécurité juste peut servir
 * une population qu'il ne visait pas — c'est la source qu'il faut regarder, pas la
 * règle.*
 *
 * ⚠️ **La session PASSE DEVANT le profil, et c'est deux fois le bon sens :**
 * · `auth.users.created_at` EST la date du compte — c'est elle que promettent les
 *   CGU §3 (« tout compte créé avant cette date »), là où `profiles.created_at`
 *   date la LIGNE MIROIR, créée au premier envoi, donc plus tard ou jamais ;
 * · elle est donc toujours ≤ l'autre, donc la préférer se trompe **en DONNANT**,
 *   dans le sens que la décision protège.
 *
 * ⚠️ **Le profil reste en repli, il ne devient pas décoratif** : la session peut
 * manquer là où le profil est en cache (démarrage hors ligne, hydratation en cours).
 * Retirer l'un des deux rouvrirait le défaut par l'autre porte.
 */
export function dateCreationCompte(
  sessionCreatedAt: string | null | undefined,
  profilCreatedAt: string | null | undefined,
): string | undefined {
  return sessionCreatedAt ?? profilCreatedAt ?? undefined;
}

/**
 * Faut-il interroger le fournisseur d'abonnement pour rendre le verdict d'accès ?
 *
 * 🔴 DÉPLACÉE ICI ET EXPORTÉE LE 2026-08-27 (contre-audit CA-7-02). Elle vivait
 * privée dans `hooks/usePremium.ts` et n'était nommée dans AUCUN test : inverser son
 * `return false` en `return true` la rendait vraie pour TOUT LE MONDE tant que
 * `PAYWALL_LAUNCH` est `null` — c'est-à-dire aujourd'hui, pour 100 % des comptes —
 * donc `identifyUser(uid)` repartait à chaque connexion, exactement le défaut 09-01
 * qu'on venait de corriger. 1 841 tests restaient verts. La case « Identifiers →
 * User ID … uniquement pour les abonnés » du formulaire App Privacy reposait sur
 * trois lignes que rien ne mesurait.
 * ➡️ Une DÉCISION pure vit dans le module pur, testable — même motif que `tours.ts`,
 * `visee.ts` et `accentColor.ts`. Le hook ne fait plus que l'appeler.
 *
 * ⚠️ **Prudence dans le sens qui protège l'accès** : une date de création absente rend
 * `isGrandfathered` vrai, donc `necessaire` faux, donc l'accès est accordé sans
 * interroger personne. Se tromper en DONNANT, jamais en retirant.
 */
export function entitlementNecessaire(createdAt: string | null | undefined): boolean {
  if (!PAYWALL_LAUNCH) return false;
  return !isGrandfathered(createdAt);
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
  opts: {
    entitled: boolean;
    profile?: UserProfile | null;
    launch?: string | null;
    /**
     * ⚠️ **À passer dès qu'une session existe** — `auth.users.created_at`. Sans lui,
     * cette fonction ne connaît que `profiles.created_at`, absent pendant toute la
     * première session d'un compte neuf : elle rendrait alors « accessible » ce qui
     * doit être verrouillé. C'est le défaut vu à l'écran le 2026-08-27, et cette
     * porte-ci resterait ouverte si on ne fermait que `usePremium`.
     * *Aucun code de production n'appelle `canUse` aujourd'hui — raison de plus pour
     * ne pas l'y laisser en piège : un jour quelqu'un la branchera.*
     */
    sessionCreatedAt?: string | null;
  },
): boolean {
  if (!PREMIUM_FEATURES.includes(feature)) return true; // feature gratuite
  return premiumAccess({
    entitled: opts.entitled,
    createdAt: dateCreationCompte(opts.sessionCreatedAt, opts.profile?.created_at),
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

/**
 * ── LE PALIER EN VENTE ───────────────────────────────────────────────────────
 *
 * Kyroz+ se vend par PALIERS tarifaires, et chaque palier a ses PROPRES identifiants
 * produits. Ce tableau désigne celui qui est en vente aujourd'hui — le palier de
 * lancement (« early bird »), créé chez Apple le 2026-08-25.
 *
 * | palier   | mensuel                    | annuel                    |
 * |----------|----------------------------|---------------------------|
 * | lancement| `kyroz_plus_monthly_early` | `kyroz_plus_yearly_early` |
 * | standard | `kyroz_plus_monthly`       | `kyroz_plus_yearly`       |
 *
 * ⚠️ **POURQUOI UN PALIER = DES IDENTIFIANTS NEUFS, et pas un prix qu'on change.**
 * Les CGU §3 promettent que le tarif reste celui de la souscription tant que
 * l'abonnement est actif. Changer le prix d'un produit qui a des abonnés rendrait
 * cette phrase fausse. Un produit qui sort de la vente n'est PAS supprimé : ses
 * abonnés continuent de se renouveler à leur prix, sans une ligne de code — c'est
 * le comportement natif d'Apple et de Google.
 *
 * ➡️ **Le jour du retrait de l'offre de lancement**, on bascule les deux
 * `storeProductId` (et les deux `price`) vers le palier standard. C'est du
 * JavaScript, donc ça part en **OTA**, sans nouvelle revue.
 *
 * 🔴 **ET L'ORDRE DES DEUX GESTES N'EST PAS INDIFFÉRENT — L'OTA D'ABORD, TOUJOURS**
 * (constat 07-02, écrit le 2026-08-27). C'est le seul point qui manquait à ce
 * paragraphe : il décrivait QUOI basculer, jamais DANS QUEL SENS.
 *
 * Retirer le palier chez Apple avant de publier l'OTA ouvre une fenêtre où l'app
 * demande un produit qui ne se vend plus. Et cette fenêtre n'est pas courte : une OTA
 * s'applique au **DEUXIÈME lancement** (`fallbackToCacheTimeout: 0`, cf. CLAUDE.md §2),
 * donc elle dure jusqu'à ce que chaque appareil ait redémarré deux fois.
 *
 * **Ce qui se passe pendant, mesuré dans le code** : `getProducts` ne trouve pas
 * l'identifiant, `fetchStorePrices` rend `{}` **en silence** (`purchases.ts:249`),
 * l'écran affiche les tarifs de REPLI en les annonçant comme tels, et l'achat rend
 * « indisponible ». C'est très exactement le mode d'échec des quatre identifiants
 * inventés dont ce fichier porte déjà la trace — sauf qu'il frapperait tout le monde
 * en même temps, le jour d'un changement de prix.
 *
 * ➡️ **L'ordre, et il ne se déduit pas :**
 *   1. publier l'OTA qui bascule les identifiants ;
 *   2. vérifier qu'elle est appliquée (`npm run check:ota`) ;
 *   3. **seulement ensuite**, retirer le palier de lancement de la vente chez Apple.
 * ⚠️ Entre 1 et 3, les DEUX paliers sont en vente : c'est voulu, et c'est le seul
 * état sans trou. Un abonné du palier de lancement, lui, garde son prix quoi qu'il
 * arrive — un produit hors vente n'est pas supprimé.
 *
 * ℹ️ **L'alternative supprimerait la fenêtre**, au prix d'un aller-retour réseau au
 * chargement du paywall : lire l'OFFERING courant (`getOfferings()`) au lieu de
 * demander des identifiants en dur. Pas fait — c'est un changement d'architecture pour
 * un risque que l'ordre des gestes ferme à coût nul.
 *
 * 🔴 **CES CHAÎNES SE RECOPIENT DEPUIS APPLE, ELLES NE SE CHOISISSENT PAS ICI.**
 * Quatre identifiants faux ont déjà été inventés dans ce fichier, chacun échouant
 * en SILENCE (produit introuvable → achat « indisponible » → prix de repli affiché).
 * Le contrôle qui tranche : `npm run check:abonnements`.
 */
export const PREMIUM_PRICES: PremiumPlan[] = [
  {
    id: 'monthly',
    storeProductId: 'kyroz_plus_monthly_early',
    label: 'Mensuel',
    price: '3,99 €',
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
    storeProductId: 'kyroz_plus_yearly_early',
    label: 'Annuel',
    price: '29,99 €',
    billed: 'Débité une fois par an, soit 2,50 € par mois.',
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
