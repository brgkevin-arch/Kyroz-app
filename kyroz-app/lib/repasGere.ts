// ── « Tu prends toujours le même petit-déjeuner ? » ──────────────────────────
//
// Décision fondateur du 2026-09-23 : à l'inscription, quand quelqu'un DÉCOCHE un
// repas, on lui dit qu'un repas toujours identique se règle au lieu de se retirer —
// et on le dit AVEC LE NOM du repas décoché. La phrase vivait en bas de la page, où
// elle s'adressait à tout le monde et donc à personne.
//
// ⚠️ UNE SEULE FOIS, à la PREMIÈRE décoche (même décision) : la deuxième n'apprend
// plus rien, et deux interruptions d'affilée apprennent surtout qu'on peut les passer
// — le coût d'une bulle de trop, déjà payé sur la visite guidée (CLAUDE.md §8).
//
// ⚠️ LE NOM VIENT DU CRÉNEAU, PAS D'UNE TABLE RECOPIÉE. Les créneaux se créent
// (`lib/mealSlots.ts`, « Shaker post-training ») : une liste de quatre libellés écrite
// ici serait fausse dès le premier repas ajouté par un utilisateur.

import type { MealType } from './types';

/** Ce que la boîte affiche : une question, puis où ça se règle. */
export interface MessageRepasGere {
  titre: string;
  message: string;
}

/**
 * Le genre et l'élision des QUATRE créneaux intégrés — « le petit-déjeuner »,
 * « la collation ». Un créneau créé n'a pas de genre connu : sa phrase le NOMME
 * entre guillemets plutôt que de deviner un article (« la même chose à “Shaker
 * post-training” »), au lieu d'écrire « le même Shaker post-training ».
 */
const FORME_INTEGREE: Partial<Record<MealType, string>> = {
  breakfast: 'le même petit-déjeuner',
  lunch: 'le même déjeuner',
  dinner: 'le même dîner',
  snack: 'la même collation',
};

/** Où le réglage vit vraiment — vérifié par `pagesOnboarding.test.ts`. */
export const CHEMIN_REGLAGE = 'Profil → Paramètres des repas';

export function messageRepasGere(id: MealType, libelle: string): MessageRepasGere {
  const forme = FORME_INTEGREE[id];
  return {
    titre: forme
      ? `Tu prends toujours ${forme} ?`
      : `Tu prends toujours la même chose à « ${libelle} » ?`,
    // ⚠️ « Tu pourras » et pas « tu peux » : à l'inscription, le Profil n'existe pas
    // encore — le plan n'est pas généré. Une promesse au présent serait fausse d'une
    // minute (CLAUDE.md §10).
    message: `Pas besoin de le retirer : tu pourras le régler dans ${CHEMIN_REGLAGE}. Kyroz le comptera dans ton total et calera les autres repas autour.`,
  };
}
