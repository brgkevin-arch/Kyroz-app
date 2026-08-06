import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Radius, Spacing, Type, OPACITE_PRESSION , Icone } from '../constants/theme';
import { AvertissementIcon } from './Icons';

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
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={OPACITE_PRESSION}
        style={[styles.btn, { backgroundColor: t.accent }]}
      >
        <Text style={[styles.btnTxt, { color: t.onAccent }]}>Réessayer</Text>
      </TouchableOpacity>
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
    // Log console uniquement (pas de télémétrie tierce sans consentement — RGPD).
    console.error('ErrorBoundary:', error, info);
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
