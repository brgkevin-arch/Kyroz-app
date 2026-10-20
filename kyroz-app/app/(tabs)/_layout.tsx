import { Tabs, Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, ColorValue } from 'react-native';
import { useTheme, Type, Spacing, Trait, HAUTEUR_BARRE_ONGLETS } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import Splash from '../../components/Splash';
import { PlanIcon, CoursesIcon, ReserveIcon, RecettesIcon, ProfilIcon } from '../../components/TabIcons';

// Chaque onglet nomme un OBJET, pas une ambiance. Les tracés viennent de
// `lib/iconesOnglets.ts` (la maquette) — voir `components/TabIcons.tsx` pour la note
// qui explique pourquoi elles ne sortent pas d'une librairie.
type TabIcon = (p: { color: string; focused: boolean }) => React.ReactElement;

const icon = (Cmp: TabIcon) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) =>
    Cmp({ color: color as string, focused });

// ⚠️ L'ORDRE et les TITRES de ce tableau sont relus par `harnaisEcrans.test.ts` (le
// harnais web tape les onglets par leur nom) et doivent suivre `ONGLETS` de
// `lib/tours.ts` (la visite les pointe par leur rang). Une seule liste pour les deux
// barres : elles ne peuvent pas diverger.
// Les PNG sont générés depuis les mêmes tracés (`scripts/gen-icones-onglets.ts`).
const ONGLETS_BARRE = [
  { name: 'plan', title: 'Plan', Icon: PlanIcon, image: require('../../assets/onglets/plan.png'), imageActive: require('../../assets/onglets/plan-actif.png') },
  { name: 'courses', title: 'Courses', Icon: CoursesIcon, image: require('../../assets/onglets/courses.png'), imageActive: require('../../assets/onglets/courses-actif.png') },
  { name: 'reserve', title: 'Réserve', Icon: ReserveIcon, image: require('../../assets/onglets/reserve.png'), imageActive: require('../../assets/onglets/reserve-actif.png') },
  { name: 'recettes', title: 'Recettes', Icon: RecettesIcon, image: require('../../assets/onglets/recettes.png'), imageActive: require('../../assets/onglets/recettes-actif.png') },
  { name: 'profil', title: 'Profil', Icon: ProfilIcon, image: require('../../assets/onglets/profil.png'), imageActive: require('../../assets/onglets/profil-actif.png') },
] as const;

export default function TabLayout() {
  const t = useTheme();
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

  // ── iOS : LA barre d'Apple, pas une copie (2026-10-19) ──────────────────────
  // C'est `UITabBar` lui-même : sous iOS 26, la capsule de Liquid Glass qui flotte
  // au-dessus du contenu, l'onglet actif dans sa bulle ; sous iOS 18, la barre
  // classique. C'est le système qui la
  // dessine, donc elle est conforme d'office — aujourd'hui et aux versions qui
  // viennent — et « Réduire la transparence », le contraste renforcé, les grandes
  // tailles de texte et VoiceOver y sont gérés par lui, pas par nous.
  //
  // ⚠️ SUR IPAD, ELLE MONTE EN HAUT de l'écran, en libellés seuls (norme d'iPadOS 18+).
  // Les écrans s'y rangent dessous d'eux-mêmes (zone sûre), mais deux pièces de l'app
  // supposaient une barre en bas : la visite guidée et la barre de titre compacte. Elles
  // lisent désormais la forme de la barre (`lib/barreOnglets.ts`, `useFormeBarre`).
  //
  // 🔴 PUBLIABLE EN OTA, ET SEULEMENT PARCE QUE LE NATIF EST DÉJÀ LÀ. Le composant
  // natif vient de `react-native-screens` (4.26.2, dossier `ios/tabs`, compilé sans
  // option), présent dans le build (22) : même empreinte. Une OTA ne peut atterrir
  // que sur un binaire de même empreinte (`runtimeVersion: fingerprint`).
  //
  // ⚠️ Ce que la barre native ne sait pas faire : afficher un composant React. Les
  // icônes y arrivent en PNG « template » — iOS n'en lit que la forme et les teint.
  // Seule la teinte de l'onglet actif est imposée (l'accent, convention iOS) ; les
  // autres prennent la couleur que le verre choisit pour rester lisible sur ce qui
  // passe derrière — la forcer reviendrait à lutter contre le matériau.
  //
  // 🔴 LA BARRE NE SE RÉTRACTE PAS, ET C'EST MESURÉ (simulateur, iOS 26.5, 2026-10-19).
  // Avec `minimizeBehavior="onScrollDown"`, elle se réduisait bien en bulle en
  // descendant le Plan… et ne revenait JAMAIS en remontant, pas même tout en haut, au
  // geste lent comme au geste vif. iOS ne suit pas le défilement d'une `ScrollView`
  // React Native dans ce sens-là. Changer d'onglet aurait demandé deux touchers (la
  // bulle, puis l'onglet) — pire que la barre d'avant. `never` est explicite : la
  // valeur par défaut, `automatic`, laisse le système décider.
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs tintColor={t.accent} minimizeBehavior="never">
        {/* 🔴 `disableAutomaticContentInsets` : sans lui, iOS ajoute la barre d'état
            AU HAUT de la première liste de chaque onglet — par-dessus le décalage que
            l'écran pose déjà lui-même pour défiler sous l'îlot (`useCollapsingTitle`).
            Mesuré le 2026-10-19 : Recettes et Profil descendaient de 62 pt pile au
            repos, le Plan non (la liste n'y était pas trouvée) — deux comportements
            pour un même réglage. Kyroz gère ses marges lui-même, en haut
            (`repli.contenu`) comme en bas (`Fond.barreOnglets`). */}
        {ONGLETS_BARRE.map((o) => (
          <NativeTabs.Trigger key={o.name} name={o.name} disableAutomaticContentInsets>
            <NativeTabs.Trigger.Label>{o.title}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={{ default: o.image, selected: o.imageActive }} renderingMode="template" />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  // ── Web et Android : la barre dessinée, peinte, à sa place dans le flux ──────
  // Pas de verre ici : il n'existe que sous iOS 26. C'est l'apparence de toujours.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.line,
          borderTopWidth: Trait.fin,
          height: HAUTEUR_BARRE_ONGLETS,
          // 10 avant le 2026-10-19, écrit `ios ? 28 : 10` — une forme que
          // `espacementDA` ne lisait pas. 🔴 Absorbé au cran INFÉRIEUR, contre la
          // règle d'égalité de `Spacing` (qui monte), et c'est MESURÉ dans le
          // navigateur (375 pt) : le libellé (11 px) n'avait que 11 px de boîte à 10,
          // 9 px à 12 — rogné en bas, et pire au cran du dessus ; 13 px à 8, entier.
          paddingBottom: Spacing.sm,
          paddingTop: Spacing.sm,
        },
        // L'onglet actif porte l'ACCENT, pas l'encre : c'est la convention iOS, et
        // c'est ce qu'attend quelqu'un qui vient de choisir une couleur. En
        // monochrome, `accent` vaut déjà l'encre — le rendu ne bouge pas d'un pixel.
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarLabelStyle: { ...Type.microStrong },
      }}
    >
      {ONGLETS_BARRE.map((o) => (
        <Tabs.Screen key={o.name} name={o.name} options={{ title: o.title, tabBarIcon: icon(o.Icon) }} />
      ))}
    </Tabs>
  );
}
