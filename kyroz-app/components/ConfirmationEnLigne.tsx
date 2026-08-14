import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Presse } from './Presse';
import { ThemePalette, Radius, Type, Spacing, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';

// ── Demander confirmation SANS ouvrir de modale ──────────────────────────────
//
// 🔴 POURQUOI CE COMPOSANT EXISTE (2026-08-14). `useDialog().confirm` monte sa
// propre `Modal`. Appelé depuis un écran qui vit DÉJÀ dans une feuille — donc
// dans une modale — il ne donne RIEN sur iOS : le bouton s'exécute, la promesse
// attend une réponse que personne ne peut donner, et l'écran ne bouge pas.
// Signalé par le fondateur sur « Retirer de l'historique », puis mesuré au
// simulateur sur « Supprimer mon compte » (deux captures à six secondes d'écart,
// identiques à l'horloge près).
//
// ⚠️ CE DÉFAUT EST INVISIBLE SUR LE WEB : `react-native-web` rend une `Modal` en
// `<div>` et empile sans se plaindre. Toute vérification de ces boutons faite au
// navigateur est donc muette — c'est le simulateur ou rien.
//
// ⚠️ Ce n'est PAS un remplaçant universel de `useDialog`. Les écrans qui ne
// vivent pas dans une feuille gardent la boîte de dialogue : elle se pose
// au-dessus de tout, elle est plus difficile à rater, et c'est ce qu'on veut
// pour un geste irréversible déclenché depuis une page pleine.
// ➡️ La règle est écrite et comptée : `lib/__tests__/feuillesEmpilees.test.ts`.
//
// ⚠️ Un composant plutôt que trois copies : la même question posée à trois
// endroits avec trois mises en forme, c'est « un style recopié partout est un
// rôle qui n'a pas de nom » (CLAUDE.md §8), sur un geste destructeur.

export function ConfirmationEnLigne({
  t, question, confirmLabel, onConfirm, onCancel,
}: {
  t: ThemePalette;
  /** La question ET sa conséquence — c'est le seul texte que la personne lira. */
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.wrap}>
      <Text style={s.question}>{question}</Text>
      <View style={s.boutons}>
        {/* « Annuler » à GAUCHE et neutre, l'action destructrice à droite : même
            disposition que les boîtes de dialogue de l'app, pour qu'un geste ne
            change pas de place selon l'écran. */}
        <Presse
          style={[s.bouton, { backgroundColor: t.fill }]}
          onPress={onCancel}
          activeOpacity={OPACITE_PRESSION}
          accessibilityRole="button"
        >
          <Text style={s.annuler}>Annuler</Text>
        </Presse>
        <Presse
          style={[s.bouton, { backgroundColor: t.danger }]}
          onPress={onConfirm}
          activeOpacity={OPACITE_PRESSION}
          accessibilityRole="button"
        >
          <Text style={s.confirmer}>{confirmLabel}</Text>
        </Presse>
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { gap: Spacing.md, marginTop: Spacing.sm },
    question: { ...Type.bodySmall, color: t.text, lineHeight: 20 },
    boutons: { flexDirection: 'row', gap: Spacing.sm },
    bouton: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button,
    },
    annuler: { ...Type.bodySmallStrong, color: t.text },
    confirmer: { ...Type.bodySmallStrong, color: t.onAccent },
  });
}
