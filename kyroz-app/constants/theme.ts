import { useSyncExternalStore } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { getThemeMode, subscribeThemeMode } from '../lib/themeMode';

// ── Système de thème adaptatif Kyroz ─────────────────────────────────────────
// Clair + sombre, suit le réglage système. Palette système iOS, accent graphite.
//
// ⚠️ LES MACROS N'ONT PLUS TROIS TEINTES, MAIS TROIS NUANCES DU MÊME GRIS
// (2026-08-03, refonte design). `protein` / `carbs` / `fat` valaient bleu / jaune /
// rouge et étaient employés à 32 endroits — y compris là où il n'y a RIEN à
// comparer (une ligne de texte « 42 P · 81 G · 12 L » dans une liste). La couleur
// ne porte une information que dans une BARRE, où elle sépare des proportions
// côte à côte ; ailleurs elle ne fait que du bruit et écrase le nom du plat.
// Les trois valeurs restent donc des tokens distincts — la barre garde ses trois
// segments lisibles — mais elles ne sortent plus du gris.
// ⚠️ Ne pas « re-coloriser » un seul écran : c'est le mélange des deux grammaires
// qui rendait l'ancienne UI bruyante, pas la couleur en soi.
//
// ⚠️ SEUL ÉCART ASSUMÉ AVEC LA MAQUETTE — l'échelle de gris est resserrée.
// La maquette servait #8E8E93 / #C1C1C4 / #DDDDDF en clair. Mesuré sur le rendu :
// le 3e segment (lipides) tombait à **1,21:1** contre le fond de page — invisible,
// la barre semblait s'arrêter aux deux tiers. Le défaut vient de la maquette, pas
// de son application : les valeurs avaient été relevées au pixel sur son rendu HTML.
// Remplacé par les gris système iOS successifs (systemGray / 2 / 3), qui gardent
// « trois nuances d'un même gris » et remontent le plus clair à 1,50:1.
// ➡️ Une valeur relevée sur une maquette se VÉRIFIE à l'écran : une couleur juste
// dans un cadre de 402 px peut être illisible une fois posée sur le vrai fond.

export interface ThemePalette {
  scheme: 'light' | 'dark';

  // Fonds
  bg: string;
  card: string;
  cardElevated: string;
  fill: string;          // remplissage subtil (inputs, chips inactifs)

  // Bordures / séparateurs
  line: string;
  lineStrong: string;

  // Texte
  text: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;

  // Accent monochrome (CTA, état actif)
  accent: string;        // fond du bouton principal / jour actif
  onAccent: string;      // texte sur accent
  onDanger: string;      // texte sur fond danger (blanc dans les deux thèmes)

  // Macros
  protein: string;
  carbs: string;
  fat: string;

  // Statuts
  success: string;
  warning: string;
  danger: string;

  // Ombres (light surtout)
  shadowColor: string;
  shadowOpacity: number;
}

const dark: ThemePalette = {
  scheme: 'dark',
  bg: '#000000',            // noir pur (OLED, premium)
  card: '#1C1C1E',          // iOS secondarySystemGroupedBackground
  cardElevated: '#2C2C2E',  // iOS tertiarySystemGroupedBackground
  fill: 'rgba(120,120,128,0.18)',   // iOS quaternarySystemFill (sombre)

  line: 'rgba(255,255,255,0.09)',
  lineStrong: 'rgba(255,255,255,0.18)',

  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.60)',   // iOS secondaryLabel (sombre)
  textTertiary: 'rgba(235,235,245,0.40)',
  textQuaternary: 'rgba(235,235,245,0.25)',

  accent: '#8E8E93',        // graphite (iOS systemGray)
  onAccent: '#000000',
  onDanger: '#FFFFFF',

  // Macros — trois NUANCES de l'accent, pas trois teintes (cf. note ci-dessous)
  protein: '#8E8E93',   // iOS systemGray
  carbs: '#636366',     // iOS systemGray2 (sombre)
  fat: '#48484A',       // iOS systemGray3 (sombre)

  success: '#7FD49B',
  warning: '#E5B567',
  danger: '#E8857F',

  shadowColor: '#000000',
  shadowOpacity: 0,
};

const light: ThemePalette = {
  scheme: 'light',
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  fill: 'rgba(120,120,128,0.08)',    // iOS quaternarySystemFill (clair)

  line: 'rgba(0,0,0,0.07)',
  lineStrong: 'rgba(0,0,0,0.14)',

  text: '#1C1C1E',
  textSecondary: 'rgba(60,60,67,0.60)',      // iOS secondaryLabel (clair)
  textTertiary: 'rgba(60,60,67,0.42)',
  textQuaternary: 'rgba(60,60,67,0.26)',

  accent: '#6F7274',        // graphite (contraste 4,85:1 sur blanc — AA)
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',

  // Macros — trois NUANCES de l'accent, pas trois teintes (cf. note ci-dessous)
  protein: '#8E8E93',   // iOS systemGray
  carbs: '#AEAEB2',     // iOS systemGray2 (clair)
  fat: '#C7C7CC',       // iOS systemGray3 (clair)

  success: '#28A745',
  warning: '#E08A1E',
  danger: '#E0524E',

  shadowColor: '#000000',
  shadowOpacity: 1,
};

// Tokens partagés (indépendants du thème)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 12,
  button: 14,   // boutons pleins
  md: 16,
  lg: 20,
  card: 22,     // blocs de contenu — le rayon dominant
  xl: 24,
  pill: 999,
} as const;

export const Type = {
  // tailles + graisses (la police système rend du SF Pro sur iOS)
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.9, lineHeight: 41 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
} as const;

/** Hook principal : renvoie la palette active selon la préférence (ou le système). */
export function useTheme(): ThemePalette {
  const system = useColorScheme();
  const mode = useSyncExternalStore(subscribeThemeMode, getThemeMode, getThemeMode);
  const scheme = mode === 'system' ? system : mode;
  return scheme === 'light' ? light : dark; // défaut sombre (premium)
}

/** Ombre de carte adaptée au thème (douce en clair, nulle en sombre). */
export function cardShadow(t: ThemePalette) {
  if (t.scheme === 'dark') {
    return { borderWidth: 1, borderColor: t.line };
  }
  // Web : boxShadow (les props shadow* y sont dépréciées par react-native-web).
  if (Platform.OS === 'web') {
    return { borderWidth: 0, boxShadow: '0px 4px 14px rgba(0,0,0,0.06)' };
  }
  // Natif : shadow* (iOS) + elevation (Android).
  return {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}
