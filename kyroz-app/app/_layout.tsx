import { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { loadThemeMode } from '../lib/themeMode';
import { loadAccentId } from '../lib/accentColor';
import { loadHydrationEnabled } from '../components/HydrationBar';
import { loadFirstName } from '../lib/profileName';
import { loadReminder } from '../hooks/useReminder';
import { loadReduceMotion } from '../lib/reduceMotion';
import { subscribeNotificationTaps } from '../lib/notifications';
import { poserNotificationIntent } from '../hooks/useNotificationIntent';
import { loadReduceTransparency } from '../lib/reduceTransparency';
import { AuthProvider } from '../hooks/useAuth';
import { ProfileProvider } from '../hooks/useProfile';
import { RecipeOverridesProvider } from '../hooks/useRecipeOverrides';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TourProvider } from '../components/GuidedTour';
import { DialogProvider } from '../components/Dialog';
import { noterEcran } from '../lib/analytics';

/**
 * Dépose la route courante pour que `app_error` puisse dire OÙ ça a cassé.
 *
 * ⚠️ Composant à part, et rendu SOUS le `Stack`, pour deux raisons : `usePathname`
 * exige le contexte de navigation (il n'existe pas au-dessus), et un composant isolé
 * qui ne rend rien ne peut pas entraîner l'arbre avec lui. `ErrorBoundary` enveloppe
 * toute l'app : une exception levée dans le layout racine lui-même remplacerait
 * l'app entière par l'écran « quelque chose a cassé », pour une ligne de mesure.
 */
function SuiviEcran() {
  const chemin = usePathname();
  useEffect(() => { noterEcran(chemin); }, [chemin]);
  return null;
}

/**
 * Le tap sur une notification conduit à l'écran qu'elle demande.
 *
 * ⚠️ **Rendu SOUS le `Stack`, comme `SuiviEcran`, et pour la même raison** :
 * `router.navigate` exige le contexte de navigation, qui n'existe pas au-dessus.
 * Posé dans l'effet de `RootLayout`, un tap reçu au démarrage à froid tenterait
 * de naviguer avant que le navigateur ne soit monté.
 *
 * ⚠️ La destination est toujours le Plan : la feuille de pesée n'est pas une
 * route, elle vit DANS cet écran (c'est déjà vrai du bouton qui l'ouvre). C'est
 * lui qui lit l'intention et ouvre la feuille — d'où le store partagé.
 * Naviguer là sans session est sans risque : `(tabs)/_layout` garde la porte.
 */
function RoutageNotification() {
  useEffect(() => subscribeNotificationTaps((intent) => {
    poserNotificationIntent(intent);
    router.navigate('/(tabs)/plan');
  }), []);
  return null;
}

export default function RootLayout() {
  const t = useTheme();
  // Les SIX valeurs LOCALES à l'appareil (thème, accent, suivi d'hydratation,
  // prénom, heure du rappel, réduction du mouvement) se chargent ici, une seule
  // fois. Une valeur oubliée ici part sur son défaut à chaque démarrage — c'est
  // exactement ce qui faisait que l'interrupteur d'hydratation ne prenait effet
  // qu'au lancement suivant (cf. la note dans components/HydrationBar.tsx).
  //
  // 🔴 `loadReminder` ne fait pas que LIRE : il RÉ-ARME la notification du jour.
  // C'était le maillon manquant — le ré-armement ne vivait que dans l'onglet
  // Profil, donc le texte du rappel quotidien pouvait dater de plusieurs mois
  // chez qui n'y entre jamais (cf. `lib/notifications.ts::rearmReminder`).
  //
  // ⚠️ `loadReduceMotion` non plus ne fait pas que lire : il S'ABONNE à
  // l'événement système. Le réglage d'accessibilité peut basculer pendant que
  // l'app est ouverte (on sort dans les Réglages, on revient) — sans
  // l'abonnement, il ne prendrait qu'au prochain démarrage, ce qui est le défaut
  // même que ce chargement groupé existe pour empêcher. `loadReduceTransparency`
  // est son jumeau, ajouté le 2026-08-11 avec le verre : même patron, même
  // abonnement, et Apple teste les deux réglages en revue.
  useEffect(() => {
    loadThemeMode(); loadAccentId(); loadHydrationEnabled();
    loadFirstName(); loadReminder(); loadReduceMotion(); loadReduceTransparency();
  }, []);
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
                <SuiviEcran />
                <RoutageNotification />
              </DialogProvider>
            </TourProvider>
          </RecipeOverridesProvider>
        </ProfileProvider>
      </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
