import AsyncStorage from '@react-native-async-storage/async-storage';
import { relireSyncEnAttente } from './syncEnAttente';

// ── À qui appartiennent les données posées sur CET appareil ? ────────────────
//
// 🔴 UN COMPTE POUVAIT HÉRITER DES DONNÉES DU PRÉCÉDENT (constat 01-01, P0).
// La purge locale n'existait que dans l'appelant du bouton « Se déconnecter »
// (`profil.tsx::doLogout`). `signOut()` lui-même ne purgeait rien
// (`hooks/useAuth.tsx` : `await supabase.auth.signOut();`), et AUCUN autre chemin de
// perte de session n'effaçait quoi que ce soit — jeton révoqué, mot de passe changé
// ailleurs, compte supprimé depuis un autre appareil, session expirée. L'app repassait
// au login sans rien effacer, et le compte suivant héritait du poids, du %MG et des
// cibles du précédent.
//
// 🔴 **ET LE CONSTAT ÉTAIT SOUS-ESTIMÉ** (contre-audit, `lib/sync.ts:440-500`) : ce
// n'est pas que le profil. Quand la ligne cloud du NOUVEAU compte est vide, favoris,
// réserve, pesées et recettes personnalisées du PRÉCÉDENT sont **poussés** dans son
// compte. Et pesées, série et recettes sont *fusionnées*, donc le mélange devient
// permanent des deux côtés. Le transfert A → B ne demande même pas que le profil soit
// marqué « à pousser ».
//
// ➡️ Deux fermetures, à deux endroits, parce qu'elles ne couvrent pas le même trou :
//  1. **la purge devient une propriété de `signOut()`** (et de l'événement `SIGNED_OUT`,
//     qui est le seul à voir les pertes de session INVOLONTAIRES) — c'est ce qui
//     protège les données AU REPOS sur un appareil partagé ;
//  2. **l'identité entre dans l'hydratation** — c'est le point de passage unique par
//     lequel toute connexion arrive, donc le seul endroit où l'on peut garantir qu'un
//     compte n'hérite de rien, même si la purge n'a pas eu lieu (app tuée en plein
//     milieu, version antérieure, onglet web resté ouvert).

// ── 1. Ce qu'une purge de session ÉPARGNE ────────────────────────────────────

/**
 * Les seules clés qui survivent : des préférences d'APPAREIL, jamais des données
 * personnelles. Elles restent parce qu'elles ne disent rien de personne — et parce
 * que les reperdre à chaque déconnexion serait une régression visible.
 *
 * ⚠️ Cette liste est délibérément COURTE et se lit en liste blanche, jamais en liste
 * noire : une clé nouvelle est purgée par défaut. L'inverse — purger une liste noire —
 * ferait survivre en silence toute clé ajoutée après coup, c'est-à-dire exactement le
 * défaut que 01-01 décrit, un cran plus bas.
 */
export const CLES_CONSERVEES: readonly string[] = ['@kyroz:theme', '@kyroz:reminder'];

/**
 * Les clés à retirer, à partir de tout ce que le stockage contient.
 *
 * ⚠️ Fonction PURE et exportée pour être testable : `AsyncStorage` n'est pas
 * instrumentable ici, mais la DÉCISION « qu'est-ce qui part » l'est, et c'est elle qui
 * porte la garantie.
 */
export function clesAPurger(toutes: readonly string[]): string[] {
  return toutes.filter((k) => !CLES_CONSERVEES.includes(k));
}

// ── 2. À qui appartient le profil posé sur cet appareil ? ────────────────────

export type Proprietaire =
  /** Ce compte-ci. Rien à faire. */
  | 'meme'
  /** Un AUTRE compte : ses données ne doivent ni s'afficher ici, ni partir au cloud. */
  | 'autre'
  /** Jamais lié à un compte : une inscription en cours. **À GARDER.** */
  | 'sans_compte';

/**
 * Un profil local créé à l'inscription porte `user-<horodatage>`, jamais un uid.
 *
 * 🔴 **C'EST CE QUI REND LA RECO PUBLIÉE INAPPLICABLE TELLE QUELLE.** Elle dit : « un
 * `@kyroz:profile` dont l'`id` diffère de l'`uid` entrant se jette, il ne se fusionne
 * pas ». Appliquée à la lettre, elle JETTE le profil de quelqu'un dont le push a échoué
 * hors ligne juste après l'inscription (`onboarding.tsx:334`, contre-audit `CA-1-04`) —
 * un cas parfaitement sain, et le plus fréquent des trois.
 */
const ID_SANS_COMPTE = /^user-\d+$/;

/**
 * Le verdict d'appartenance. **Le défaut n'est PAS permissif** : tout `id` qui n'est
 * ni cet uid ni un identifiant d'inscription est traité comme celui d'un autre compte.
 *
 * ⚠️ Le sens du risque décide du défaut, et les deux erreurs ne se valent pas :
 *  · classer à tort en `sans_compte` fait FUIR des données de santé vers un autre
 *    compte — le défaut que ce constat décrit ;
 *  · classer à tort en `autre` fait perdre un profil local d'une forme d'`id` qui
 *    n'existe nulle part dans ce dépôt (deux producteurs seulement : `rowToProfile`
 *    pose l'uid, l'inscription pose `user-<horodatage>`).
 * On teste donc l'APPARTENANCE à une forme connue, jamais l'absence d'une autre —
 * même discipline que `katchEligible` et `macroMode`.
 */
export function proprietaireLocal(idLocal: unknown, uid: string): Proprietaire {
  if (typeof idLocal !== 'string' || idLocal.length === 0) return 'sans_compte';
  if (idLocal === uid) return 'meme';
  return ID_SANS_COMPTE.test(idLocal) ? 'sans_compte' : 'autre';
}

/**
 * Faut-il faire place nette avant d'hydrater ce compte ?
 *
 * ⚠️ **`autre` L'EMPORTE SUR « À POUSSER ».** C'est le cas le plus grave du constat :
 * un local marqué dirty donnait `keep_local`, donc `pushProfile(local)`, donc **le
 * profil de A écrit dans la ligne cloud de B**. Les données de A sont alors perdues —
 * et c'est assumé : sa session n'existe plus, aucun chemin ne permet de les lui rendre,
 * et les garder ferait lire ses données de santé par quelqu'un d'autre. Une perte
 * délibérée vaut mieux qu'une fuite silencieuse.
 */
export function doitPurgerAvantHydratation(idLocal: unknown, uid: string): boolean {
  return proprietaireLocal(idLocal, uid) === 'autre';
}

// ── 3. La purge elle-même ────────────────────────────────────────────────────

/**
 * Efface tout ce qui appartient à la session locale — **et c'est une propriété de
 * cette fonction, plus de son appelant** (constat 01-02, qui est 01-01 en plus petit).
 *
 * ⚠️ L'ORDRE COMPTE, et chaque ligne a déjà été oubliée une fois :
 *  1. **les photos d'abord** : ce sont des FICHIERS, et la clé n'en est que la carte.
 *     Purger la carte d'abord, c'est perdre l'adresse des octets ;
 *  2. **le rappel de pesée ensuite** : sa cadence vit dans le profil qu'on purge, donc
 *     après la purge plus personne ne peut ni le ré-armer ni l'éteindre — et c'est un
 *     déclencheur RÉPÉTITIF. Le rappel QUOTIDIEN, lui, survit exprès : sa préférence
 *     est dans `CLES_CONSERVEES` et le démarrage la relit ;
 *  3. **les clés enfin**, en liste blanche.
 *
 * ⚠️ Ne lève JAMAIS. Elle est appelée depuis `onAuthStateChange`, où une exception
 * laisserait l'app avec une session morte et des données vivantes — le pire des deux.
 *
 * ⚠️ **`effets` EST REQUIS, PAS OPTIONNEL, et ce n'est pas une commodité de test.**
 * `lib/photos.ts` et `lib/notifications.ts` importent `expo-image-picker`,
 * `expo-file-system` et `expo-notifications` : les importer ici rendrait INTESTABLE
 * tout fichier de `lib/` qui remonte jusqu'ici — dont `sync.ts`, qui porte la garde
 * d'identité (mesuré : trois suites tombaient sur `__DEV__ is not defined`). Un défaut
 * les aurait rendus silencieusement oubliables ; sans défaut, c'est `tsc` qui les
 * réclame. Même règle que `bootProfile(raw, recalc)`.
 */
export type EffetsPurge = {
  /** Efface les FICHIERS des photos de progression (`lib/photos.ts`). */
  photos: () => Promise<void>;
  /** Éteint le rappel de pesée (`lib/notifications.ts`). */
  notificationPesee: () => Promise<void>;
};

export async function purgerSessionLocale(effets: EffetsPurge): Promise<void> {
  try { await effets.photos(); } catch {}
  try { await effets.notificationPesee(); } catch {}
  try {
    const toutes = await AsyncStorage.getAllKeys();
    const aRetirer = clesAPurger(toutes);
    if (aRetirer.length) await AsyncStorage.multiRemove(aRetirer);
  } catch {}
  // Le drapeau « à pousser » part avec le reste ; on rediffuse pour que l'indicateur
  // « à synchroniser » ne reste pas allumé sur des modifications qui n'existent plus.
  try { await relireSyncEnAttente(); } catch {}
}
