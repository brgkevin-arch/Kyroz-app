// ── Le MOUVEMENT a enfin un rôle, un token et un test ────────────────────────
//
// Cinquième axe de la DA à recevoir sa passe, après la forme (`rayonsDA`), le
// texte (`typoDA`), le blanc (`espacementDA`) et les finitions (`finitionsDA`).
// Il avait dérivé pour exactement la même raison que les quatre autres avant la
// leur : rien ne l'obligeait. Mesuré le 2026-08-10 sur `app/` + `components/` —
// **7 fichiers animent**, 16 `Animated.timing` dont **12 sans aucune courbe
// déclarée**, 7 durées écrites à la main (200 · 220 · 240 · 260 · 300 · 500 ·
// 550) et **zéro** entrée « durée » ou « courbe » dans `theme.ts`.
//
// ⚠️ CE FICHIER N'IMPORTE RIEN, ET C'EST LA CONDITION DE SON EXISTENCE.
// `constants/theme.ts` tire react-native, donc il n'est pas importable sous
// vitest — les tokens qui y vivent ne peuvent être vérifiés qu'en le lisant
// COMME DU TEXTE (cf. `accentColor.test.ts`, `designSystem.test.ts`, et les deux
// pannes muettes que cette extraction a connues). Le mouvement, lui, ne se
// résume pas à des constantes : il porte des DÉCISIONS — où atterrit un geste,
// quelle résistance à un bord, quelle vitesse passer au ressort. Une décision se
// teste en l'appelant, pas en la relisant. D'où un module PUR, exactement comme
// `lib/collapsingTitle.ts` pour le repli du titre et `lib/tours.ts` pour la
// visite guidée : la décision est une fonction, l'écran ne fait que la rendre.
//
// 🔴 ET C'EST AUSSI LA SEULE FAÇON DE VÉRIFIER QUOI QUE CE SOIT ICI. Le panneau
// navigateur ne fait PAS tourner `requestAnimationFrame` (0 frame en 7,2 s,
// mesuré) : une animation y démarre, rend une frame, puis se fige à une valeur
// intermédiaire parfaitement plausible. Et un GESTE ne se vérifie pas en web du
// tout (CLAUDE.md §5). Ce qui est testable ici l'est parce que c'est pur ; le
// reste se juge au simulateur, jamais dans un navigateur.

// ── Le modèle d'Apple : deux paramètres, pas trois ───────────────────────────
//
// Apple a délibérément remplacé le triplet physique (masse / raideur /
// amortissement) par deux réglages qu'un designer peut tenir en tête :
//
//   • amortissement (`damping`, ζ) — le DÉPASSEMENT. 1 = pas de rebond, l'objet
//     se pose ; sous 1 il dépasse et revient. Plus bas = plus rebondissant.
//   • réponse (`response`, T) — en SECONDES, le temps qu'il met à rejoindre sa
//     cible. Plus bas = plus vif. ⚠️ Ce n'est PAS une durée : un ressort n'en a
//     pas, son temps de repos ÉMERGE des deux paramètres et de la vitesse
//     d'entrée. C'est toute la différence avec le `duration` qu'on remplace.
export interface Ressort {
  /** ζ — 1 = aucun dépassement, < 1 = rebondit. */
  amortissement: number;
  /** T — secondes pour rejoindre la cible. */
  reponse: number;
}

/**
 * Les trois ressorts de l'app. Ce sont les valeurs qu'Apple publie pour ces
 * gestes-là, pas des réglages à l'œil.
 *
 * ⚠️ LE REBOND SE MÉRITE. Il n'est légitime que si le geste PORTAIT un élan —
 * une feuille qu'on jette, un doigt qui part. Sur une surface qui apparaît sans
 * qu'on l'ait poussée, un dépassement se lit comme un défaut. D'où `pose` en
 * amortissement 1 : c'est le défaut, et il couvre la majorité des cas.
 */
export const RESSORT = {
  /** Déplacement, repositionnement, retour à sa place. Aucun dépassement. */
  pose: { amortissement: 1, reponse: 0.4 } as Ressort,
  /** Feuille et tiroir — le geste a un élan, il a droit à son rebond. */
  feuille: { amortissement: 0.8, reponse: 0.3 } as Ressort,
  /** L'appui d'un doigt : très court, et il ne dépasse pas en s'enfonçant. */
  appui: { amortissement: 1, reponse: 0.16 } as Ressort,
  /** Le relâchement, lui, rend un peu d'élan — le doigt qui part est un geste. */
  relache: { amortissement: 0.72, reponse: 0.32 } as Ressort,
} as const;

/**
 * Les seules durées de l'app, pour ce qui n'est PAS pilotable au doigt (un
 * fondu, une opacité). Sept valeurs écrites à la main les précédaient, à un ou
 * deux crans d'écart les unes des autres — donc aucun niveau de lecture, juste
 * du flou. Même raisonnement que la grille d'espacement : les valeurs hors
 * grille ont été ABSORBÉES vers le cran le plus proche, pas adoptées.
 *
 * ⚠️ Une durée ne convient QUE si personne ne peut attraper l'objet pendant
 * qu'elle tourne. Dès qu'un doigt peut s'en saisir, c'est un ressort — sinon
 * l'animation ignore le geste jusqu'à son terme, puis saute.
 */
export const DUREE = {
  /** Retour d'appui, bascule d'un titre compact. */
  instant: 160,
  /** Fondu d'un fond, apparition d'une surcouche. */
  court: 200,
  /** Sortie d'une modale, transition de contenu. */
  moyen: 260,
} as const;

/** L'échelle d'un élément pressé. 0,97 : perceptible, jamais spectaculaire. */
export const ECHELLE_APPUI = 0.97;

// ── Conversion vers `Animated.spring` de React Native ────────────────────────
//
// RN accepte le triplet physique, pas le modèle d'Apple. La conversion est
// exacte, avec une masse unitaire :
//     ω0 = 2π / T          (pulsation propre)
//     raideur k = ω0²      (à masse 1)
//     amortissement c = 2ζω0
//
// ⚠️ Ne PAS passer par `bounciness` / `speed` : ces deux-là sont un habillage
// hérité, sans correspondance directe avec ζ et T, et c'est ce qui a produit les
// cinq `bounciness: 2` du code d'avant — recopiés d'un endroit à l'autre sans
// que personne ne puisse dire ce qu'ils valaient en dépassement réel.
export function ressortRN(r: Ressort): {
  mass: number; stiffness: number; damping: number;
} {
  const w0 = (2 * Math.PI) / r.reponse;
  return {
    mass: 1,
    stiffness: Math.round(w0 * w0 * 100) / 100,
    damping: Math.round(2 * r.amortissement * w0 * 100) / 100,
  };
}

/**
 * 🔴 PIÈGE D'UNITÉS, ET C'EST UN FACTEUR 1000.
 *
 * `vx` / `vy` de `PanResponder` sont en **pixels par MILLISECONDE**
 * (`PanResponder.js`), alors qu'un ressort intègre en **secondes**
 * (`SpringAnimation.js`). Passer `g.vy` directement à `velocity` donne une
 * vitesse mille fois trop faible — donc un ressort qui a l'air de n'avoir hérité
 * de rien, et un correctif qu'on croit inopérant.
 *
 * ℹ️ Le piège DISPARAÎT avec `react-native-gesture-handler`, dont `velocityY`
 * est déjà en px/s. Il ne mord donc que sur les chemins qui gardent
 * `PanResponder` — c'est-à-dire tous les nôtres aujourd'hui.
 */
export function vitesseDepuisPan(vParMs: number): number {
  return vParMs * 1000;
}

/**
 * Où le geste ATTERRIRAIT s'il décélérait tout seul — la fonction exacte du code
 * d'exemple d'Apple, et non la formule scolaire `v²/(2a)`.
 *
 * C'est ce qui fait qu'un jeté se comporte comme un lancer : on ne choisit pas
 * la cible la plus proche du point de RELÂCHEMENT, mais la plus proche du point
 * PROJETÉ. Sans ça, une feuille effleurée et une feuille balancée finissent au
 * même endroit — ce qui était exactement le défaut mesuré.
 *
 * @param vitesse    px/seconde au relâchement
 * @param deceleration 0,998 = inertie de défilement normale ; 0,99 = plus sec
 */
export function projection(vitesse: number, deceleration = 0.998): number {
  return (vitesse / 1000) * deceleration / (1 - deceleration);
}

/**
 * Résistance progressive au-delà d'un bord. Un arrêt net se lit comme un écran
 * FIGÉ — l'utilisateur ne sait pas s'il a atteint une limite ou si l'app a
 * planté. Une résistance qui augmente dit « il n'y a rien de plus par là », et
 * le dit sans un mot.
 *
 * @param depassement de combien on a dépassé le bord (toujours positif)
 * @param dimension   la taille de l'objet — la résistance s'échelonne dessus
 */
export function caoutchouc(depassement: number, dimension: number, c = 0.55): number {
  if (depassement <= 0) return 0;
  return (depassement * dimension * c) / (dimension + c * depassement);
}

/**
 * Fermer, ou revenir en place ? La décision d'une feuille qu'on relâche.
 *
 * 🔴 ELLE SE PREND SUR LA PROJECTION, PAS SUR LA POSITION. Le code d'avant
 * testait `dy > 90 || vy > 0.4` : deux seuils indépendants, dont l'un lisait la
 * vitesse UNIQUEMENT pour trancher — après quoi elle était jetée et la sortie
 * durait 240 ms fixes. Un geste vif et un geste mou produisaient le même
 * mouvement. Ici la vitesse entre dans le CALCUL du point d'arrivée, puis elle
 * est passée au ressort : il n'y a plus de couture entre le doigt et la suite.
 *
 * @param position position courante (0 = en place, `hauteur` = fermée)
 * @param vitesse  px/seconde au relâchement (positif = vers le bas)
 * @param hauteur  hauteur de la feuille
 */
export function decisionFeuille(
  position: number,
  vitesse: number,
  hauteur: number,
): 'fermer' | 'revenir' {
  const projetee = position + projection(vitesse);
  return projetee > hauteur / 2 ? 'fermer' : 'revenir';
}

// ── « Réduire les animations » ───────────────────────────────────────────────
//
// Réglage d'accessibilité iOS et Android, qu'Apple TESTE en revue. L'app
// l'ignorait entièrement : `AccessibilityInfo` n'apparaissait dans aucun
// fichier. Le pire cas était la fête d'anniversaire — 2 200 ms, douze éléments
// décalés — servie telle quelle à quelqu'un que le mouvement rend malade.
//
// ⚠️ RÉDUIRE N'EST PAS SUPPRIMER. Retirer tout retour laisserait l'utilisateur
// sans le moindre signe que son geste a été pris en compte, ce qui est un
// second défaut, pas un correctif. La règle est : on garde ce qui INFORME
// (opacité, couleur, apparition), on retire ce qui DÉPLACE (glissement,
// rebond, parallaxe). D'où deux fonctions et non un booléen jeté dans le code.

/** La durée à servir : les fondus restent, raccourcis ; rien n'est supprimé. */
export function dureeReduite(duree: number, reduire: boolean): number {
  return reduire ? Math.min(duree, DUREE.instant) : duree;
}

/**
 * Le ressort à servir. En mouvement réduit on retire le DÉPASSEMENT (ζ = 1) et
 * on raccourcit — l'objet rejoint sa place sans osciller.
 * ⚠️ On ne rend pas `reponse: 0` : un saut instantané est un clignotement, et
 * c'est précisément ce que le réglage cherche à éviter.
 */
export function ressortReduit(r: Ressort, reduire: boolean): Ressort {
  if (!reduire) return r;
  return { amortissement: 1, reponse: Math.min(r.reponse, 0.2) };
}
