/**
 * Quelle taille donner à l'aperçu d'écran du carrousel d'accueil.
 *
 * 🔴 **POURQUOI CE FICHIER EXISTE — le titre était COUPÉ EN DEUX** (constaté sur
 * TestFlight, build (17), 2026-09-07, capture du fondateur). La hauteur de l'aperçu
 * se calculait depuis la hauteur de la FENÊTRE moins une constante devinée
 * (`ENCOMBREMENT_AUTOUR = 330`) censée représenter « le logo, le titre, les points
 * et le bouton ». Cette constante ne comptait ni les encoches (~93 pt sur un iPhone
 * récent), ni le titre lui-même : l'aperçu prenait donc plus de place qu'il n'y en
 * avait, la diapo débordait de son rail, et comme la diapo est CENTRÉE
 * verticalement, le débordement se répartit en HAUT et en bas — le haut du titre
 * passait sous le logo, tranché net.
 *
 * ⚠️ **Le défaut n'est pas le chiffre 330, c'est le fait de deviner.** Un nombre
 * mesuré une fois sur un appareil vieillit à chaque encoche, chaque réglage de
 * police système, chaque texte plus long. On mesure donc ce qui est mesurable — la
 * hauteur du rail et celle du bloc titre+texte, toutes deux rendues par `onLayout`
 * — et on n'utilise le repli que le temps d'une frame, avant la première mesure.
 *
 * Pur et sans import : lu par le composant ET par son test.
 */

/** Le gabarit des captures (`test/intro-captures.mjs`) : un écran de téléphone. */
export const RATIO_ECRAN = 430 / 932;

/** En dessous, l'aperçu ne montre plus rien de lisible — autant ne pas mentir. */
export const HAUTEUR_MIN = 120;

export type MesuresApercu = {
  /** Hauteur offerte au rail, mesurée. `0` = pas encore mesuré. */
  hauteurRail: number;
  /** Hauteur du bloc titre + texte le PLUS HAUT des diapos, mesurée. */
  hauteurEntete: number;
  /** L'écart que la diapo pose entre l'en-tête et l'aperçu (`gap`). */
  ecart: number;
  /** Largeur utilisable, marges de page déduites. */
  largeurMax: number;
  /** Repli tant que rien n'est mesuré : la hauteur de la fenêtre. */
  hauteurFenetre: number;
};

/**
 * ⚠️ **L'INVARIANT, et c'est lui que le test tient** : `hauteur + hauteurEntete +
 * ecart ≤ hauteurRail` dès que le rail est mesuré. Autrement dit l'aperçu cède
 * toujours devant le texte — jamais l'inverse. Le titre est ce qui dit à quoi on
 * regarde ; un aperçu qui le pousse dehors se prive de sa propre légende.
 */
export function tailleApercu(m: MesuresApercu): { largeur: number; hauteur: number } {
  // Le repli ne sert qu'avant la première mesure. Il reste volontairement
  // grossier : le corriger ne servirait à rien, il est remplacé à la frame d'après.
  const dispo = m.hauteurRail > 0
    ? m.hauteurRail - m.hauteurEntete - m.ecart
    : m.hauteurFenetre * 0.62;

  // La largeur décide quand c'est ELLE qui manque (écran court et large, iPad en
  // paysage) : l'aperçu rétrécit alors sans jamais déborder de sa colonne.
  const parLaLargeur = m.largeurMax / RATIO_ECRAN;
  const hauteur = Math.max(HAUTEUR_MIN, Math.min(dispo, parLaLargeur));
  return { hauteur, largeur: hauteur * RATIO_ECRAN };
}
