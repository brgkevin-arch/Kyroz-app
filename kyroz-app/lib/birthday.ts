// ── Date de naissance → âge, et anniversaire ────────────────────────────────
//
// L'app demandait un ÂGE. Un âge est juste le jour où on le saisit, puis il
// pourrit : au premier anniversaire, le profil sous-estime l'utilisateur d'un an,
// et personne ne pense à revenir le corriger. Or l'âge n'est pas décoratif — il
// entre dans Mifflin-St Jeor (`calculateBMR`), donc dans le TDEE, donc dans les
// calories servies tous les jours.
//
// Depuis le 2026-08-02 on demande la DATE DE NAISSANCE, et l'âge en est DÉRIVÉ à
// chaque recalcul (`computePlan`). Il ne peut plus se désynchroniser.
//
// ⚠️ `birth_date` reste OPTIONNEL, et ça n'est pas de la tiédeur : on ne peut pas
// deviner la date de naissance des comptes déjà créés (un âge ne donne qu'une
// fourchette d'un an). Ces profils gardent donc leur `age` saisi, tel quel, tant
// qu'ils n'ont pas renseigné leur date. Aucune valeur inventée.

/** Stamp 'YYYY-MM-DD' — même convention que lib/weight.ts. */
export type Stamp = string;

const parts = (stamp: Stamp): { y: number; m: number; d: number } | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
};

/** Le jour existe-t-il vraiment ? (31 février, 30 février, 29/02 hors bissextile) */
export function isRealDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(); // jour 0 du mois suivant = dernier du mois
  return d <= dim;
}

/** Construit le stamp, ou `null` si la date n'existe pas. */
export function toStamp(y: number, m: number, d: number): Stamp | null {
  if (!isRealDate(y, m, d)) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Âge révolu à la date `today`. L'anniversaire compte LE JOUR MÊME.
 * Rend `null` si l'une des deux dates est illisible — l'appelant garde alors sa
 * valeur existante plutôt que de recevoir un 0 qui traverserait tout le moteur.
 */
export function ageOn(birth: Stamp | undefined, today: Stamp): number | null {
  if (!birth) return null;
  const b = parts(birth); const t = parts(today);
  if (!b || !t) return null;
  let age = t.y - b.y;
  // Pas encore passé l'anniversaire cette année → un an de moins.
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Est-ce l'anniversaire aujourd'hui ?
 *
 * ⚠️ Cas du 29 février : les années non bissextiles n'ont pas ce jour. On fête
 * alors le 28. Sans ça, une personne née un 29/02 n'aurait « jamais » son
 * anniversaire trois années sur quatre — et le même raisonnement vaut pour
 * `ageOn`, qui la fait vieillir le 1er mars (le 28 n'étant pas encore le
 * dernier jour d'un mois de 29 jours). Les deux sont cohérents à un jour près,
 * ce qui est sans effet sur le TDEE et évite une année sans fête.
 */
export function isBirthday(birth: Stamp | undefined, today: Stamp): boolean {
  if (!birth) return false;
  const b = parts(birth); const t = parts(today);
  if (!b || !t) return false;
  if (t.m === b.m && t.d === b.d) return true;
  const neLe29Fevrier = b.m === 2 && b.d === 29;
  const anneeSans29 = !isRealDate(t.y, 2, 29);
  return neLe29Fevrier && anneeSans29 && t.m === 2 && t.d === 28;
}

/**
 * Bornes de saisie, dérivées de l'âge et non écrites en dur : la borne d'âge
 * minimale vit dans `lib/safety.ts::MIN_AGE` et ne doit pas être recopiée ici.
 * On borne large — la validation d'éligibilité, elle, reste seule juge.
 */
export const BIRTH_YEAR_MIN = 1900;
