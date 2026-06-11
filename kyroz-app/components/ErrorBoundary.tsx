import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Radius, Spacing } from '../constants/theme';

// Frontière d'erreur globale : un crash de rendu n'affiche plus un écran rouge
// mais un fallback propre avec « Réessayer » (re-monte l'arbre). Les données
// locales (AsyncStorage) ne sont jamais touchées — on ne perd rien.

function Fallback({ onRetry }: { onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Text style={{ fontSize: 40 }}>🍳</Text>
      <Text style={[styles.title, { color: t.text }]}>Oups, quelque chose a cassé</Text>
      <Text style={[styles.sub, { color: t.textSecondary }]}>
        Ce n'est pas toi, c'est nous. Tes données sont intactes.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.85}
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
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  btn: { marginTop: 10, paddingVertical: 15, paddingHorizontal: 36, borderRadius: Radius.md },
  btnTxt: { fontSize: 16, fontWeight: '700' },
});
