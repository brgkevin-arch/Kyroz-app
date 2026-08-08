import { useContext, useMemo } from 'react';
import { MealSlot } from '../lib/types';
import { BUILTIN_SLOTS, knownSlots } from '../lib/mealSlots';
import { ProfileContext } from './useProfile';

// ── Les créneaux de repas, lisibles depuis n'importe quel composant ──────────
//
// Une carte de repas doit afficher le NOM du créneau (« Shaker post-training »),
// et ce nom vit dans le profil. Le faire descendre en propriété à travers l'écran
// Plan puis la liste puis la carte, c'est trois fichiers à modifier chaque fois
// qu'un composant de plus veut l'afficher — et c'est exactement comme ça que le
// libellé « Collation » s'est retrouvé recopié dans cinq fichiers.
//
// ⚠️ Lit le contexte DIRECTEMENT au lieu de `useProfile()`, qui lève hors d'un
// `<ProfileProvider>`. Un libellé de repas n'est pas une raison de faire tomber un
// écran : sans provider (rendu de test, pré-rendu statique du web), on rend les
// 4 créneaux intégrés — c'est-à-dire exactement ce que l'app affichait avant eux.

export function useMealSlots(): MealSlot[] {
  const ctx = useContext(ProfileContext);
  const custom = ctx?.profile?.meal_slots;
  return useMemo(() => (custom?.length ? knownSlots({ meal_slots: custom }) : [...BUILTIN_SLOTS]), [custom]);
}
