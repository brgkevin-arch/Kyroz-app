// ── Repli du grand titre : la DÉCISION, sans React ni react-native ──────────
//
// Le composant vit dans `components/CollapsingTitle.tsx`. Ce qui est ici, c'est
// uniquement l'arithmétique du seuil — et elle est séparée pour une raison
// précise : le MOUVEMENT est invérifiable dans le panneau navigateur, où
// `requestAnimationFrame` ne tourne pas (0 frame en 7,2 s, mesuré le 2026-08-04,
// cf. docs/comparer-maquette.md). Une animation y démarre, rend une frame, puis
// se fige à une valeur intermédiaire parfaitement plausible. On ne peut donc pas
// conclure « le repli marche » depuis une capture — mais on peut tester la
// décision, à condition qu'elle ne dépende d'aucun module natif.

/** Hauteur de la barre compacte, en points. */
export const COMPACT_BAR_H = 52;

/** Repli prudent tant que l'en-tête n'a pas été mesuré. */
export const SEUIL_PAR_DEFAUT = 140;

/**
 * À quel défilement le titre compact doit-il prendre le relais ?
 *
 * `y` et `hauteur` sont ceux de la vue d'en-tête dans le contenu défilant. Le
 * gros titre a disparu quand le bas de l'en-tête est passé sous la barre — d'où
 * la soustraction de sa hauteur.
 *
 * `haut` est la hauteur de la barre d'état (Dynamic Island comprise) sous laquelle
 * le contenu défile désormais (2026-10-19) : la barre compacte commence SOUS elle,
 * donc son bas est à `haut + COMPACT_BAR_H`. 🔴 Paramètre OBLIGATOIRE, et c'est
 * voulu : facultatif, l'écran qui l'oublierait ferait apparaître son titre compact
 * `haut` points trop tard — 62 sur un iPhone 17 —, le grand titre déjà sous l'îlot.
 *
 * ⚠️ Le plancher à 24 n'est pas décoratif : sur un écran dont l'en-tête est plus
 * COURT que la barre (52), le calcul donnerait un seuil négatif, donc un titre
 * compact affiché en permanence — posé PAR-DESSUS le grand titre. C'est le cas
 * de l'écran Frigo quand le stock est vide et que l'en-tête se réduit à une ligne.
 */
export function seuilRepli(y: number, hauteur: number, haut: number): number {
  return Math.max(24, y + hauteur - haut - COMPACT_BAR_H);
}

/**
 * Le haut du contenu défilant, décalé de la barre d'état : la zone défilante
 * remonte JUSQU'EN HAUT de l'écran (sous l'heure et l'îlot), donc son contenu
 * doit redescendre d'autant — au repos, rien ne bouge d'un point ; en défilant, le
 * contenu passe sous l'îlot au lieu de s'y couper net.
 *
 * Lit le rembourrage du haut tel que React Native le résout : `paddingTop` l'emporte
 * sur `paddingVertical`, qui l'emporte sur `padding`.
 */
export function paddingHautDecale(
  plat: { paddingTop?: unknown; paddingVertical?: unknown; padding?: unknown },
  haut: number,
): number {
  const base = [plat.paddingTop, plat.paddingVertical, plat.padding].find((v) => typeof v === 'number');
  return ((base as number | undefined) ?? 0) + haut;
}

/**
 * Le fondu de haut d'écran — l'« effet de bord de défilement » d'iOS 26, en
 * dégradé : ce qui passe sous l'heure et l'îlot s'y FOND au lieu de s'y couper.
 * Chaque arrêt : position (0 → 1 de la hauteur du fondu) et opacité du fond.
 *
 * ⚠️ Deux fondus, deux rôles. Celui de la BARRE D'ÉTAT est toujours là (invisible
 * au repos : rien ne passe dessous) et garde l'heure lisible sans cacher le
 * contenu ; celui du TITRE COMPACT, plus couvrant, n'apparaît qu'avec le titre,
 * qu'il doit rendre lisible par-dessus des cartes claires.
 */
export const FONDU_BARRE_ETAT = [
  { a: 0, opacite: 0.45 },
  { a: 0.6, opacite: 0.22 },
  { a: 1, opacite: 0 },
] as const;

export const FONDU_TITRE = [
  { a: 0, opacite: 0.5 },
  { a: 0.42, opacite: 0.5 },
  { a: 0.52, opacite: 0.68 },
  { a: 0.8, opacite: 0.58 },
  { a: 1, opacite: 0 },
] as const;

// ℹ️ Réglé AU PIXEL le 2026-10-19 sur iPhone 17 (bande de l'heure 0–62 pt, bande du
// titre 62–114, soit a ≈ 0,46 → 0,85 sur 134 pt). Première passe à 1/0,92 : le contenu
// tombait à 14/255 — le haut redevenait une bande noire, l'inverse de la demande. Passe
// suivante : le contenu se devinait sous l'heure (≈ 25 %) et restait bas derrière le titre
// (≈ 10–20 %). 🔴 Le fondateur, sur captures : « trop sombre, réduis ». Allégé de moitié
// environ : sous l'heure ≈ 65–85 % du contenu, derrière le titre ≈ 40–50 %. Le titre
// reste dominant par sa graisse et son blanc pur ; un nom de carte peut le croiser.
// Puis « fondre à peine plus » : +0,1 environ sur chaque arrêt — entre les deux passes.

/** Ce que le fondu déborde sous la bande qu'il couvre, pour que la fin soit douce. */
export const DEBORD_FONDU = 20;

/**
 * Le fondu du titre compact AU NAVIGATEUR : la barre est pleine, seul son débord fond.
 *
 * 🔴 2026-10-23 (fondateur, tour de l'app : « corrige cela »). Sur iPhone, le contenu qui
 * passe sous le titre s'y devine à 40–50 % : c'est l'effet de bord de défilement d'iOS 26,
 * validé au simulateur (E80), et il ne bouge pas. Sur le site, il n'y a ni heure ni îlot
 * dessous (`haut` = 0) : le même dégradé se lisait comme deux textes l'un sur l'autre
 * (« J'ai cuisiné » sous « Plan »). Le navigateur reçoit donc une barre opaque, et le
 * fondu ne garde que ses 20 pt de débord, pour que la coupure reste douce.
 */
export const FONDU_TITRE_WEB = [
  { a: 0, opacite: 1 },
  { a: COMPACT_BAR_H / (COMPACT_BAR_H + DEBORD_FONDU), opacite: 1 },
  { a: 1, opacite: 0 },
] as const;
