import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { loadThemeMode } from '../lib/themeMode';
import { loadAccentId } from '../lib/accentColor';
import { loadHydrationEnabled } from '../components/HydrationBar';
import { loadFirstName } from '../lib/profileName';
import { loadReminder } from '../hooks/useReminder';
import { AuthProvider } from '../hooks/useAuth';
import { ProfileProvider } from '../hooks/useProfile';
import { RecipeOverridesProvider } from '../hooks/useRecipeOverrides';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TourProvider } from '../components/GuidedTour';
import { DialogProvider } from '../components/Dialog';

export default function RootLayout() {
  const t = useTheme();
  // Les cinq valeurs LOCALES à l'appareil (thème, accent, suivi d'hydratation,
  // prénom, heure du rappel) se chargent ici, une seule fois. Une valeur oubliée
  // ici part sur son défaut à chaque démarrage — c'est exactement ce qui faisait
  // que l'interrupteur d'hydratation ne prenait effet qu'au lancement suivant
  // (cf. la note dans components/HydrationBar.tsx).
  //
  // 🔴 `loadReminder` ne fait pas que LIRE : il RÉ-ARME la notification du jour.
  // C'était le maillon manquant — le ré-armement ne vivait que dans l'onglet
  // Profil, donc le texte du rappel quotidien pouvait dater de plusieurs mois
  // chez qui n'y entre jamais (cf. `lib/notifications.ts::rearmReminder`).
  useEffect(() => { loadThemeMode(); loadAccentId(); loadHydrationEnabled(); loadFirstName(); loadReminder(); }, []);
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
