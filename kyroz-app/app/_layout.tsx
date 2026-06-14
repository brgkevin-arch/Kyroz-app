import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { loadThemeMode } from '../lib/themeMode';
import { AuthProvider } from '../hooks/useAuth';
import { ProfileProvider } from '../hooks/useProfile';
import { RecipeOverridesProvider } from '../hooks/useRecipeOverrides';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function RootLayout() {
  const t = useTheme();
  useEffect(() => { loadThemeMode(); }, []);
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <AuthProvider>
        <ProfileProvider>
          <RecipeOverridesProvider>
            <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: t.bg },
              }}
            />
          </RecipeOverridesProvider>
        </ProfileProvider>
      </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
