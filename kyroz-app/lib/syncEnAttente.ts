import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { PROFILE_PENDING_KEY } from './syncGuard';

// ── « Tes modifications sont-elles parties ? » ───────────────────────────────
//
// 🔴 KYROZ NE SAIT PAS DIRE QU'IL EST HORS LIGNE (constat 05-05). Aucun `NetInfo`,
// aucun `isConnected`, aucun texte d'interface ne contient « hors ligne ».
//
// ⚠️ **ET IL NE FAUT PAS EN AJOUTER UN.** L'architecture est offline-first et le fait
// BIEN : le moteur est local, le plan se génère sans réseau, et une écriture qui n'a pas
// pu partir n'est pas perdue — elle est marquée « à pousser » (`markProfileDirty`) et
// repoussée plus tard. Rien ne disparaît en silence. Ce qui manque n'est pas la
// robustesse, c'est **le mot** : personne ne sait que ses modifications attendent.
//
// ➡️ D'où un indicateur de **synchronisation en attente**, et non une bannière « hors
// ligne ». La différence n'est pas cosmétique :
//  · une bannière « hors ligne » énonce un ÉTAT RÉSEAU dont l'app ne fait rien, et elle
//    inquiète pour une situation où tout fonctionne. C'est très exactement ce que la
//    règle produit interdit — « tout suivi affiché doit rassurer, jamais mettre la
//    pression » ;
//  · « à synchroniser » énonce un FAIT VÉRIFIABLE, dit que ça partira tout seul, et
//    **disparaît de lui-même** quand c'est fait. Il n'y a rien à faire, et c'est ce que
//    la phrase doit rendre évident.
//
// ⚠️ **IL NE S'AFFICHE QUE S'IL Y A QUELQUE CHOSE EN ATTENTE.** Un indicateur permanent
// qui dirait « synchronisé » la plupart du temps deviendrait du décor, et son absence
// cesserait d'être un signal. Même raison que la ligne « Supprimer mes statistiques »,
// qui n'apparaît que si un pseudonyme existe.

/**
 * Le drapeau « le profil local n'est pas confirmé poussé ».
 *
 * ⚠️ C'est **exactement** celui qui protège le profil de l'écrasement cloud
 * (`syncGuard::decideProfileHydration`) — pas une seconde source. Une copie parallèle
 * finirait par annoncer « tout est synchronisé » sur un profil que le garde-fou, lui,
 * considère encore comme sale.
 */
let enAttente = false;
const abonnes = new Set<() => void>();

function diffuser(v: boolean): void {
  if (v === enAttente) return;
  enAttente = v;
  for (const f of abonnes) f();
}

/**
 * Relit le drapeau depuis le stockage et le diffuse.
 *
 * ⚠️ **À APPELER APRÈS CHAQUE ÉCRITURE DE PROFIL, pas « au focus ».** Le drapeau est
 * posé par `saveProfile` (donc depuis n'importe quel écran) et levé par un push réussi
 * (donc en tâche de fond, sans qu'aucun écran ne soit au premier plan). Une relecture au
 * focus laisserait l'indicateur figé jusqu'au prochain changement d'onglet — c'est le
 * défaut « un réglage lu par un autre écran ne se relit pas au focus, il se DIFFUSE »,
 * déjà payé quatre fois dans ce dépôt.
 */
export async function relireSyncEnAttente(): Promise<void> {
  try {
    diffuser((await AsyncStorage.getItem(PROFILE_PENDING_KEY)) === '1');
  } catch {
    // Un stockage illisible n'est pas « tout est synchronisé » : on ne touche à rien
    // plutôt que d'annoncer une bonne nouvelle qu'on n'a pas mesurée.
  }
}

/** Lecture synchrone, sans passer par le stockage — pour `useSyncExternalStore`. */
export function syncEnAttente(): boolean {
  return enAttente;
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

/**
 * `true` quand des modifications locales attendent de partir au cloud.
 *
 * Patron obligatoire des valeurs d'appareil : store externe hors React +
 * `useSyncExternalStore`, chargé une fois au layout racine. Le troisième argument
 * (`getServerSnapshot`) rend `false` — le pré-rendu statique du site n'a ni stockage ni
 * session, et annoncer une attente là-bas n'aurait aucun sens.
 */
export function useSyncEnAttente(): boolean {
  return useSyncExternalStore(abonner, syncEnAttente, () => false);
}

/** Remet le store à zéro — tests uniquement. */
export function _reinitialiserSyncEnAttente(): void {
  enAttente = false;
  abonnes.clear();
}
