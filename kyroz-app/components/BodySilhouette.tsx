import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Sex } from '../lib/types';

// ── Asset de corpulence (silhouette SVG paramétrique) ────────────────────────
// Silhouette de FACE, un seul tracé continu (Path fermé) anatomique et fluide.
// 6 niveaux de masse grasse (level 0 = sec/découpé … 5 = surpoids visible) :
// taille, ventre, hanches, cuisses et visage s'élargissent PROGRESSIVEMENT et
// PARAMÉTRIQUEMENT — tout est interpolé depuis `level`, jamais 6 dessins en dur.
// Sexe : male = épaules larges / hanches étroites ; female = épaules plus
// étroites / hanches larges + poitrine. Monochrome, rempli par `color`.

interface Props {
  level: number;   // 0 (sec) … 5 (surpoids)
  sex: Sex;
  color: string;
  size?: number;
}

// Interpolation linéaire.
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function BodySilhouette({ level, sex, color, size = 64 }: Props) {
  // t ∈ [0,1] : courbe de masse grasse. tt accentue le ventre (non-linéaire).
  const t = Math.min(Math.max(level, 0), 5) / 5;
  const tt = t * t;
  const female = sex === 'female';
  const cx = 50; // axe de symétrie

  // ── Dimensions paramétriques (demi-largeurs) ──────────────────────────────
  // Tête / visage : s'arrondit légèrement avec la masse grasse.
  const headR = lerp(7.5, 9.2, t);
  const neckHalf = lerp(2.8, 4.0, t);

  // Épaules : larges & stables chez l'homme ; plus étroites chez la femme.
  // Elles s'épaississent un peu avec le gras mais restent le repère « haut ».
  const shoulder = (female ? 15.5 : 20) + lerp(0, 2.2, t);

  // Taille / ventre : c'est ce qui grossit le plus. La femme part plus marquée
  // (taille creusée) mais le ventre comble vite ; tt = bombé non-linéaire.
  const waist = (female ? 11 : 12.5) + lerp(0, 13.5, t) + lerp(0, 6, tt);

  // Hanches : nettement plus larges chez la femme, s'élargissent avec le niveau.
  const hip = (female ? 18.5 : 14.5) + lerp(0, 7.5, t);

  // Cuisses : pied de la silhouette, s'épaississent avec le gras.
  const thigh = (female ? 10 : 9) + lerp(0, 4.5, t);
  const ankle = lerp(3.2, 4.6, t);

  // Poitrine (female uniquement) : galbe sous les épaules, discret et propre.
  const bust = female ? lerp(2.2, 4.2, t) : 0;

  // ── Repères verticaux (viewBox 0 0 100 150) ───────────────────────────────
  const yHeadTop = 6;
  const yHeadBot = yHeadTop + headR * 2;     // bas du menton
  const yNeck = yHeadBot + 2.5;
  const yShoulder = yNeck + 4;               // ligne d'épaules
  const yBust = yShoulder + 13;              // poitrine / haut du torse
  const yWaist = yShoulder + 28;             // taille la plus fine
  const yBelly = yWaist + 7;                 // point le plus bombé du ventre
  const yHip = yWaist + 16;                  // largeur de hanche max
  const yCrotch = yHip + 7;                  // entrejambe
  const yKnee = 122;
  const yAnkle = 146;
  const footGap = 1.6;                       // demi-écart entre les pieds

  // ── Construction du tracé continu (côté droit, puis miroir gauche) ────────
  // On part du haut de la tête, on descend le côté DROIT jusqu'au pied droit,
  // on traverse l'entrejambe vers le pied gauche, on remonte le côté GAUCHE,
  // on referme par la tête. Courbes de Bézier cubiques pour un galbe lisse.

  const d =
    // ── Tête (demi-cercle droit, du sommet au menton) ──
    `M ${cx} ${yHeadTop} ` +
    `C ${cx + headR * 0.9} ${yHeadTop} ${cx + headR} ${yHeadTop + headR * 0.7} ${cx + headR} ${yHeadTop + headR} ` +
    `C ${cx + headR} ${yHeadBot - headR * 0.4} ${cx + neckHalf + 2} ${yHeadBot} ${cx + neckHalf} ${yNeck} ` +
    // ── Cou → épaule droite (galbe du trapèze) ──
    `C ${cx + neckHalf} ${yNeck + 1.5} ${cx + shoulder * 0.7} ${yShoulder - 2} ${cx + shoulder} ${yShoulder} ` +
    // ── Épaule → poitrine → taille (côté droit) ──
    `C ${cx + shoulder + 0.5} ${yBust - 4} ${cx + waist + bust} ${yBust} ${cx + waist} ${yWaist} ` +
    // ── Taille → ventre bombé → hanche droite ──
    `C ${cx + waist} ${yBelly} ${cx + hip} ${yBelly + 1} ${cx + hip} ${yHip} ` +
    // ── Hanche → cuisse → entrejambe (côté droit) ──
    `C ${cx + hip} ${yCrotch - 3} ${cx + thigh + 5} ${yCrotch} ${cx + thigh + footGap} ${yCrotch + 1} ` +
    // ── Jambe droite extérieure : cuisse → genou → cheville ──
    `C ${cx + thigh + footGap} ${yKnee - 18} ${cx + ankle + footGap + 1.5} ${yKnee} ${cx + ankle + footGap} ${yAnkle} ` +
    `L ${cx + footGap} ${yAnkle} ` +
    // ── Intérieur jambe droite : cheville → genou → entrejambe ──
    `C ${cx + footGap} ${yKnee} ${cx + footGap} ${yCrotch + 6} ${cx + footGap} ${yCrotch + 2} ` +
    `L ${cx - footGap} ${yCrotch + 2} ` +
    // ── Intérieur jambe gauche : entrejambe → genou → cheville (miroir) ──
    `C ${cx - footGap} ${yCrotch + 6} ${cx - footGap} ${yKnee} ${cx - footGap} ${yAnkle} ` +
    `L ${cx - ankle - footGap} ${yAnkle} ` +
    // ── Jambe gauche extérieure : cheville → genou → cuisse (miroir) ──
    `C ${cx - ankle - footGap - 1.5} ${yKnee} ${cx - thigh - footGap} ${yKnee - 18} ${cx - thigh - footGap} ${yCrotch + 1} ` +
    // ── Entrejambe → hanche gauche (miroir) ──
    `C ${cx - thigh - 5} ${yCrotch} ${cx - hip} ${yCrotch - 3} ${cx - hip} ${yHip} ` +
    // ── Hanche → ventre → taille gauche (miroir) ──
    `C ${cx - hip} ${yBelly + 1} ${cx - waist} ${yBelly} ${cx - waist} ${yWaist} ` +
    // ── Taille → poitrine → épaule gauche (miroir) ──
    `C ${cx - waist - bust} ${yBust} ${cx - shoulder - 0.5} ${yBust - 4} ${cx - shoulder} ${yShoulder} ` +
    // ── Épaule → cou gauche (miroir) ──
    `C ${cx - shoulder * 0.7} ${yShoulder - 2} ${cx - neckHalf} ${yNeck + 1.5} ${cx - neckHalf} ${yNeck} ` +
    // ── Cou → menton → tête gauche → sommet (miroir, ferme le tracé) ──
    `C ${cx - neckHalf - 2} ${yHeadBot} ${cx - headR} ${yHeadBot - headR * 0.4} ${cx - headR} ${yHeadTop + headR} ` +
    `C ${cx - headR} ${yHeadTop + headR * 0.7} ${cx - headR * 0.9} ${yHeadTop} ${cx} ${yHeadTop} ` +
    `Z`;

  return (
    <Svg width={size} height={size * 1.5} viewBox="0 0 100 150">
      <Path d={d} fill={color} />
    </Svg>
  );
}
