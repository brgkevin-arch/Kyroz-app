import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

// ── Les cinq icônes de la barre d'onglets ────────────────────────────────────
// Reprises TRAIT POUR TRAIT de la maquette (viewBox 27, trait 1,7, bouts arrondis).
//
// Pourquoi dessinées ici plutôt que prises dans une librairie :
//  1. Ionicons n'a NI frigo NI bol — les deux objets que la maquette dessine. Il
//     aurait fallu approximer, et c'est exactement ce qui clochait avant : une
//     corbeille de courrier pour « Frigo », une flamme pour « Profil ».
//  2. MaterialCommunityIcons les a tous les deux, mais embarque **1,2 Mo** de
//     police pour deux glyphes — le triple du poids d'icônes de toute l'app
//     (Ionicons : 381 Ko). Mesuré sur les .ttf livrés.
// `react-native-svg` est déjà une dépendance : ces cinq icônes ne coûtent rien.
//
// ⚠️ L'état actif n'échange PAS l'icône contre une version pleine, il épaissit le
// trait. La maquette ne distingue l'onglet actif que par la couleur ; garder la
// même forme évite qu'un onglet paraisse changer de nature quand on le touche.

type Props = { color: string; focused?: boolean; size?: number };

const stroke = (focused?: boolean) => (focused ? 2.2 : 1.7);

function Frame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 27 27" fill="none">
      {children}
    </Svg>
  );
}

/** Plan — un calendrier (cadre + bandeau d'en-tête). */
export function PlanIcon({ color, focused, size = 26 }: Props) {
  return (
    <Frame size={size}>
      <Rect x="3.6" y="5.2" width="19.8" height="18" rx="4.6" stroke={color} strokeWidth={stroke(focused)} />
      <Path d="M3.6 10.6h19.8" stroke={color} strokeWidth={stroke(focused)} />
    </Frame>
  );
}

/** Courses — un sac à anse. Pas un caddie : la liste s'emporte, elle ne se pousse pas. */
export function CoursesIcon({ color, focused, size = 26 }: Props) {
  return (
    <Frame size={size}>
      <Rect x="5" y="8.6" width="17" height="14.6" rx="4" stroke={color} strokeWidth={stroke(focused)} />
      <Path d="M10.2 9.2V7.4a3.3 3.3 0 0 1 6.6 0v1.8" stroke={color} strokeWidth={stroke(focused)} strokeLinecap="round" />
    </Frame>
  );
}

/** Frigo — deux compartiments et une poignée. */
export function FrigoIcon({ color, focused, size = 26 }: Props) {
  return (
    <Frame size={size}>
      <Rect x="6" y="4" width="15" height="19" rx="4" stroke={color} strokeWidth={stroke(focused)} />
      <Path d="M6 11.4h15M9.6 14.6v3" stroke={color} strokeWidth={stroke(focused)} strokeLinecap="round" />
    </Frame>
  );
}

/** Recettes — un bol. Pas une fourchette et un couteau : on cuisine, on ne dîne pas dehors. */
export function RecettesIcon({ color, focused, size = 26 }: Props) {
  return (
    <Frame size={size}>
      <Path d="M4.4 12.4h18.2a9.1 9.1 0 0 1-18.2 0Z" stroke={color} strokeWidth={stroke(focused)} />
      <Path d="M8 8.4h11" stroke={color} strokeWidth={stroke(focused)} strokeLinecap="round" />
    </Frame>
  );
}

/** Profil — une personne. La flamme appartient à la SÉRIE, pas à la personne. */
export function ProfilIcon({ color, focused, size = 26 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="10" r="4.1" stroke={color} strokeWidth={stroke(focused)} />
      <Path d="M5.8 22.4c1.5-3.9 4.3-5.9 7.7-5.9s6.2 2 7.7 5.9" stroke={color} strokeWidth={stroke(focused)} strokeLinecap="round" />
    </Frame>
  );
}
