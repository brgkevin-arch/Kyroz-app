import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Presse } from './Presse';
import { useTheme, Radius, Spacing, Type, OPACITE_PRESSION , Icone } from '../constants/theme';
import { AvertissementIcon } from './Icons';
import { captureErreur } from '../lib/analytics';

// Frontière d'erreur globale : un crash de rendu n'affiche plus un écran rouge
// mais un fallback propre avec « Réessayer » (re-monte l'arbre). Les données
// locales (AsyncStorage) ne sont jamais touchées — on ne perd rien.

function Fallback({ onRetry }: { onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <AvertissementIcon color={t.textSecondary} size={Icone.fete} />
      <Text style={[styles.title, { color: t.text }]}>Oups, quelque chose a cassé</Text>
      <Text style={[styles.sub, { color: t.textSecondary }]}>
        Ce n'est pas toi, c'est nous. Tes données sont intactes.
      </Text>
      <Presse
        onPress={onRetry}
        activeOpacity={OPACITE_PRESSION}
        style={[styles.btn, { backgroundColor: t.accent }]}
      >
        <Text style={[styles.btnTxt, { color: t.onAccent }]}>Réessayer</Text>
      </Presse>
    </View>
  );
}

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('ErrorBoundary:', error, info);
    // D6 — depuis le 2026-08-10, l'erreur est aussi COMPTÉE. `captureErreur` reste
    // no-op sans consentement (RGPD), donc l'ancienne mention « pas de télémétrie
    // tierce sans consentement » tient toujours : c'est `capture` qui la garantit,
    // pas l'absence d'appel ici.
    // ⚠️ Ni le message, ni la pile, ni `info` ne partent — seulement le NOM DE CLASSE
    // de l'erreur et la route. Un message brut contient régulièrement une valeur
    // saisie par l'utilisateur, ce qui en ferait du texte libre (§6).
    captureErreur(error);
  }

  render() {
    if (this.state.hasError) {
      return <Fallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.md },
  title: { ...Type.h2, textAlign: 'center' },
  sub: { ...Type.body, lineHeight: 21, textAlign: 'center' },
  btn: { marginTop: Spacing.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxxl, borderRadius: Radius.button },
  btnTxt: { ...Type.label },
});
