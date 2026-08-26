import { todayStamp } from './weight';

// ── Une date, telle qu'on la LIT ─────────────────────────────────────────────
//
// Ce formatage vivait à l'intérieur de `OffPlanHistory` : invisible aux tests, et
// prêt à être recopié à la première autre liste datée. C'est exactement l'histoire
// du `disclaimer`, dupliqué à l'identique dans sept fichiers (CLAUDE.md §8) — un
// style recopié partout est un rôle qui n'a pas de nom. L'historique des courses
// en avait besoin : il est sorti ici AVANT la copie, pas après.

/** Veille d'un 'YYYY-MM-DD', au même format (arithmétique de calendrier LOCAL). */
function veilleDe(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * « Aujourd'hui » · « Hier » · « Mardi 5 août ».
 *
 * ⚠️ Surtout PAS `textTransform: 'capitalize'` côté style : il met une majuscule à
 * CHAQUE mot et rend « Mardi 5 Août ». En français, seul le premier en prend une.
 */
export function frDateLongue(iso: string, today: string = todayStamp()): string {
  if (iso === today) return "Aujourd'hui";
  if (iso === veilleDe(today)) return 'Hier';
  const txt = new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/**
 * Ce qu'on dit d'un 31 février.
 *
 * ⚠️ Écrit en double jusqu'au 2026-08-26 — `BirthDateField` (date de naissance) et
 * `goalLadder` (échéance d'objectif) validaient chacun sa date avec sa propre copie
 * de la même phrase. Deux saisies de date, jamais vues ensemble, donc une
 * divergence n'aurait sauté aux yeux de personne : c'est exactement le cas où une
 * source unique coûte une ligne et évite deux textes.
 */
export const DATE_IMPOSSIBLE = 'Cette date n\u2019existe pas — vérifie le jour et le mois.';
