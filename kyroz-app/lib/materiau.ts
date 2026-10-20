// ── Le MATÉRIAU — sixième axe, et le dernier vraiment ────────────────────────
//
// Forme, texte, blanc, finitions, mouvement ont chacun reçu un rôle, un token et
// un test. Restait ce qu'une surface est FAITE : Kyroz ne connaissait qu'un seul
// matériau, la peinture opaque. Une barre d'onglets peinte en `card` cache ce
// qu'il y a dessous ; celle d'iOS 26 le laisse deviner, et c'est ce flou qui dit
// à l'œil « il y a encore du contenu par là ».
//
// 🔴 CE FICHIER NE DÉCIDE QUE **QUAND** SERVIR DU VERRE — jamais à quoi il
// ressemble. Il n'importe rien (ni react-native, ni expo-glass-effect), et c'est
// la condition de sa testabilité : `theme.ts` tire react-native, donc il n'est
// pas importable sous vitest. Même découpe que `lib/motion.ts` (le pur) et
// `components/Presse.tsx` (le câblage).
//
// ⚠️ POURQUOI TROIS CONDITIONS ET PAS UNE. Chacune répond à une question
// différente, et sauter la première FAIT CRASHER l'app (expo/expo#40911) :
//   1. `apiVerre`  — le module natif existe-t-il ? Sur un binaire plus vieux que
//      le bundle OTA, non. Une OTA peut atterrir sur un binaire d'avant.
//   2. `liquidGlass` — l'app tourne-t-elle bien SOUS le design Liquid Glass ?
//      Faux sur iOS 18 et en dessous, même quand le module est là.
//   3. `transparenceReduite` — l'utilisateur a-t-il demandé qu'on arrête de
//      voir à travers ? (Réglages → Accessibilité → Affichage → Réduire la
//      transparence.) Apple teste ce réglage en revue, exactement comme
//      « Réduire les animations ».

/** Le seul style de verre servi par Kyroz, et pourquoi il n'y en a qu'un. */
export const VERRE = {
  /**
   * `regular` : le verre qui garde le texte lisible par-dessus n'importe quel
   * contenu. C'est le matériau des barres et des feuilles.
   *
   * ⚠️ `clear` existe, et il est ÉCARTÉ volontairement : il ne se tient que
   * par-dessus une photo, dont le bruit fabrique le contraste. Kyroz n'affiche
   * aucune image derrière ses barres — un `clear` y laisserait des libellés
   * gris sur gris. Un second token de même valeur serait un cran sans rôle
   * (cf. la règle de l'échelle d'espacement) : quand un vrai second usage
   * apparaîtra, il apportera son nom avec lui.
   */
  standard: 'regular',
} as const;

export type ContexteMateriau = {
  /** Le module natif `ExpoGlassEffect` répond-il ? Faux hors iOS, et sur un binaire d'avant. */
  apiVerre: boolean;
  /** L'app tourne-t-elle sous le design Liquid Glass (iOS 26+) ? */
  liquidGlass: boolean;
  /** L'utilisateur a demandé de réduire la transparence. */
  transparenceReduite: boolean;
};

/**
 * Sert-on du verre, ou de la peinture ?
 *
 * ℹ️ Le repli n'est pas un mode dégradé : c'est **exactement** l'apparence de
 * Kyroz avant ce chantier. Un iPhone sur iOS 18, un Android et le web voient
 * l'app d'hier, au pixel près — ce qui rend ce lot publiable en OTA sans risquer
 * un écran illisible chez qui n'a pas le bon système.
 */
export function doitServirDuVerre(c: ContexteMateriau): boolean {
  if (!c.apiVerre) return false;
  if (!c.liquidGlass) return false;
  if (c.transparenceReduite) return false;
  return true;
}

// ℹ️ `styleBarre` vivait ici jusqu'au 2026-10-19 : la barre d'onglets DESSINÉE
// sortait du flux et recevait le verre par `tabBarBackground`. Sur iOS, c'est
// désormais la barre d'Apple (`UITabBar`) qui porte le Liquid Glass ; ailleurs, il
// n'y a pas de verre. La règle qu'elle portait reste vraie et reste comptée par
// `materiauxDA` : une barre qui FLOTTE impose un dégagement de bas à chaque onglet
// (`Fond.barreOnglets`) — la barre d'Apple flotte, elle aussi.
