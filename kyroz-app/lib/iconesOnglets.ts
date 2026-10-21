// ── Les tracés des cinq icônes d'onglets — une seule source, deux rendus ─────
//
// Reprises TRAIT POUR TRAIT de la maquette (viewBox 27, trait 1,7, bouts arrondis).
// Pourquoi dessinées plutôt que prises dans une librairie : voir `components/TabIcons.tsx`.
//
// 🔴 POURQUOI CE FICHIER EXISTE (2026-10-19, barre d'onglets native). Sur iPhone, la
// barre est désormais celle d'iOS (`UITabBar`, Liquid Glass) : elle ne sait pas
// afficher un composant React, seulement une IMAGE. Les icônes y arrivent donc en PNG,
// générés par `scripts/gen-icones-onglets.ts` à partir de CES tracés — pendant que le
// web et Android les dessinent toujours en SVG (`TabIcons.tsx`), à partir des MÊMES.
// Deux copies d'un même dessin divergeraient à la première retouche : l'une à l'écran
// d'un iPhone, l'autre sur le web, et personne ne compare les deux.
// ➡️ `iconesOnglets.test.ts` recalcule l'empreinte de ces tracés et la compare à celle
// que le script a écrite à côté des PNG : retoucher un tracé sans régénérer les images
// fait échouer la suite.
//
// Ce fichier n'importe RIEN — condition pour que le script (Node) et vitest le lisent.

export type Forme =
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { type: 'path'; d: string; arrondi?: boolean }
  | { type: 'circle'; cx: number; cy: number; r: number };

/** Le côté du carré de dessin, en unités de tracé. */
export const VIEWBOX = 27;

/**
 * L'épaisseur du trait. ⚠️ L'état actif n'échange PAS l'icône contre une version
 * pleine, il épaissit le trait : la maquette ne distingue l'onglet actif que par la
 * couleur, et garder la même forme évite qu'un onglet paraisse changer de nature.
 */
export const TRAIT = { repos: 1.7, actif: 2.2 } as const;

/**
 * Taille d'affichage, en points. 26 dans la barre dessinée (web, Android) ; la barre
 * d'iOS reçoit des images de cette même taille, à 2× et 3×.
 */
export const TAILLE_ICONE = 26;

export const TRACES = {
  /** Plan — un calendrier (cadre + bandeau d'en-tête). */
  plan: [
    { type: 'rect', x: 3.6, y: 5.2, width: 19.8, height: 18, rx: 4.6 },
    { type: 'path', d: 'M3.6 10.6h19.8' },
  ],
  /** Courses — un sac à anse. Pas un caddie : la liste s'emporte, elle ne se pousse pas. */
  courses: [
    { type: 'rect', x: 5, y: 8.6, width: 17, height: 14.6, rx: 4 },
    { type: 'path', d: 'M10.2 9.2V7.4a3.3 3.3 0 0 1 6.6 0v1.8', arrondi: true },
  ],
  /** Réserve — deux compartiments (le frais, le sec) et une poignée. */
  reserve: [
    { type: 'rect', x: 6, y: 4, width: 15, height: 19, rx: 4 },
    { type: 'path', d: 'M6 11.4h15M9.6 14.6v3', arrondi: true },
  ],
  /** Recettes — un bol. Pas une fourchette et un couteau : on cuisine, on ne dîne pas dehors. */
  recettes: [
    { type: 'path', d: 'M4.4 12.4h18.2a9.1 9.1 0 0 1-18.2 0Z' },
    { type: 'path', d: 'M8 8.4h11', arrondi: true },
  ],
  /**
   * Poids — un cadran de pesée (2026-10-21 : l'onglet Poids remplace l'onglet Profil).
   * Le même tracé que `PeseeIcon` (components/Icons.tsx), qui annonce déjà la pesée sur
   * le Plan : une seule image pour un seul geste.
   */
  poids: [
    { type: 'path', d: 'M7 21A9.4 9.4 0 1 1 20 21', arrondi: true },
    { type: 'path', d: 'M13.5 14.2 18.3 9.4', arrondi: true },
  ],
} as const satisfies Record<string, readonly Forme[]>;

export type NomIcone = keyof typeof TRACES;

/** Le SVG complet d'une icône — ce que le script rastérise. */
export function svgIcone(nom: NomIcone, trait: number, couleur = '#000', taille = TAILLE_ICONE): string {
  const attrs = `stroke="${couleur}" stroke-width="${trait}" fill="none"`;
  const formes = (TRACES[nom] as readonly Forme[]).map((f) => {
    if (f.type === 'rect') return `<rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" rx="${f.rx}" ${attrs}/>`;
    if (f.type === 'circle') return `<circle cx="${f.cx}" cy="${f.cy}" r="${f.r}" ${attrs}/>`;
    return `<path d="${f.d}" ${attrs}${f.arrondi ? ' stroke-linecap="round"' : ''}/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" fill="none">${formes.join('')}</svg>`;
}

/**
 * L'empreinte de tout ce qui détermine les PNG : tracés, traits, taille. Un hachage
 * maison (FNV-1a 32 bits) plutôt que `crypto` : ce fichier n'importe rien.
 */
export function empreinteIcones(): string {
  const source = JSON.stringify({ TRACES, TRAIT, TAILLE_ICONE, VIEWBOX });
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
