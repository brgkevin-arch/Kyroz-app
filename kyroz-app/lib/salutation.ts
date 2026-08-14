// ── La salutation de l'écran Plan ────────────────────────────────────────────
//
// Module PUR — aucun import `react-native`, donc testable. Même procédé que
// `lib/reminder.ts`, `lib/tours.ts` et `lib/collapsingTitle.ts` : la décision est
// une fonction, l'écran ne fait que la rendre.
//
// **Ce que ça remplace** : `firstName ? \`Salut ${firstName}\` : 'Ton plan'`, écrit
// en dur dans l'en-tête. Un seul mot, pour toujours — donc un titre qu'on ne lit
// plus au bout de trois jours (décision fondateur, 2026-08-14 : « on peut mettre
// un bonjour différent à chaque fois »).
//
// **Deux axes, et le premier n'est pas décoratif** :
//
//  1. **LE MOMENT DE LA JOURNÉE.** Un « Bonjour » à 22 h est faux, au même titre
//     qu'un chiffre faux (CLAUDE.md §10). Le créneau est donc calculé, pas tiré au
//     sort — c'est exactement le raisonnement qui a fait naître `periodOf` dans
//     `reminder.ts` (« un rappel à 20 h qui annonce prépare ton petit-déjeuner est
//     pire que pas de rappel du tout »).
//  2. **LE JOUR**, via `dayIndex` — le MÊME compteur que les notifications, pour
//     qu'il n'existe qu'une seule définition de « quel jour on est ». Déterministe :
//     aucun compteur à stocker, aucune part de hasard, donc un test peut le
//     vérifier, et rouvrir l'app trois fois dans la matinée ne fait pas défiler
//     les salutations sous les yeux.
//
// ⚠️ **LES LISTES SONT COURTES, ET C'EST UNE LIMITE DE LANGUE, PAS UN OUBLI.** Le
// français compte peu de salutations vraiment interchangeables — au-delà de trois
// on tombe dans l'anglicisme (« Hey ») ou dans le régionalisme. Allonger la liste
// pour allonger le cycle ferait dire à l'app des mots qu'un francophone n'emploie
// pas. Ce qui fait varier l'en-tête, c'est surtout le passage d'un créneau à
// l'autre DANS la journée : neuf en-têtes distincts, dont trois par créneau.
//
// ⚠️ Et une salutation reste COURTE parce qu'elle s'affiche en `Type.display`
// (34 pt) à côté du compteur de série : au-delà de `SALUTATION_MAX`, elle passe à
// la ligne et l'en-tête change de hauteur d'un jour à l'autre. Le plafond est
// tenu par un test, pas par la vigilance.

import { dayIndex } from './reminder';

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
 * ⚠️ **L'ordre du tableau est l'ordre des jours** — même propriété que les
 * citations de `reminder.ts`. Ajouter un mot en fin de liste n'est donc pas
 * neutre : ça décale la rotation de tout le monde une fois, ce qui est sans
 * conséquence ici (personne ne compte les bonjours), mais ça se sait.
 */
export const SALUTATIONS: Record<MomentDuJour, string[]> = {
  matin: ['Bonjour', 'Salut', 'Coucou'],
  apresmidi: ['Salut', 'Bonjour', 'Coucou'],
  soir: ['Bonsoir', 'Salut', 'Coucou'],
};

// `%` garde le signe en JS : un index négatif sortirait du tableau et rendrait
// `undefined`. Même garde que `reminder.ts::rang`.
const rang = (index: number, taille: number) => ((index % taille) + taille) % taille;

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
  const mots = SALUTATIONS[momentDuJour(date.getHours())];
  const mot = mots[rang(dayIndex(date), mots.length)];
  const p = prenom.trim();
  return p ? `${mot} ${p}` : mot;
}
