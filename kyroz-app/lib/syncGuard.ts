// Garde-fou anti-écrasement du profil (problème C) — logique PURE, sans aucune
// dépendance runtime (Supabase / AsyncStorage), donc testable isolément.
//
// Le profil pilote TOUT (macros, plan). Aujourd'hui l'hydratation à la connexion
// fait « le cloud gagne toujours » : si une ligne existe au cloud, elle écrase le
// local sans comparaison. Couplé à un push qui peut échouer en silence (schéma
// désaligné → { error } ignoré), ça transforme un simple conflit en PERTE SÈCHE :
// édition locale → push rejeté → cloud périmé → prochaine hydratation écrase le
// local frais. Le garde-fou : tant que le local n'est pas CONFIRMÉ poussé (dirty),
// le cloud n'a pas le droit de l'écraser.

export const PROFILE_PENDING_KEY = '@kyroz:profilePending';

export type ProfileHydrationAction = 'keep_local' | 'pull_cloud' | 'push_local' | 'noop';

// Décision d'hydratation du profil à la connexion :
//  - keep_local : local non confirmé poussé (dirty) → NE PAS écraser, le (re)pousser ;
//  - pull_cloud : le cloud fait foi → écraser le local (réinstall / multi-appareils) ;
//  - push_local : cloud vide, local présent → pousser le local ;
//  - noop       : rien des deux côtés.
export function decideProfileHydration(a: {
  hasCloud: boolean;
  hasLocal: boolean;
  localDirty: boolean;
}): ProfileHydrationAction {
  if (a.hasLocal && a.localDirty) return 'keep_local'; // ← garde-fou : le local non synchronisé gagne
  if (a.hasCloud) return 'pull_cloud';
  if (a.hasLocal) return 'push_local';
  return 'noop';
}
