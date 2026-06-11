import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useTheme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

export default function Index() {
  const t = useTheme();
  const { session, ready } = useAuth();
  const { profile, loading } = useProfile();

  if (!ready || loading) {
    return (
      <View style={[styles.splash, { backgroundColor: t.bg }]}>
        <Text style={[styles.logo, { color: t.text }]}>KYROZ</Text>
        <ActivityIndicator color={t.textTertiary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href={profile ? '/(tabs)/plan' : '/(auth)/onboarding'} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 30, fontWeight: '900', letterSpacing: 5 },
});
