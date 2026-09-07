import AsyncStorage from '@react-native-async-storage/async-storage';

// ── « Cet appareil a-t-il déjà vu l'accueil ? » ───────────────────────────────
//
// Le carrousel d'accueil (`components/IntroCarousel.tsx`) se montre une fois, pas à
// chaque démarrage : quelqu'un qui a fermé l'app au milieu de son inscription n'a
// pas à le refaire défiler pour revenir au formulaire.
//
// ⚠️ CETTE CLÉ N'EST PAS DANS `CLES_CONSERVEES`, ET C'EST VOULU. La liste blanche de
// `sessionLocale.ts` est délibérément courte ; une purge de session efface donc ce
// drapeau, et l'accueil se remontre après une déconnexion. C'est un tap de plus dans
// un cas rare — préférable à faire grossir une liste dont tout l'intérêt est de ne
// pas grossir.
//
// ⚠️ Et le harnais QA la neutralise en amont (`neutralizeFirstRun`), comme le
// consentement analytics et les tours : sans ça, tous les scripts Playwright
// buteraient sur un écran qu'ils ne connaissent pas. Le lien entre les deux est
// verrouillé par `lib/__tests__/introCarrousel.test.ts`.

export const CLE_INTRO_VUE = '@kyroz:introVue';

/** L'accueil a-t-il déjà été vu sur cet appareil ? Jamais bloquant : en cas d'échec
 *  de lecture on le REMONTRE, plutôt que de sauter ce qu'on n'a pas pu vérifier. */
export async function introDejaVue(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(CLE_INTRO_VUE)) === '1'; } catch { return false; }
}

/** Marque l'accueil comme vu. Silencieux : perdre ce drapeau ne coûte qu'un tap. */
export async function marquerIntroVue(): Promise<void> {
  try { await AsyncStorage.setItem(CLE_INTRO_VUE, '1'); } catch {}
}
