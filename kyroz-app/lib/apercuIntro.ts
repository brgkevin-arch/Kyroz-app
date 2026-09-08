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
};

/**
 * ⚠️ **L'INVARIANT, et c'est lui que le test tient** : `hauteur + hauteurEntete +
 * ecart ≤ hauteurRail` dès que le rail est mesuré. Autrement dit l'aperçu cède
 * toujours devant le texte — jamais l'inverse. Le titre est ce qui dit à quoi on
 * regarde ; un aperçu qui le pousse dehors se prive de sa propre légende.
 */
export function tailleApercu(m: MesuresApercu): { largeur: number; hauteur: number; pret: boolean } {
  // 🔴 **IL N'Y A PLUS DE REPLI, ET C'EST LE CORRECTIF** (2026-09-08, second tour).
  // La version précédente retombait sur `hauteurFenetre × 0,62` tant que rien n'était
  // mesuré, en se disant « remplacé à la frame d'après ». Deux choses fausses là-dedans :
  //
  //  ① ce repli EST l'ancienne formule, celle qui coupait le titre. Un repli qui
  //     reproduit exactement le défaut qu'on répare n'est pas un repli, c'est le bug
  //     avec un délai ;
  //  ② les deux mesures n'arrivent PAS ensemble. Le rail et l'en-tête sont deux vues
  //     distinctes, donc deux `onLayout` : il existe un rendu où le rail vaut 613 et
  //     l'en-tête encore 0, ce qui donne 605 pt d'aperçu là où 528 tiennent. Ce
  //     rendu-là est PEINT, et c'est très exactement la capture du fondateur — un
  //     coup coupé, un coup non, selon l'ordre où les deux mesures atterrissent.
  //
  // ➡️ Tant que les DEUX ne sont pas là, on ne dessine pas l'aperçu. Une frame sans
  //    image vaut mieux qu'une frame avec un titre tranché : l'absence se rattrape à
  //    l'œil suivant, le titre coupé se photographie.
  // ⚠️ Aucune boucle possible : le rail est `flex: 1` et l'en-tête ne contient que du
  //    texte — ni l'un ni l'autre ne dépend de la taille de l'image. Les deux se
  //    mesurent donc parfaitement avec l'aperçu encore absent.
  const pret = m.hauteurRail > 0 && m.hauteurEntete > 0;
  const dispo = m.hauteurRail - m.hauteurEntete - m.ecart;

  // La largeur décide quand c'est ELLE qui manque (écran court et large, iPad en
  // paysage) : l'aperçu rétrécit alors sans jamais déborder de sa colonne.
  const parLaLargeur = m.largeurMax / RATIO_ECRAN;
  const hauteur = Math.max(HAUTEUR_MIN, Math.min(dispo, parLaLargeur));
  return { hauteur, largeur: hauteur * RATIO_ECRAN, pret };
}

/**
 * Reste-t-il quelque chose à faire défiler ? — utilisé par l'indice « ⌄ » de
 * l'inscription.
 *
 * 🔴 **POURQUOI C'EST DÉRIVÉ ET NON UN ÉTAT** (mesuré au simulateur, 2026-09-08).
 * Première version : un booléen `enBas` posé par `onScroll`. Il marchait — jusqu'à
 * ce qu'un choix AJOUTE du contenu sous le pli. Le rail n'ayant pas bougé, aucun
 * `onScroll` ne partait, `enBas` restait vrai, et la flèche restait éteinte devant
 * une carte visiblement coupée. Le code s'exécutait ; le résultat était mort.
 * ➡️ En repartant de la POSITION, la réponse se recalcule dès que la hauteur du
 * contenu change, sans qu'aucun événement n'ait à survenir.
 */
export function resteAScroller(
  { position, hauteurVue, hauteurContenu, marge }:
  { position: number; hauteurVue: number; hauteurContenu: number; marge: number },
): boolean {
  if (!hauteurVue || !hauteurContenu) return false;
  // ⚠️ Il n'y a PAS de second seuil « et si tout tient à l'écran ». Il y en avait un ;
  // une mutation l'a montré décoratif — il est impliqué par la ligne ci-dessous, la
  // position ne pouvant pas être négative. Un garde-fou qu'aucun test ne peut faire
  // rougir n'en est pas un : il donne l'impression d'une deuxième protection.
  return position + hauteurVue < hauteurContenu - marge;
}
