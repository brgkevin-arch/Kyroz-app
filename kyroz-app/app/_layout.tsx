import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { loadThemeMode } from '../lib/themeMode';
import { loadAccentId } from '../lib/accentColor';
import { loadHydrationEnabled } from '../components/HydrationBar';
import { loadFirstName } from '../lib/profileName';
import { AuthProvider } from '../hooks/useAuth';
import { ProfileProvider } from '../hooks/useProfile';
import { RecipeOverridesProvider } from '../hooks/useRecipeOverrides';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TourProvider } from '../components/GuidedTour';
import { DialogProvider } from '../components/Dialog';

export default function RootLayout() {
  const t = useTheme();
  // Les quatre valeurs LOCALES à l'appareil (thème, accent, suivi d'hydratation,
  // prénom) se chargent ici, une seule fois. Une valeur oubliée ici part sur son
  // défaut à chaque démarrage — c'est exactement ce qui faisait que l'interrupteur
  // d'hydratation ne prenait effet qu'au lancement suivant (cf. la note dans
  // components/HydrationBar.tsx).
  useEffect(() => { loadThemeMode(); loadAccentId(); loadHydrationEnabled(); loadFirstName(); }, []);
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <AuthProvider>
        <ProfileProvider>
          <RecipeOverridesProvider>
            <TourProvider>
              {/* Les boîtes de dialogue remplacent `Alert.alert`, fonction VIDE sur
                  react-native-web (cf. components/Dialog.tsx). Au-dessus du Stack :
                  n'importe quel écran peut en ouvrir une. */}
              <DialogProvider>
                <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: t.bg },
                  }}
                />
              </DialogProvider>
            </TourProvider>
          </RecipeOverridesProvider>
        </ProfileProvider>
      </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
