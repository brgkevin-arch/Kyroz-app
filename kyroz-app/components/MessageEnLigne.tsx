import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Presse } from './Presse';
import { ThemePalette, Radius, Type, Spacing, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';

// ── INFORMER sans ouvrir de modale ───────────────────────────────────────────
//
// 🔴 LE PENDANT DE `ConfirmationEnLigne`, POUR CE QUI NE POSE PAS DE QUESTION.
// `useDialog().notify` monte sa propre `Modal`. Appelé depuis un écran qui vit
// DÉJÀ dans une feuille — donc dans une modale — il ne donne RIEN sur iOS : le
// bouton s'exécute, et l'écran ne bouge pas.
//
// ⚠️ POURQUOI CE FICHIER EXISTE ALORS QUE `ConfirmationEnLigne` ÉTAIT LÀ. Les
// deux derniers appels morts de la feuille Réglages (« aucune application
// e-mail », « rappel refusé ») ne demandaient rien : ils ANNONÇAIENT. Les faire
// passer par une confirmation aurait posé une question là où il n'y en a pas,
// et sans composant pour ce rôle, le prochain écran serait retourné à `notify` —
// c'est-à-dire au défaut. Un rôle sans nom se refait à la main (CLAUDE.md §8).
//
// ⚠️ CE DÉFAUT EST INVISIBLE SUR LE WEB : `react-native-web` rend une `Modal` en
// `<div>` et empile sans se plaindre. Ces deux messages avaient donc l'air sains
// au navigateur pendant qu'ils ne s'affichaient sur aucun iPhone.
//
// ⚠️ Ce n'est PAS un remplaçant universel de `useDialog`. Un écran plein garde sa
// boîte de dialogue : elle se pose au-dessus de tout et se rate difficilement.
// L'interdit ne vaut que DEPUIS une feuille — et il est compté :
// `lib/__tests__/feuillesEmpilees.test.ts`.
//
// ⚠️ IL SE FERME. Un `notify` a son bouton « OK » ; posé en ligne, un message qui
// ne part jamais devient un morceau d'écran permanent, et le réglage d'à côté se
// lit comme s'il était en défaut. La fermeture est donc obligatoire, pas
// optionnelle : c'est ce qui distingue un message d'un texte d'aide.

export function MessageEnLigne({
  t, titre, message, onFermer,
}: {
  t: ThemePalette;
  titre: string;
  /** Ce qu'il faut savoir ET quoi faire — c'est le seul texte que la personne lira. */
  message: string;
  onFermer: () => void;
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.wrap}>
      <Text style={s.titre}>{titre}</Text>
      {/* Sélectionnable : le repli « aucune application e-mail » porte une adresse
          et un identifiant à recopier. Un message qu'on ne peut pas copier
          obligerait à le retranscrire à la main, donc à se tromper. */}
      <Text style={s.message} selectable>{message}</Text>
      <Presse
        style={s.fermer}
        onPress={onFermer}
        activeOpacity={OPACITE_PRESSION}
        accessibilityRole="button"
      >
        <Text style={s.fermerTxt}>Fermer</Text>
      </Presse>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: t.fill, borderRadius: Radius.card,
      padding: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.sm,
    },
    titre: { ...Type.bodySmallStrong, color: t.text },
    message: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    fermer: {
      alignSelf: 'flex-start', justifyContent: 'center',
      minHeight: CIBLE_TACTILE_MIN, paddingRight: Spacing.lg,
    },
    fermerTxt: { ...Type.bodySmallStrong, color: t.textSecondary },
  });
}
