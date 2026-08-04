import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import { isPrerender } from './prerender';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Clé de stockage de la session, posée EXPLICITEMENT.
//
// ⚠️ Sa valeur est IDENTIQUE au défaut de supabase-js (`sb-<ref>-auth-token`,
// où `<ref>` est le premier segment du nom d'hôte) : aucun compte déjà connecté
// n'est déconnecté par ce changement. On la pose nous-mêmes pour deux raisons :
//   - pouvoir relire la session SANS réseau au démarrage (cf. `readPersistedSession`) ;
//   - ne plus dépendre d'un détail interne de la librairie, qui la ferait changer
//     en silence — ce qui déconnecterait tout le monde à une mise à jour.
function projectRef(url: string): string {
  try { return new URL(url).hostname.split('.')[0]; } catch { return 'kyroz'; }
}
export const AUTH_STORAGE_KEY = `sb-${projectRef(supabaseUrl)}-auth-token`;

/**
 * Y a-t-il un navigateur sous nos pieds ? (E7, 2026-08-04)
 *
 * Le PRÉ-RENDU STATIQUE des pages web (`expo.web.output: "static"`) exécute l'app dans
 * **Node**, au moment du build. `window` n'y existe pas — et AsyncStorage web n'est
 * qu'une façade sur `window.localStorage`. Or `createClient` ne se contente pas de
 * construire : il **démarre aussitôt sa session** (`_emitInitialSession` →
 * `__loadSession` → `getItem`). Le build mourait donc sur
 * `ReferenceError: window is not defined`, avant d'avoir rendu la moindre route.
 *
 * ⚠️ **Le test porte sur `Platform.OS` EN PLUS de `window`, et ce n'est pas de la
 * ceinture-bretelles.** Se fier au seul `typeof window === 'undefined'` marcherait
 * aujourd'hui — React Native définit `window` (alias de `global`) — mais c'est un
 * détail d'implémentation du runtime, pas un contrat. S'il tombait, iOS et Android
 * basculeraient sur le stockage muet : **tout le monde serait déconnecté**, en
 * silence, et la cause serait introuvable. Avec `Platform.OS`, le cas natif est exclu
 * par construction, quoi que fasse le runtime.
 *
 * Vrai UNIQUEMENT dans Node pendant le pré-rendu. Faux sur iOS, Android, et dans un
 * vrai navigateur.
 */
const PRERENDU = isPrerender(Platform.OS, typeof window !== 'undefined');

/**
 * Stockage MUET pour le pré-rendu : aucune session à charger au build, et rien à
 * écrire. Une page pré-rendue est du HTML public, identique pour tout le monde —
 * l'app rejoue sa vraie session dans le navigateur dès qu'elle s'hydrate.
 * ⚠️ Ne PAS le remplacer par un objet en mémoire : ça donnerait l'illusion d'une
 * session persistée là où il n'y a personne à connecter.
 */
const stockageMuet = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: PRERENDU ? stockageMuet : AsyncStorage,
    storageKey: AUTH_STORAGE_KEY,
    // Pas de minuterie de rafraîchissement pendant un build : elle maintiendrait le
    // processus Node en vie et ferait traîner l'export sans jamais rien rafraîchir.
    autoRefreshToken: !PRERENDU,
    persistSession: !PRERENDU,
    detectSessionInUrl: false,
  },
});

/**
 * Session telle qu'elle est ENREGISTRÉE SUR L'APPAREIL, lue sans le moindre
 * appel réseau. Sert de repli quand `getSession()` n'a pas répondu dans son
 * budget (cf. lib/boot.ts) : sans elle, un réseau muet renverrait vers l'écran
 * de connexion quelqu'un qui est parfaitement connecté, et lui masquerait un
 * plan pourtant présent en local.
 *
 * Ce n'est PAS une validation : le jeton peut être périmé. C'est un repli
 * d'affichage — Supabase reste seul juge de la session, et `onAuthStateChange`
 * corrige dès que le réseau répond.
 */
export async function readPersistedSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token && parsed?.user ? (parsed as Session) : null;
  } catch {
    return null;
  }
}
