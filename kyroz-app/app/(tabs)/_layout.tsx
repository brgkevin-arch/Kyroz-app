import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ColorValue } from 'react-native';
import { useTheme } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function makeIcon(name: IconName, nameFocused: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? nameFocused : name} size={23} color={color as string} />
  );
}

export default function TabLayout() {
  const t = useTheme();
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
