// ── Les colonnes d'une roulette de date ─────────────────────────────────────
//
// Décisions PURES de la roulette de date de naissance : ce que chaque colonne
// contient, ce qui se passe quand on change de mois, et où la roulette s'ouvre
// quand rien n'est encore choisi. Le composant (`components/Wheel.tsx`,
// `components/BirthDateField.tsx`) ne fait que les rendre.
//
// Même procédé que `collapsingTitle.ts`, `accentColor.ts` et `tours.ts` : ce
// fichier n'importe RIEN de react-native, donc il se teste en l'appelant. Une
// roulette est un GESTE, et un geste ne se vérifie pas dans le panneau navigateur
// (CLAUDE.md §5) — raison de plus pour que tout ce qui se décide se décide ici.

import { BIRTH_YEAR_MIN } from './birthday';

export const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const;

/** Nombre de jours du mois — le jour 0 du mois suivant est le dernier de celui-ci. */
export function joursDansMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/**
 * Les années proposées, de la plus RÉCENTE à la plus ancienne (on fait défiler
 * vers le bas pour vieillir, comme iOS).
 *
 * 🔴 ELLE MONTE JUSQU'À L'ANNÉE COURANTE, ET SURTOUT PAS JUSQU'À `MIN_AGE`.
 * Le geste évident est de n'offrir que les années donnant 18 ans ou plus — il
 * rendrait le hard block mineur (`safety.ts::MIN_AGE`, CLAUDE.md §6) INATTEIGNABLE
 * depuis ce champ : plus personne ne pourrait déclarer son âge réel, donc plus
 * personne ne serait refusé, donc le garde-fou ne garderait plus rien tout en
 * restant vert dans les tests. Un mineur doit pouvoir saisir sa vraie date et
 * recevoir le refus — c'est le refus qui protège, pas l'impossibilité de répondre.
 */
export function anneesPossibles(anneeCourante: number): number[] {
  const out: number[] = [];
  for (let a = anneeCourante; a >= BIRTH_YEAR_MIN; a--) out.push(a);
  return out;
}

/**
 * Le jour, ramené dans le mois. Passer de 31 janvier à février doit rendre 28
 * (ou 29), jamais une date qui n'existe pas.
 *
 * ⚠️ On CLAMPE au lieu de refuser : une roulette n'a pas d'état « invalide » —
 * elle affiche toujours quelque chose, donc ce qu'elle affiche doit toujours
 * exister. C'est la différence de fond avec les trois champs tapés, qui eux
 * pouvaient porter un 31/02 le temps d'une frappe.
 */
export function clampJour(jour: number, annee: number, mois: number): number {
  const max = joursDansMois(annee, mois);
  return Math.min(Math.max(jour, 1), max);
}

export interface DatePartie { j: number; m: number; a: number }

/** 'YYYY-MM-DD' → parties, ou `null` si le stamp est illisible. */
export function decouper(stamp?: string): DatePartie | null {
  const m = stamp ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp) : null;
  return m ? { a: +m[1], m: +m[2], j: +m[3] } : null;
}

/**
 * Où la roulette s'ouvre quand AUCUNE date n'est enregistrée.
 *
 * 🔴 CE N'EST PAS UNE VALEUR ENREGISTRÉE, c'est une position de départ. Rien
 * n'est écrit tant que la personne n'a pas validé — sinon un profil recevrait
 * une date de naissance que personne n'a choisie, donc un âge faux, donc un BMR
 * faux, en silence (CLAUDE.md §10 : « un chiffre affiché est celui qui sera
 * servi »). L'ancrage n'existe que pour éviter d'ouvrir la roulette sur 1900.
 *
 * 30 ans : le milieu de la cible déclarée de Kyroz (18–50 ans). Le 1er janvier
 * plutôt qu'une date « plausible » — un jour rond se lit comme un défaut, une
 * date crédible se lit comme une valeur déjà saisie.
 */
export function ancrage(anneeCourante: number): DatePartie {
  return { j: 1, m: 1, a: anneeCourante - 30 };
}

/** Parties → 'YYYY-MM-DD'. Le jour est clampé, donc le résultat existe toujours. */
export function assembler(p: DatePartie): string {
  const j = clampJour(p.j, p.a, p.m);
  return `${String(p.a).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

/** Libellé lisible d'une date choisie — « 2 août 1994 ». */
export function libelleDate(stamp: string): string {
  const p = decouper(stamp);
  if (!p) return '';
  return `${p.j} ${MOIS_FR[p.m - 1]} ${p.a}`;
}
