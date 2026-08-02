import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
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
