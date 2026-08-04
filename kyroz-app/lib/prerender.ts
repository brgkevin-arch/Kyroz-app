/**
 * Sommes-nous dans le PRÉ-RENDU statique des pages web ? (E7, 2026-08-04)
 *
 * `expo.web.output: "static"` pré-rend chaque route en HTML **au moment du build**,
 * pour que GitHub Pages réponde 200 au lieu de 404 sur un lien direct. Ce rendu
 * s'exécute dans **Node** : ni `window`, ni `localStorage`. Tout module qui touche le
 * stockage au chargement fait donc mourir le build — c'est ce qui arrivait au client
 * Supabase, qui démarre sa session dès sa construction.
 *
 * ⚠️ **Fichier SANS AUCUN import, et c'est délibéré.** Le prédicat vit ici plutôt que
 * dans `lib/supabase.ts` parce que ce dernier importe `react-native-url-polyfill`,
 * qui explose sous vitest (`NativeModules.BlobModule` est indéfini). Un garde-fou
 * qu'on ne peut pas tester n'est pas un garde-fou.
 */

/**
 * `platformOS` = `Platform.OS` · `hasWindow` = `typeof window !== 'undefined'`.
 *
 * ⚠️ **Le test porte sur les DEUX, et le second seul ne suffirait pas.** React Native
 * définit `window` aujourd'hui (alias de `global`), donc `!hasWindow` est faux sur
 * mobile — mais c'est un détail de runtime, pas un contrat. S'il tombait, iOS et
 * Android basculeraient sur un stockage muet et **perdraient leur session à chaque
 * démarrage, en silence**. `platformOS === 'web'` exclut le natif par construction.
 */
export function isPrerender(platformOS: string, hasWindow: boolean): boolean {
  return platformOS === 'web' && !hasWindow;
}
