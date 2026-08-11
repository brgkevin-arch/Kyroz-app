// ── Le RETOUR AU TOUCHER — ce que la main sent, et ce qu'elle ne doit PAS sentir
//
// Septième axe, et le seul qui ne se voit pas. Il suit la même découpe que ses
// prédécesseurs : ce fichier est **pur, sans aucun import**, il décide QUEL retour
// va avec QUEL geste ; `lib/retourHaptique.ts` fait le câblage natif.
//
// 🔴 LA RÈGLE PREMIÈRE EST UNE RÈGLE DE RARETÉ, et c'est celle qu'on enfreint en
// croyant bien faire : **un bouton ordinaire ne vibre pas**. Apple écrit
// « use haptics sparingly », et la raison est simple — un retour que l'on sent
// partout ne signale plus rien, il devient le bruit de fond de l'app. Quatre rôles
// seulement, chacun attaché à un moment qui MÉRITE d'être confirmé au doigt. Un
// cinquième rôle devra dire quel geste il couvre que les quatre ne couvrent pas.
//
// ⚠️ POURQUOI IL N'Y A PAS DE STORE D'ACCESSIBILITÉ ICI, contrairement au verre et
// au mouvement. Sur iOS, `UIFeedbackGenerator` respecte **tout seul** le réglage
// « Retour haptique du système » (Réglages → Sons et vibrations) : quelqu'un qui
// l'éteint ne sent rien, sans qu'on ait à le lire. Ajouter un store ici
// dupliquerait une décision déjà prise par le système — et le dupliquer, c'est
// créer un endroit où elle peut diverger.

export type RoleHaptique = 'choix' | 'validation' | 'refus' | 'declic';

/**
 * Les quatre primitives d'Apple, une par rôle. Les noms de gauche disent le
 * MOMENT, ceux de droite la sensation — c'est volontaire : un appelant choisit ce
 * qu'il est en train de faire, pas ce qu'il veut faire ressentir.
 *
 * ⚠️ **Deux rôles ne peuvent pas partager une primitive.** Ce serait deux noms
 * pour une seule sensation, donc un cran sans rôle — la faute exacte que l'échelle
 * d'espacement interdit depuis le 2026-08-06, et le verre depuis hier. Compté par
 * `haptiqueDA`.
 */
export const PRIMITIVE = {
  /** On choisit une option parmi plusieurs : segment, jour de la semaine, régime, silhouette. */
  choix: 'selection',
  /** Une action ABOUTIT : un repas coché, un plan généré, un réglage enregistré. */
  validation: 'succes',
  /** Une action est refusée, ou elle échoue. Jamais pour un simple avertissement. */
  refus: 'erreur',
  /** Un SEUIL de geste est franchi — la feuille vient de décider qu'elle partait. */
  declic: 'impactLeger',
} as const satisfies Record<RoleHaptique, string>;

/**
 * Émet-on quelque chose sur cette plateforme ?
 *
 * 🔴 **LE WEB EST COUPÉ, ET CE N'EST PAS UN OUBLI.** `expo-haptics` n'y est pas
 * neutre : il appelle `navigator.vibrate` quand le navigateur le propose, et sur
 * iOS Safari il injecte un `<input type="checkbox" switch>` caché qu'il clique
 * pour arracher au système une vibration. Mesuré en lisant le paquet, pas supposé.
 * Un SITE qui fait vibrer le téléphone est une surprise, pas une affordance — le
 * retour au toucher appartient à l'app installée. ➡️ Couper ici est le choix, et il
 * doit être RELU si Kyroz devient un jour une PWA installable.
 */
export function doitEmettre(plateforme: string): boolean {
  return plateforme === 'ios' || plateforme === 'android';
}
