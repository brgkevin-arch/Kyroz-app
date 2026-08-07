// ── Confirmation d'adresse e-mail — les règles, hors de tout écran ───────────
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
