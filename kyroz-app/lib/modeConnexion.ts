// ── Sur quel formulaire s'ouvre l'écran de connexion ─────────────────────────
//
// Décision fondateur du 2026-10-19 (« comme toute app : la connexion en gros, et en
// petit en bas l'inscription »). L'écran s'ouvrait TOUJOURS sur « Inscription » —
// y compris pour qui revenait après une déconnexion. Signalé le 2026-10-09 : « je ne
// peux plus me connecter, ça me recrée un compte à chaque fois ».
//
// La règle tient en une ligne : **on n'ouvre sur l'inscription que si l'on arrive
// du carrousel d'accueil**, c'est-à-dire la première fois sur cet appareil. Toute
// autre arrivée — déconnexion, session perdue, mot de passe refusé, app rouverte —
// est celle de quelqu'un qui a déjà un compte, ou qui en a commencé un.
//
// ⚠️ Ce fichier n'importe rien, à dessein : l'écran tire react-native, donc la
// décision ne se teste qu'ici.

export type ModeConnexion = 'signin' | 'signup';

/** Le formulaire ouvert à l'arrivée sur l'écran. `introDejaVue` : le carrousel
 *  d'accueil a déjà été vu sur cet appareil AVANT cette arrivée. */
export function modeDArrivee(introDejaVue: boolean): ModeConnexion {
  return introDejaVue ? 'signin' : 'signup';
}
