// ── Les codes reçus par e-mail — les règles, hors de tout écran ──────────────
//
// ⚠️ Ce module sert DEUX parcours, pas un : la confirmation d'inscription et la
// réinitialisation de mot de passe. Les deux reposent sur le même jeton Supabase
// (`{{ .Token }}`, 6 chiffres) et la même saisie ; ce qui les sépare tient en deux
// points, et les confondre produit des messages faux :
//   - le TYPE passé à `verifyOtp` (`signup` vs `recovery`) — se tromper fait
//     répondre « invalide » sur un code pourtant juste ;
//   - la présence d'un LIEN dans l'e-mail. La confirmation en a un ; la
//     réinitialisation n'en a pas, et c'est une décision — voir plus bas.
//
// Le nom du fichier dit « confirmation » parce qu'il est né avec ce parcours-là.
//
// Kyroz confirme une inscription par un CODE À 6 CHIFFRES saisi dans l'app, et
// non par le seul clic sur un lien. Ce n'est pas une préférence esthétique, ce
// sont trois pannes évitées :
//
//  1. **Le lien ne ramène pas dans l'app.** Aucun lien universel (Universal Link
//     iOS / App Link Android) n'est configuré : sur mobile, le lien de l'e-mail
//     ouvre le NAVIGATEUR. L'utilisateur doit retrouver Kyroz tout seul et se
//     reconnecter. Le code, lui, se tape sur l'écran déjà ouvert.
//  2. **Les antivirus de messagerie PRÉ-CLIQUENT les liens.** Outlook/Defender et
//     consorts visitent chaque URL d'un e-mail pour l'inspecter — ce qui CONSOMME
//     le jeton à usage unique. L'utilisateur clique ensuite et lit « lien invalide
//     ou expiré ». C'est la panne classique, et elle ne se reproduit pas chez soi.
//  3. **Le lien traverse mal certaines messageries** (réécriture d'URL, coupure
//     d'un lien long sur plusieurs lignes). Six chiffres, non.
//
// Le lien reste dans l'e-mail pour qui préfère cliquer — les deux chemins mènent
// au même endroit. ⚠️ Mais ils ne sont pas interchangeables APRÈS COUP : le jeton
// est à usage unique, donc cliquer le lien PUIS saisir le code rend le code
// invalide (et l'inverse aussi). C'est ce que `traduitErreurConfirmation` doit
// expliquer, sinon l'utilisateur croit s'être trompé de chiffres.

/**
 * Où atterrit celui qui CLIQUE le lien plutôt que de saisir le code.
 *
 * ⚠️ Trois endroits doivent porter la même valeur, et rien ne le vérifie côté
 * Supabase — une divergence fait retomber silencieusement sur la « Site URL » :
 *   - ici (ce que l'app demande à `signUp` / `resend`) ;
 *   - `public/confirme.html` (la page réellement servie) ;
 *   - Supabase → Authentication → URL Configuration → **Redirect URLs**.
 * Une URL absente de cette liste blanche est IGNORÉE, sans message d'erreur.
 *
 * Volontairement une constante, pas une variable d'environnement : une variable
 * de plus est une variable qui peut manquer au build, et son absence donnerait
 * un `emailRedirectTo` vide — donc un déploiement vert et un lien mort.
 */
export const URL_RETOUR_CONFIRMATION = 'https://brgkevin-arch.github.io/Kyroz-app/confirme.html';

/** Longueur du code envoyé par Supabase (`{{ .Token }}`). */
export const CODE_LONGUEUR = 6;

/** Délai avant de pouvoir redemander un e-mail. Ce n'est pas un choix de confort :
 *  Supabase refuse un second envoi avant 60 s. Sans compte à rebours à l'écran,
 *  l'utilisateur appuie et reçoit une erreur technique qu'il lit comme une panne. */
export const DELAI_RENVOI_S = 60;

/**
 * Ce qu'on garde de ce que l'utilisateur tape : les chiffres, et pas plus de six.
 *
 * ⚠️ Le collage est le cas normal, pas l'exception — on copie « 428193 » depuis
 * l'e-mail, souvent avec une espace ou un retour à la ligne. Refuser une saisie
 * parce qu'elle porte un espace invisible serait un rejet incompréhensible.
 */
export function normaliseCode(saisie: string): string {
  return (saisie ?? '').replace(/\D/g, '').slice(0, CODE_LONGUEUR);
}

/** Vrai quand le code est complet — donc quand l'envoi a un sens. */
export function codeComplet(code: string): boolean {
  return normaliseCode(code).length === CODE_LONGUEUR;
}

/**
 * Messages Supabase (anglais, techniques) → français, et surtout : qui dit à
 * l'utilisateur QUOI FAIRE ensuite.
 *
 * ⚠️ « Token has expired or is invalid » recouvre DEUX situations opposées :
 * un code faux, et un compte DÉJÀ confirmé (le jeton a servi, via le lien).
 * Supabase ne les distingue pas — anti-énumération. Le message doit donc porter
 * les deux issues, sinon quelqu'un qui a cliqué le lien retape indéfiniment un
 * code correct en croyant s'être trompé.
 */
export function traduitErreurConfirmation(msg: string): string {
  const m = (msg ?? '').toLowerCase();
  if (m.includes('expired') || m.includes('invalid')) {
    return 'Code refusé. Vérifie les six chiffres, ou demande un nouvel envoi. Si tu as déjà cliqué le lien de l\'e-mail, ton adresse est confirmée : connecte-toi.';
  }
  if (m.includes('rate limit') || m.includes('after')) {
    return 'Trop de tentatives d\'affilée. Attends une minute avant de redemander un e-mail.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Pas de réseau. Réessaie dans un instant.';
  }
  return msg;
}

// ── Réinitialisation de mot de passe ─────────────────────────────────────────

// 🔴 L'E-MAIL DE RÉINITIALISATION NE PORTE AUCUN LIEN, ET C'EST UNE DÉCISION.
//
// Pour une CONFIRMATION, cliquer le lien suffit : le compte devient actif, et la
// personne se connecte ensuite normalement. Pour une RÉINITIALISATION, non — il
// reste à choisir un nouveau mot de passe, et le clic ne le fait pas :
//
//  - la page d'atterrissage est un fichier STATIQUE : elle ne peut pas appeler
//    `updateUser` (pas de client Supabase, pas de session) ;
//  - la session ouverte par le clic vit dans le NAVIGATEUR, pas dans l'app native,
//    qui n'en verra jamais rien (`detectSessionInUrl: false`, cf. lib/supabase.ts) ;
//  - et le clic a CONSOMMÉ le jeton, donc le code à 6 chiffres est mort.
//
// ➡️ Résultat : mot de passe inchangé, code inutilisable, aucun recours. La
// personne serait dans un état PIRE qu'avant sa demande. Et les antivirus de
// messagerie qui pré-cliquent les liens (cf. plus haut) transformeraient chaque
// demande en impasse, sans que personne ne touche à rien.
//
// Le code seul n'a aucun de ces défauts : rien à cliquer, donc rien à consommer.
// ⚠️ Ne pas « améliorer » le gabarit en y remettant `{{ .ConfirmationURL }}` —
// `lib/__tests__/emailConfirmation.test.ts` le refuse, avec cette raison.

/** Longueur minimale d'un mot de passe. Même règle à l'inscription et à la
 *  réinitialisation : deux exigences différentes pour le même champ seraient
 *  vécues comme un bug. */
export const MDP_LONGUEUR_MIN = 6;

export function motDePasseValide(mdp: string): boolean {
  return (mdp ?? '').length >= MDP_LONGUEUR_MIN;
}

/**
 * Mêmes erreurs Supabase, autre parcours — donc autres consignes.
 *
 * ⚠️ Réutiliser `traduitErreurConfirmation` ici livrerait un mensonge : elle
 * conseille « si tu as déjà cliqué le lien de l'e-mail… », or l'e-mail de
 * réinitialisation n'en contient AUCUN. Un message d'erreur qui décrit un geste
 * impossible fait douter de l'app, pas du code saisi.
 */
export function traduitErreurReinitialisation(msg: string): string {
  const m = (msg ?? '').toLowerCase();
  // Supabase refuse un mot de passe identique à l'ancien. C'est la seule erreur
  // de ce parcours qui vienne de l'ÉTAPE 3, pas du code : elle passe en premier.
  if (m.includes('should be different') || m.includes('same as the old')) {
    return 'Ce mot de passe est déjà le tien. Choisis-en un autre.';
  }
  if (m.includes('expired') || m.includes('invalid')) {
    return 'Code refusé. Vérifie les six chiffres — ou demande un nouveau code, celui-ci a peut-être expiré.';
  }
  if (m.includes('rate limit') || m.includes('after')) {
    return 'Trop de demandes d\'affilée. Attends une minute avant de redemander un code.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Pas de réseau. Réessaie dans un instant.';
  }
  if (m.includes('password')) {
    return `Mot de passe trop court (${MDP_LONGUEUR_MIN} caractères minimum).`;
  }
  return msg;
}
