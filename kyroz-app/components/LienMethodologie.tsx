import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Presse } from './Presse';
import { useTheme, Type, Spacing, OPACITE_PRESSION, CIBLE_TACTILE_MIN } from '../constants/theme';
import { LIBELLE_SOURCES } from '../lib/methodologie';

// ── « D'où viennent ces chiffres ? » — le lien vers les sources ──────────────
//
// 🔴 POURQUOI CE COMPOSANT EXISTE : rejet Apple du 2026-09-10, guideline 1.4.1.
// *« The citations to the sources should be easy for the user to find. »*
// L'écran Méthodologie & sources existait depuis le 2026-08-11, complet et exact —
// mais il vivait à TROIS niveaux de profondeur, sous « Aide et retours » :
// Profil → roue dentée → Aide et retours → Méthodologie & sources.
//
// ⚠️ **Ranger les sources sous « Aide » était une erreur de CLASSEMENT, pas de
// profondeur.** « Aide » est l'endroit où l'on va quand quelque chose ne marche pas ;
// personne n'y cherche la bibliographie d'un calcul. Le lien vit donc désormais LÀ OÙ
// LA RECOMMANDATION EST SERVIE — sous le plan du jour, et sous l'avertissement médical
// de l'inscription. C'est la même règle que l'avertissement médical lui-même
// (`constants/legal.ts::AVERTISSEMENT_MEDICAL`) : **sur le parcours, pas dans une page
// annexe** — et elle avait déjà été payée une fois, en 2026-08-12.
//
// ⚠️ La ligne des réglages RESTE : elle sert celui qui cherche, quand les deux
// nouvelles servent celui qui ne cherchait pas. Deux publics, pas un doublon.
//
// ℹ️ Un composant plutôt que trois copies de la même phrase : le libellé est une
// AFFIRMATION vers un écran précis, et trois copies sont trois occasions de diverger
// (CLAUDE.md §10). Garde-fou : `lib/__tests__/citationsSources.test.ts`.

export function LienMethodologie() {
  const t = useTheme();
  const router = useRouter();
  const s = React.useMemo(() => makeStyles(t.textTertiary), [t.textTertiary]);
  return (
    <Presse
      onPress={() => router.push('/methodologie')}
      activeOpacity={OPACITE_PRESSION}
      accessibilityRole="link"
      style={s.zone}
    >
      <Text style={s.libelle}>{LIBELLE_SOURCES}</Text>
    </Presse>
  );
}

function makeStyles(couleur: string) {
  return StyleSheet.create({
    // ⚠️ La zone tactile fait ses 44 pt par `minHeight`, pas par du `padding` gonflé :
    // le padding règle l'air autour du texte, la hauteur minimale garantit la cible
    // (CLAUDE.md §8, et `espacementDA.test.ts` le compte).
    zone: { minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', paddingVertical: Spacing.xs },
    // Souligné et non coloré, comme les liens de sources de l'écran Méthodologie :
    // la DA de Kyroz n'a pas de couleur de lien, l'accent est une couleur de FOND.
    libelle: {
      ...Type.micro,
      color: couleur,
      lineHeight: 16,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
  });
}
