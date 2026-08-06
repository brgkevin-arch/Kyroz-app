import { useSyncExternalStore } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { getThemeMode, subscribeThemeMode } from '../lib/themeMode';
import { ACCENTS, AccentId, getAccentId, subscribeAccentId, readableOn, macroShades } from '../lib/accentColor';

// ── Système de thème adaptatif Kyroz ─────────────────────────────────────────
// Clair + sombre, suit le réglage système. Palette système iOS, accent graphite.
//
// ⚠️ LES MACROS N'ONT PLUS TROIS TEINTES, MAIS TROIS NUANCES D'UNE MÊME COULEUR
// (2026-08-03, refonte design). `protein` / `carbs` / `fat` valaient bleu / jaune /
// rouge et étaient employés à 32 endroits — y compris là où il n'y a RIEN à
// comparer (une ligne de texte « 42 P · 81 G · 12 L » dans une liste). La couleur
// ne porte une information que dans une BARRE, où elle sépare des proportions
// côte à côte ; ailleurs elle ne fait que du bruit et écrase le nom du plat.
// Les trois valeurs restent donc des tokens distincts — la barre garde ses trois
// segments lisibles — mais elles ne portent plus trois teintes.
// ⚠️ Ne pas « re-coloriser » un seul écran : c'est le mélange des deux grammaires
// qui rendait l'ancienne UI bruyante, pas la couleur en soi.
//
// ⚠️ CETTE COULEUR SUIT L'ACCENT CHOISI depuis le 2026-08-05 (décision fondateur).
// Les valeurs ci-dessous sont celles du MONOCHROME — le défaut, donc la DA que
// voit la majorité. Dès qu'un accent coloré est choisi, `paletteFor` les remplace
// par trois nuances de cet accent (`lib/accentColor.ts::macroShades`), mesurées
// contre le fond de page. Le principe est intact : trois nuances d'UNE couleur.
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

  // Défaut MONOCHROME — remplacé à l'exécution par la couleur choisie (cf. `paletteFor`).
  accent: '#FFFFFF',
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

  // Défaut MONOCHROME — remplacé à l'exécution par la couleur choisie (cf. `paletteFor`).
  accent: '#1C1C1E',
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

// ── Rayons — À QUOI sert chaque valeur, pas juste combien elle vaut ──────────
// La liste triée par taille ne dit pas laquelle employer, et c'est comme ça que
// la même carte s'est retrouvée à 16 dans un composant et 22 dans l'écran d'à
// côté. Le rôle est donc écrit ici, et il n'y en a QU'UN par objet :
//
//   pill    puce, jauge, badge          — jamais un bouton pleine largeur
//   sm      sous-bloc DANS un bloc, ligne de liste, vignette
//   button  bouton (plein, contour ou pointillé) ET champ de saisie
//   card    bloc de contenu dans la page — le rayon dominant de la DA
//   xl      grande surface flottante : feuille modale, dialogue, célébration
//
// ⚠️ `md` (16) et `lg` (20) ont été SUPPRIMÉS le 2026-08-03, et c'est le garde-fou :
// tant qu'ils existaient, rien n'empêchait d'écrire `Radius.md` sur une carte, et
// c'est exactement ce qui s'est passé — la carte Hydratation était à 16 sur un écran
// où tout le reste était à 22. Les rendre inexistants fait échouer `tsc` au lieu de
// laisser passer un écart qui ne se voit qu'à l'œil, sur un écran, un jour.
export const Radius = {
  sm: 12,
  button: 14,   // boutons pleins
  card: 22,     // blocs de contenu — le rayon dominant
  xl: 24,
  pill: 999,
} as const;

// ── Échelle typographique ────────────────────────────────────────────────────
// ⚠️ La hiérarchie se fait par la TAILLE, pas par la graisse : tout ce qui est
// titre pèse 700. `h1` valait 800 — plus lourd que le `display` au-dessus de
// lui — ce qui inversait la hiérarchie dès qu'on employait les deux. Personne ne
// s'en servait encore, l'incohérence est donc restée invisible dans le fichier
// qui SERT de référence à toute l'app.
//
//   hero     chiffre héros (kcal du jour, poids) — 40, une seule par écran
//   display  titre d'écran
//   h1       titre d'étape (onboarding, écran secondaire plein)
//   h2       titre de feuille modale ou de dialogue
//   h3       titre de bloc à l'intérieur d'un écran
//   overline sur-titre en capitales
export const Type = {
  // tailles + graisses (la police système rend du SF Pro sur iOS)
  hero: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -1.4 },
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.9, lineHeight: 41 },
  h1: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
} as const;

// ── Application de la couleur d'accent choisie ───────────────────────────────
// L'accent est le SEUL token personnalisable (cf. lib/accentColor.ts). Tout le
// reste de la palette — fonds, encre, gris de macro — reste la DA de Kyroz.
//
// ⚠️ Le résultat est MIS EN CACHE, et ce n'est pas de l'optimisation prématurée :
// chaque écran fait `useMemo(() => makeStyles(t), [t])`. Renvoyer un objet neuf à
// chaque rendu invaliderait ce memo partout, et l'app reconstruirait toutes ses
// feuilles de style à chaque frappe au clavier. Le cache tient 12 entrées au
// maximum (2 thèmes × 6 accents), donc son identité est stable.
const palettes = new Map<string, ThemePalette>();

function paletteFor(scheme: 'light' | 'dark', accentId: AccentId): ThemePalette {
  const cle = `${scheme}:${accentId}`;
  const connue = palettes.get(cle);
  if (connue) return connue;
  const base = scheme === 'light' ? light : dark;
  const accent = (ACCENTS[accentId] ?? ACCENTS.mono)[scheme];
  // `onAccent` se CALCULE : voir la note dans lib/accentColor.ts. Une table écrite
  // à la main livrerait tôt ou tard un libellé illisible sur un bouton.
  const p: ThemePalette = { ...base, accent, onAccent: readableOn(accent) };
  // Les macros suivent la couleur choisie — en TROIS NUANCES, pas trois teintes
  // (décision fondateur 2026-08-05, cf. lib/accentColor.ts::macroShades).
  // ⚠️ En monochrome on garde les gris système EN DUR plutôt que de dériver du
  // blanc ou de l'encre : les dériver donnerait des gris différents en clair et en
  // sombre, et surtout ferait BOUGER la DA par défaut — celle que voit tout le
  // monde — pour un changement qui ne concerne que ceux qui choisissent une couleur.
  if (accentId !== 'mono') {
    const [prot, glu, lip] = macroShades(accent, base.bg);
    p.protein = prot; p.carbs = glu; p.fat = lip;
  }
  palettes.set(cle, p);
  return p;
}

/** Hook principal : renvoie la palette active selon la préférence (ou le système). */
export function useTheme(): ThemePalette {
  const system = useColorScheme();
  const mode = useSyncExternalStore(subscribeThemeMode, getThemeMode, getThemeMode);
  const accentId = useSyncExternalStore(subscribeAccentId, getAccentId, getAccentId);
  const scheme = mode === 'system' ? system : mode;
  return paletteFor(scheme === 'light' ? 'light' : 'dark', accentId); // défaut sombre (premium)
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
