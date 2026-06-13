import { useColorScheme, Platform } from 'react-native';

// ── Système de thème adaptatif Kyroz ─────────────────────────────────────────
// Clair + sombre, suit le réglage système. Accent monochrome (premium, Apple-like).

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
  card: '#121214',
  cardElevated: '#1A1A1D',
  fill: 'rgba(255,255,255,0.07)',

  line: 'rgba(255,255,255,0.09)',
  lineStrong: 'rgba(255,255,255,0.18)',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.62)',
  textTertiary: 'rgba(255,255,255,0.40)',
  textQuaternary: 'rgba(255,255,255,0.25)',

  accent: '#FFFFFF',
  onAccent: '#000000',

  protein: '#9FB8E6',
  carbs: '#E3CD93',
  fat: '#E0A0A0',

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
  fill: 'rgba(0,0,0,0.04)',

  line: 'rgba(0,0,0,0.07)',
  lineStrong: 'rgba(0,0,0,0.14)',

  text: '#1C1C1E',
  textSecondary: 'rgba(60,60,67,0.62)',
  textTertiary: 'rgba(60,60,67,0.40)',
  textQuaternary: 'rgba(60,60,67,0.26)',

  accent: '#1C1C1E',
  onAccent: '#FFFFFF',

  protein: '#3B7BE0',
  carbs: '#D7901C',
  fat: '#E0524E',

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
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const Type = {
  // tailles + graisses (la police système rend du SF Pro sur iOS)
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
} as const;

/** Hook principal : renvoie la palette active selon le réglage système. */
export function useTheme(): ThemePalette {
  const scheme = useColorScheme();
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
