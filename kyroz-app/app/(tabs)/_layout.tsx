import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ColorValue } from 'react-native';
import { useTheme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Splash from '../../components/Splash';

type IconName = keyof typeof Ionicons.glyphMap;

function makeIcon(name: IconName, nameFocused: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? nameFocused : name} size={23} color={color as string} />
  );
}

export default function TabLayout() {
  const t = useTheme();
  const { session, ready } = useAuth();
  const { profile, loading } = useProfile();

  // Garde d'entrée des onglets — MÊME logique que app/index.tsx.
  // Indispensable : on n'arrive pas toujours par `/`. Un raccourci d'écran
  // d'accueil, un deep link ou un lien partagé ouvre DIRECTEMENT une tab
  // (ex. `/profil`) et court-circuiterait sinon le garde de l'index → l'écran
  // se rendait vide (`profil.tsx` fait `if (!profile) return null`) = page
  // blanche avec juste la barre d'onglets. Constaté sur iPhone (2026-07-21).
  if (!ready || loading) return <Splash />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!profile) return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.textQuaternary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: makeIcon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: makeIcon('cart-outline', 'cart') }} />
      <Tabs.Screen name="garde-manger" options={{ title: 'Frigo', tabBarIcon: makeIcon('file-tray-full-outline', 'file-tray-full') }} />
      <Tabs.Screen name="recettes" options={{ title: 'Recettes', tabBarIcon: makeIcon('restaurant-outline', 'restaurant') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: makeIcon('flame-outline', 'flame') }} />
    </Tabs>
  );
}
