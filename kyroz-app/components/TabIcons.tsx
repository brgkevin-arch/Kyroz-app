import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { TRACES, TRAIT, TAILLE_ICONE, VIEWBOX, type Forme, type NomIcone } from '../lib/iconesOnglets';

// ── Les cinq icônes de la barre d'onglets ────────────────────────────────────
// Reprises TRAIT POUR TRAIT de la maquette (viewBox 27, trait 1,7, bouts arrondis).
// Les tracés vivent dans `lib/iconesOnglets.ts` : la barre native d'iOS les reçoit en
// PNG générés à partir des mêmes, le web et Android les dessinent ici en SVG.
//
// Pourquoi dessinées plutôt que prises dans une librairie :
//  1. Ionicons n'a NI meuble de rangement NI bol — les deux objets que la maquette
//     dessine. Il aurait fallu approximer, et c'est exactement ce qui clochait
//     avant : une corbeille de courrier pour la réserve, une flamme pour « Profil ».
//  2. MaterialCommunityIcons les a tous les deux, mais embarque **1,2 Mo** de
//     police pour deux glyphes — le triple du poids d'icônes de toute l'app
//     (Ionicons : 381 Ko). Mesuré sur les .ttf livrés.
// `react-native-svg` est déjà une dépendance : ces cinq icônes ne coûtent rien.
//
// ⚠️ L'état actif n'échange PAS l'icône contre une version pleine, il épaissit le
// trait. La maquette ne distingue l'onglet actif que par la couleur ; garder la
// même forme évite qu'un onglet paraisse changer de nature quand on le touche.

type Props = { color: string; focused?: boolean; size?: number };

function Icone({ nom, color, focused, size = TAILLE_ICONE }: Props & { nom: NomIcone }) {
  const sw = focused ? TRAIT.actif : TRAIT.repos;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} fill="none">
      {(TRACES[nom] as readonly Forme[]).map((f, i) => {
        if (f.type === 'rect') {
          return <Rect key={i} x={f.x} y={f.y} width={f.width} height={f.height} rx={f.rx} stroke={color} strokeWidth={sw} />;
        }
        if (f.type === 'circle') {
          return <Circle key={i} cx={f.cx} cy={f.cy} r={f.r} stroke={color} strokeWidth={sw} />;
        }
        return <Path key={i} d={f.d} stroke={color} strokeWidth={sw} strokeLinecap={f.arrondi ? 'round' : undefined} />;
      })}
    </Svg>
  );
}

export const PlanIcon = (p: Props) => <Icone nom="plan" {...p} />;
export const CoursesIcon = (p: Props) => <Icone nom="courses" {...p} />;
export const ReserveIcon = (p: Props) => <Icone nom="reserve" {...p} />;
export const RecettesIcon = (p: Props) => <Icone nom="recettes" {...p} />;
export const PoidsIcon = (p: Props) => <Icone nom="poids" {...p} />;
