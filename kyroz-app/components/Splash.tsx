import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, Type } from '../constants/theme';

// Écran d'attente pendant que la session + le profil s'hydratent.
// Partagé par app/index.tsx et app/(tabs)/_layout.tsx : les deux points d'entrée
// de l'app doivent afficher EXACTEMENT le même écran, sinon on voit un flash.
export default function Splash() {
  const t = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: t.bg }]}>
      <Text style={[styles.logo, { color: t.text }]}>KYROZ</Text>
      <ActivityIndicator color={t.textTertiary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { ...Type.h1, letterSpacing: 5 },
});
