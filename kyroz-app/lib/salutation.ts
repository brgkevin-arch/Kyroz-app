// ── La salutation de l'écran Plan ────────────────────────────────────────────
//
// Module PUR — aucun import `react-native`, donc testable. Même procédé que
// `lib/reminder.ts`, `lib/tours.ts` et `lib/collapsingTitle.ts` : la décision est
// une fonction, l'écran ne fait que la rendre.
//
// **Ce que ça remplace** : `firstName ? \`Salut ${firstName}\` : 'Ton plan'`, écrit
// en dur dans l'en-tête (décision fondateur, 2026-08-14). Ce qui devait partir,
// c'est le repli « Ton plan » : il servait un TITRE D'ÉCRAN à qui n'avait pas
// renseigné son prénom pendant que les autres recevaient un bonjour.
// ⚠️ La même décision demandait aussi « un bonjour différent à chaque fois » — ce
// second volet, lui, a été ANNULÉ le 2026-08-25 (voir plus bas). Ne pas lire la
// phrase de 2026-08-14 comme une consigne encore en vigueur.
//
// **UN SEUL AXE : LE MOMENT DE LA JOURNÉE.** Un « Bonjour » à 22 h est faux, au
// même titre qu'un chiffre faux (CLAUDE.md §10). Le mot est donc CALCULÉ sur
// l'heure, jamais tiré au sort — c'est exactement le raisonnement qui a fait
// naître `periodOf` dans `reminder.ts` (« un rappel à 20 h qui annonce prépare ton
// petit-déjeuner est pire que pas de rappel du tout »).
//
// 🔴 **LA ROTATION PAR JOUR A ÉTÉ RETIRÉE LE 2026-08-25** (décision fondateur :
// « je n'aime pas trop le mot coucou, on reste sur Bonjour pour l'instant »). Elle
// faisait tourner trois mots par créneau — `Bonjour` / `Salut` / `Coucou` — sur
// `dayIndex`, le compteur de jours partagé avec les notifications. Ce qui part
// avec elle :
//   · `dayIndex` n'est plus lu ici : la salutation ne dépend QUE de l'heure ;
//   · l'en-tête est le même tous les jours à la même heure. C'est VOULU. Ce n'est
//     ni un cache, ni un index bloqué : ne pas le « réparer » en rajoutant des mots.
// ➡️ « pour l'instant » : la table ci-dessous garde une entrée PAR CRÉNEAU, donc
// remettre une rotation = repasser ses valeurs en tableaux. Le découpage de la
// journée, lui, n'aura pas à être refait.
//
// ⚠️ Et une salutation reste COURTE parce qu'elle s'affiche en `Type.display`
// (34 pt) à côté du compteur de série : au-delà de `SALUTATION_MAX`, elle passe à
// la ligne et l'en-tête change de hauteur d'un créneau à l'autre. Le plafond est
// tenu par un test, pas par la vigilance.

/**
 * Créneau de journée d'une salutation. Plus grossier que `ReminderPeriod` (qui en
 * a quatre) : « bonjour » couvre le matin ET le midi, et Kyroz n'a pas de mot à
 * lui pour l'heure du déjeuner.
 */
export type MomentDuJour = 'matin' | 'apresmidi' | 'soir';

/**
 * Le créneau d'une heure locale. La nuit (00 h–04 h 59) est rattachée au SOIR,
 * comme dans `reminder.ts::periodOf` : à 1 h du matin on finit sa journée, on ne
 * la commence pas — et « Bonjour » y serait la seule chose à ne pas dire.
 */
export function momentDuJour(heure: number): MomentDuJour {
  if (heure >= 5 && heure <= 11) return 'matin';
  if (heure >= 12 && heure <= 17) return 'apresmidi';
  return 'soir';
}

/** Longueur maximale d'une salutation, prénom NON compris (cf. le préambule). */
export const SALUTATION_MAX = 10;

/**
 * Un mot par créneau — plus de liste, plus de cycle (cf. le préambule).
 *
 * ⚠️ `matin` et `apresmidi` disent le MÊME mot, et les deux créneaux restent
 * distincts quand même : « Bonjour » se dit aussi bien à 9 h qu'à 15 h, mais c'est
 * `apresmidi` qui porte la frontière de midi — celle dont on aura besoin le jour
 * où l'après-midi voudra son mot à lui. Le seul mot vraiment faux d'un côté comme
 * de l'autre, c'est « Bonsoir ».
 */
export const SALUTATIONS: Record<MomentDuJour, string> = {
  matin: 'Bonjour',
  apresmidi: 'Bonjour',
  soir: 'Bonsoir',
};

/**
 * L'en-tête de l'écran Plan à cette date, pour ce prénom.
 *
 * ⚠️ **Le prénom est FACULTATIF, et la salutation tient sans lui** — c'est ce qui
 * a fait retirer l'ancien repli « Ton plan ». Il ne s'écrit qu'à l'onboarding et
 * dans Profil → Informations : tout compte créé avant cette étape a le champ
 * vide, et il n'y a aucune raison de lui servir un titre d'écran pendant que les
 * autres reçoivent un bonjour.
 */
export function salutation(prenom: string, date: Date): string {
  const mot = SALUTATIONS[momentDuJour(date.getHours())];
  const p = prenom.trim();
  return p ? `${mot} ${p}` : mot;
}
