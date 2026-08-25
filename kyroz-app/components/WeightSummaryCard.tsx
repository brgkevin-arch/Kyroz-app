import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Presse } from './Presse';
import { Ionicons } from '@expo/vector-icons';
import {
  ThemePalette, Radius, Spacing, Type, cardShadow, Trait, Icone,
  CIBLE_TACTILE_MIN, OPACITE_PRESSION,
} from '../constants/theme';
import { CONTENT_MAX_WIDTH } from '../constants/layout';
import { WeightChart } from './WeightChart';
import { GoalTarget } from '../lib/types';
import { WeightEntry } from '../lib/weight';

interface Props {
  t: ThemePalette;
  /** Poids du PROFIL — ce que le moteur utilise réellement pour calculer le plan. */
  profileWeightKg: number;
  entries: WeightEntry[];
  /** Écart avec la pesée précédente (kg, signé) ou null s'il n'y en a qu'une. */
  delta: number | null;
  /** Une pesée est attendue aujourd'hui (cadence choisie par l'utilisateur). */
  due?: boolean;
  goalTarget?: GoalTarget;
  onPress: () => void;
  // 🔴 `tourId` retiré le 2026-08-25 : la bulle du Profil se pose au CENTRE, sans
  // anneau (décision fondateur). Une prop de ciblage que plus aucune étape ne vise
  // se relit comme une bulle perdue — cf. `lib/tours.ts`.
}

// ── Carte « Suivi du poids » ────────────────────────────────────────────────
//
// Le suivi du poids était une simple ligne de menu (« Suivi du poids · 82 kg »),
// posée sous une grosse carte de série qui occupait le haut de l'écran. C'est
// l'inverse de leur importance réelle : le poids ALIMENTE le moteur (il recalcule
// TDEE, macros et plan à chaque pesée), la série ne fait que raconter l'assiduité.
// Les deux ont donc échangé leur place le 2026-08-02.
//
// 🔴 ET LA CARTE A ÉTÉ REFONDUE LE 2026-08-14 (décision fondateur : « redesign le
// suivi du poids et donne-lui plus d'importance »). Ce qu'elle avait de faible :
//  · le poids et le geste se disputaient la même ligne, et le geste — une pastille
//    grise « Ajouter » — se lisait comme une étiquette, pas comme un bouton. C'est
//    pourtant l'action la plus structurante de l'écran ;
//  · **la courbe avait une largeur ÉCRITE EN DUR (260 pt)**, donc un blanc à droite
//    sur tout iPhone récent et une courbe minuscule sur iPad. Elle se mesure ;
//  · l'écart (« +0,3 kg depuis la précédente ») se noyait à côté du chiffre.
// La série, elle, est partie dans l'en-tête le même jour : c'est ce qui rend la
// place à cette carte plutôt que de la lui prendre.
//
// ⚠️ TON — règle produit CLAUDE.md §10 : le suivi doit RASSURER, jamais mettre la
// pression. Concrètement ici : l'écart est affiché en couleur NEUTRE (jamais rouge
// pour une hausse — un poids qui monte n'est pas une faute), aucune flèche
// dramatique, et l'absence de pesée n'est pas un reproche mais une invitation.
// ⚠️ « Me peser » quand une pesée est attendue : c'est une INVITATION datée, pas un
// rappel à l'ordre. Aucun badge rouge, aucun compteur de retard.

/** Marges à retirer pour que la courbe occupe la carte : écran + carte. */
const MARGES_COURBE = Spacing.xl * 2 + Spacing.xl * 2;

export function WeightSummaryCard({
  t, profileWeightKg, entries, delta, due, goalTarget, onPress,
}: Props) {
  const s = makeStyles(t);
  const { width: winW } = useWindowDimensions();
  // ⚠️ MESURÉE, jamais écrite en dur (et `useWindowDimensions`, pas
  // `Dimensions.get` : sur iPad la fenêtre change de taille sans relancer l'app —
  // c'est le piège de CLAUDE.md §11, déjà payé sur la courbe de `WeightCheckin`).
  const largeurCourbe = Math.min(winW, CONTENT_MAX_WIDTH) - MARGES_COURBE;

  // On affiche le poids du PROFIL : c'est celui qui sert le plan. Il peut différer
  // d'une pesée rétroactive (backfill d'une date passée), et montrer autre chose que
  // ce que le moteur utilise serait un chiffre faux au sens de « pas de mensonge ».
  const poids = profileWeightKg;

  return (
    <Presse activeOpacity={OPACITE_PRESSION} onPress={onPress} style={[s.card, cardShadow(t)]}>
      <Text style={s.label}>SUIVI DU POIDS</Text>

      {/* Le chiffre seul sur sa ligne : c'est le sujet de la carte. L'écart passe
          DESSOUS plutôt qu'à côté — accolé, il se lisait comme une unité de plus. */}
      <View style={s.valueRow}>
        <Text style={s.value}>{poids}</Text>
        <Text style={s.unit}>kg</Text>
      </View>
      {delta != null && (
        <Text style={s.delta}>
          {delta > 0 ? '+' : ''}{delta} kg depuis la pesée précédente
        </Text>
      )}

      {entries.length >= 2 ? (
        <WeightChart t={t} entries={entries} width={largeurCourbe} height={112} goalTarget={goalTarget} />
      ) : (
        <Text style={s.empty}>
          {entries.length === 1
            ? 'Encore une pesée et ta courbe apparaît ici.'
            : 'Note ta première pesée : Kyroz recale calories, macros et plan à chaque fois.'}
        </Text>
      )}

      {/* 🔴 UN VRAI BOUTON, PLEINE LARGEUR. C'était une pastille grise posée à
          droite du chiffre : à 24 pt de haut et sans contraste, elle se lisait
          comme une étiquette. Le geste le plus structurant de l'écran mérite d'être
          reconnaissable comme un geste — et il porte l'accent, donc il suit la
          couleur choisie dans les réglages. */}
      <View style={s.cta}>
        <Ionicons name="add" size={Icone.petite} color={t.onAccent} />
        <Text style={s.ctaTxt}>{due ? 'Me peser' : 'Ajouter une pesée'}</Text>
      </View>
    </Presse>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.xl,
      gap: Spacing.md, borderWidth: Trait.fin, borderColor: t.line,
    },
    label: { color: t.textTertiary, ...Type.overline },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
    value: { color: t.text, ...Type.hero },
    unit: { ...Type.h3, color: t.textSecondary },
    // Neutre À DESSEIN : une hausse n'est pas une faute (cf. l'en-tête du fichier).
    delta: { ...Type.bodySmall, color: t.textTertiary, marginTop: -Spacing.sm },
    empty: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    cta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.accent,
    },
    ctaTxt: { ...Type.bodySmallStrong, color: t.onAccent },
  });
}
