// ── Où la barre d'onglets pose ses onglets — pour la visite, qui ne peut pas la mesurer ──
//
// La visite guidée (`GuidedTour.tsx::CarteVisite`) pointe chaque onglet depuis une
// `Modal`, d'où rien ne se mesure — et la barre d'iOS n'est de toute façon pas une vue
// React Native. Elle applique donc la RÈGLE de la barre. Depuis que l'iPhone sert la
// barre d'Apple (2026-10-19), il y en a trois, et une seule était connue :
//
//   'pleine'   la barre dessinée (web, Android) et la barre classique d'iOS 18 : des
//              onglets à parts égales sur toute la largeur, entre les zones sûres ;
//   'capsule'  iOS 26 sur iPhone : la capsule de Liquid Glass, décollée des bords ;
//   'haut'     iPad (iPadOS 18+) : la barre monte EN HAUT de l'écran, en libellés
//              seuls et de largeurs inégales. La visite n'y pointe rien : l'onglet
//              ouvert s'y voit déjà en surbrillance, posé par le système.
//
// 🔴 LES MESURES DE LA CAPSULE VIENNENT D'UNE CAPTURE, pas d'une documentation — Apple
// n'en publie aucune. iPhone 17, iOS 26.5, 402 pt de large, captures ×3 analysées au
// pixel (2026-10-19) : capsule de x = 21 à x = 380,7 ; centres des icônes à 64,0 /
// 132,7 / 201,2 / 269,8 / 338,3 pt, soit un pas de 68,6. D'où une marge de 21 pt et un
// rembourrage intérieur de 8,7 pt. ⚠️ Une prochaine version d'iOS peut les déplacer :
// l'erreur ne coûterait que quelques points à la pointe de la carte, jamais un geste.
//
// Ce fichier n'importe rien : il se teste sous vitest (`barreOnglets.test.ts`).

export type FormeBarre = 'pleine' | 'capsule' | 'haut';

/** La capsule d'iOS 26 sur iPhone, mesurée (voir l'en-tête). */
export const CAPSULE = { marge: 21, rembourrage: 8.7 } as const;

/**
 * En deçà, un iPad (Split View étroit, Slide Over) repasse la barre en bas, comme un
 * iPhone. ⚠️ Approximation : Apple bascule sur la classe de taille « compacte », pas
 * sur une largeur ; on reprend le seuil tablette de l'app (`TABLET_MIN_WIDTH`, 700).
 */
const LARGEUR_BARRE_EN_HAUT = 700;

export function formeBarre(p: {
  os: string;
  isPad: boolean;
  /** Version majeure du système (`Platform.Version`), 0 hors iOS. */
  versionIos: number;
  /** L'app tourne-t-elle sous le design Liquid Glass ? (`isLiquidGlassAvailable`) */
  liquidGlass: boolean;
  largeur: number;
}): FormeBarre {
  if (p.os !== 'ios') return 'pleine';
  if (p.isPad && p.versionIos >= 18 && p.largeur >= LARGEUR_BARRE_EN_HAUT) return 'haut';
  return p.liquidGlass ? 'capsule' : 'pleine';
}

/**
 * Le retrait, à gauche comme à droite, de la RANGÉE d'onglets : les onglets se
 * partagent à parts égales ce qui reste entre les deux. `null` quand la barre n'est
 * pas en bas — il n'y a rien à pointer.
 */
export function retraitOnglets(forme: FormeBarre, margeSure: number): number | null {
  if (forme === 'haut') return null;
  if (forme === 'capsule') return CAPSULE.marge + CAPSULE.rembourrage;
  return margeSure;
}

/** Le centre horizontal de l'onglet de rang `rang` sur `n`. */
export function centreOnglet(largeur: number, retrait: number, rang: number, n: number): number {
  return retrait + ((largeur - 2 * retrait) * (rang + 0.5)) / n;
}
