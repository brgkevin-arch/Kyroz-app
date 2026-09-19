import { DevSettings, Platform } from 'react-native';
import * as Updates from 'expo-updates';

// ── Redémarrer l'app (2026-09-19) ─────────────────────────────────────────────────────
//
// Un seul appelant : le CHANGEMENT DE COMPTE sur l'appareil (`hooks/useAuth.tsx`). Les
// données du compte précédent viennent d'être purgées du stockage, mais pas de la
// MÉMOIRE : les magasins chargés au démarrage (`app/_layout.tsx`) et les fournisseurs
// racine les gardent. Redémarrer est la seule façon de tout relire sans en oublier un.
//
// ⚠️ Rend `false` quand aucun redémarrage n'a pu partir : l'appelant doit alors
// continuer sans (reprendre l'hydratation), jamais rester bloqué.
// ⚠️ Pas importé par un fichier testé de `lib/` : `expo-updates` tire le runtime Expo.
export async function redemarrerApp(): Promise<boolean> {
  if (Platform.OS === 'web') {
    try { window.location.reload(); return true; } catch { return false; }
  }
  // En production, `reloadAsync` relance le JS (et applique une OTA téléchargée, s'il y en
  // a une — sans conséquence ici). En développement il n'est pas disponible.
  try { await Updates.reloadAsync(); return true; } catch {}
  if (__DEV__) {
    try { DevSettings.reload(); return true; } catch {}
  }
  return false;
}
