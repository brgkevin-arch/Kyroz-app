import { Tabs, Redirect } from 'expo-router';
import { Platform, ColorValue, StyleSheet } from 'react-native';
import { useTheme, Type, Spacing, Trait } from '../../constants/theme';
import Materiau, { useVerre } from '../../components/Materiau';
import { styleBarre } from '../../lib/materiau';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Splash from '../../components/Splash';
import { PlanIcon, CoursesIcon, FrigoIcon, RecettesIcon, ProfilIcon } from '../../components/TabIcons';

// Chaque onglet nomme un OBJET, pas une ambiance. Les icônes viennent de
// `components/TabIcons.tsx` (tracés de la maquette) — voir la note qui y explique
// pourquoi elles ne sortent pas d'une librairie.
type TabIcon = (p: { color: string; focused: boolean }) => React.ReactElement;

const icon = (Cmp: TabIcon) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) =>
    Cmp({ color: color as string, focused });

export default function TabLayout() {
  const t = useTheme();
  const verre = useVerre();
  const { session, ready, hydrating } = useAuth();
  const { profile, loading } = useProfile();

  // Garde d'entrée des onglets — MÊME logique que app/index.tsx.
  // Indispensable : on n'arrive pas toujours par `/`. Un raccourci d'écran
  // d'accueil, un deep link ou un lien partagé ouvre DIRECTEMENT une tab
  // (ex. `/profil`) et court-circuiterait sinon le garde de l'index → l'écran
  // se rendait vide (`profil.tsx` fait `if (!profile) return null`) = page
  // blanche avec juste la barre d'onglets. Constaté sur iPhone (2026-07-21).
  if (!ready || loading) return <Splash />;
  if (!session) return <Redirect href="/(auth)/login" />;
  // Même règle qu'app/index.tsx : on n'attend le cloud QUE si l'appareil n'a
  // rien à afficher. C'est ce chemin-là qu'emprunte le raccourci d'écran
  // d'accueil, qui ouvre directement un onglet sans passer par l'index.
  if (!profile && hydrating) return <Splash />;
  if (!profile) return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 🔴 LA BARRE CHANGE DE MATÉRIAU, PAS DE HAUTEUR. Hauteur, dégagements
        // et couleurs d'onglet sont ceux d'avant : seuls le fond et le trait
        // supérieur bougent, et uniquement là où le verre existe (iOS 26+, sans
        // « Réduire la transparence »). Partout ailleurs, `styleBarre` rend très
        // exactement les cinq lignes d'avant ce chantier.
        //
        // ⚠️ `position: 'absolute'` est la moitié du travail qu'on oublie : le
        // verre n'a de sens que si l'on voit du contenu AU TRAVERS, donc la barre
        // doit sortir du flux et laisser le contenu défiler dessous. Les cinq
        // écrans portaient déjà `paddingBottom: Fond.barreOnglets` (120 pt) —
        // 88 de barre + 32 d'air — donc rien ne finit caché. Ce n'est pas une
        // coïncidence heureuse à laisser sans surveillance : `materiauxDA` compte
        // ces cinq dégagements, parce qu'un sixième onglet qui les oublierait
        // ferait disparaître sa dernière ligne, tout en bas, là où aucune capture
        // ne regarde.
        tabBarStyle: {
          ...styleBarre(verre, t.card, t.line, Trait.fin),
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: Spacing.sm,
        },
        // Le verre lui-même. `tabBarBackground` se rend DERRIÈRE les onglets,
        // c'est le point d'accroche prévu par react-navigation pour un matériau.
        tabBarBackground: verre
          ? () => <Materiau style={StyleSheet.absoluteFill} />
          : undefined,
        // L'onglet actif porte l'ACCENT, pas l'encre : c'est la convention iOS, et
        // c'est ce qu'attend quelqu'un qui vient de choisir une couleur. En
        // monochrome, `accent` vaut déjà l'encre — le rendu ne bouge pas d'un pixel.
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textQuaternary,
        tabBarLabelStyle: { ...Type.microStrong },
      }}
    >
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: icon(PlanIcon) }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: icon(CoursesIcon) }} />
      <Tabs.Screen name="garde-manger" options={{ title: 'Frigo', tabBarIcon: icon(FrigoIcon) }} />
      <Tabs.Screen name="recettes" options={{ title: 'Recettes', tabBarIcon: icon(RecettesIcon) }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon(ProfilIcon) }} />
    </Tabs>
  );
}
