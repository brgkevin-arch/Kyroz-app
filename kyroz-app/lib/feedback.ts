// ── Le canal de retour utilisateur ───────────────────────────────────────────
//
// Décision fondateur du 2026-08-09 : « une section commentaire digne de ce nom ».
// Jusqu'ici « Aide & contact » AFFICHAIT une adresse e-mail — il fallait la
// recopier à la main. Personne n'écrit un retour à ce prix-là, surtout depuis un
// téléphone.
//
// 🔴 LE RETOUR PART PAR E-MAIL, PAS EN BASE — et c'est un arbitrage, pas un
// raccourci. Une table Supabase coûterait les SIX surfaces que CLAUDE.md §3
// énumère (schéma, migration à jouer à la main, `sync.ts`, la liste de tables de
// `delete-account`, la politique de confidentialité, le registre RGPD), dont
// DEUX sont relues par Apple. Le `mailto:` en coûte zéro : rien n'est stocké,
// rien ne transite par un serveur à nous, et l'utilisateur voit le message
// partir depuis SA boîte, sous son nom, avec la possibilité de l'annuler.
// ➡️ Si le volume de retours justifie un jour une table, ce fichier est le seul
// endroit à changer — l'écran ne connaît que `lienAvis`.
//
// ⚠️ CE QUI EST JOINT AU MESSAGE EST VISIBLE À L'ÉCRAN, et ce n'est pas
// négociable. Un formulaire qui agrafe en douce la version, la plateforme, ou
// pire le profil, est exactement le « mensonge » que CLAUDE.md interdit — sauf
// qu'il porte sur les données de quelqu'un. On joint le STRICT nécessaire pour
// qu'un bug soit reproductible (version + plateforme), l'écran l'affiche mot
// pour mot, et rien du corps ni des données de santé n'y entre.

/** L'adresse de contact. Elle vivait en CONST LOCALE dans `profil.tsx`, donc
 *  invisible depuis partout ailleurs — et déjà recopiée dans `constants/legal.ts`. */
export const SUPPORT_EMAIL = 'contact@kyroz.app';

/** Bornes de saisie. Le plancher n'est pas une politesse : « ça marche pas »
 *  n'est pas un retour actionnable, et laisser partir un message vide fait
 *  croire à l'utilisateur qu'il a été entendu. Le plafond protège du `mailto:`
 *  tronqué — certains clients mail coupent au-delà de ~2 000 caractères, en
 *  SILENCE, ce qui perdrait la fin du message sans que personne ne le sache. */
export const AVIS_MIN = 10;
export const AVIS_MAX = 2000;

export interface AvisContexte {
  /** `expo.version`, ex. « 1.0.0 ». */
  version: string;
  /** `Platform.OS` — ios | android | web. */
  plateforme: string;
}

export type AvisSujet = 'bug' | 'idee' | 'autre';

/** Les trois entrées, et pas une de plus. Un sélecteur à huit rubriques fait
 *  hésiter puis renoncer ; celui-ci sert surtout à trier la boîte de réception. */
export const AVIS_SUJETS: { id: AvisSujet; label: string; prefixe: string }[] = [
  { id: 'bug', label: 'Un problème', prefixe: 'Problème' },
  { id: 'idee', label: 'Une idée', prefixe: 'Idée' },
  { id: 'autre', label: 'Autre chose', prefixe: 'Retour' },
];

/** Le texte est-il envoyable ? Fonction pure : l'écran s'en sert pour désactiver
 *  le bouton, et le test pour figer les bornes. */
export function avisValide(texte: string): boolean {
  const n = texte.trim().length;
  return n >= AVIS_MIN && n <= AVIS_MAX;
}

/** Ce que l'écran AFFICHE comme étant joint au message. Même source que ce qui
 *  part réellement (`composerAvis`) : deux listes divergeraient, et la première
 *  à mentir serait celle qu'on montre. */
export function mentionContexte(ctx: AvisContexte): string {
  return `Version ${ctx.version} · ${ctx.plateforme}`;
}

/** Sujet + corps de l'e-mail. Le contexte est en TÊTE : les clients mail des
 *  téléphones tronquent l'aperçu, et une version qu'on lit sans ouvrir le
 *  message fait gagner un aller-retour sur trois signalements. */
export function composerAvis(
  texte: string,
  sujet: AvisSujet,
  ctx: AvisContexte,
): { sujet: string; corps: string } {
  const prefixe = AVIS_SUJETS.find((s) => s.id === sujet)?.prefixe ?? 'Retour';
  return {
    sujet: `Kyroz — ${prefixe}`,
    corps: `${mentionContexte(ctx)}\n\n${texte.trim()}\n`,
  };
}

/**
 * Le lien `mailto:` complet, prêt pour `Linking.openURL`.
 *
 * ⚠️ `encodeURIComponent` sur les DEUX champs, et le corps en a le plus besoin :
 * il contient des sauts de ligne et des accents. Sans encodage, un `&` tapé par
 * l'utilisateur couperait son propre message en deux paramètres — le texte
 * arriverait tronqué à l'endroit exact où il a écrit « macros & calories », et
 * absolument rien ne le signalerait, ni à lui ni à nous.
 */
export function lienAvis(texte: string, sujet: AvisSujet, ctx: AvisContexte): string {
  const { sujet: s, corps } = composerAvis(texte, sujet, ctx);
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(corps)}`;
}
