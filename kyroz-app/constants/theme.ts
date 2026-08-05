import { useSyncExternalStore } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { getThemeMode, subscribeThemeMode } from '../lib/themeMode';
import { ACCENTS, AccentId, getAccentId, subscribeAccentId, readableOn } from '../lib/accentColor';

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

// ── Espacement — le blanc DIT ce qui va ensemble ────────────────────────────
// Ce n'est pas de la décoration : deux éléments proches sont lus comme un
// groupe, deux éléments éloignés comme deux groupes, et l'œil fait ce
// regroupement avant même de lire. Une grille de 4 limite donc le nombre de
// distances possibles, et chacune veut dire quelque chose.
//
//   xs    4   écart serré DANS un groupe (un libellé et sa valeur)
//   sm    8   entre deux éléments d'un même groupe
//   md   12   entre deux groupes d'un même bloc
//   lg   16   marge intérieure d'une carte
//   xl   20   marge latérale d'un écran
//   xxl  24   marge intérieure d'une feuille modale
//   xxxl 32   séparation de deux sections
//
// ⚠️ Mesuré le 2026-08-06 : l'app écrivait **520 espacements à la main pour 49
// usages de ce token** — dix marges en dur pour une seule qui passait par ici.
// Et 231 de ces valeurs n'étaient dans aucun cran : 10 (70 fois), 14 (53),
// 6 (39), 2 (39), 18, 15, 11.
//
// ⚠️ Elles ont été ABSORBÉES, pas adoptées, et c'est la différence avec la
// typographie — où 14 avait un vrai rôle et a mérité son token. Ici 10 n'est
// pas « un cran entre 8 et 12 » : c'est « un peu plus que 8 ». Deux pixels sur
// un écart passent sous le seuil de perception, donc un tel cran ne crée aucun
// niveau de lecture — il ne fait que diluer ceux qui existent.
// Règle d'absorption appliquée : **le cran le plus proche, et on monte en cas
// d'égalité** (2→4, 6→8, 10→12, 14→16, 18→20). L'app s'aère de 1 à 2 points par
// endroit, jamais plus.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Dégagements de bas d'écran. Ce ne sont PAS des écarts de mise en page — on ne
// les choisit pas à l'œil, ils compensent quelque chose de physique — donc ils
// n'ont rien à faire dans la grille ci-dessus, et ils sont nommés d'après ce
// qu'ils dégagent.
export const Fond = {
  /** Sous une liste d'onglet : la barre d'onglets flotte au-dessus du contenu. */
  barreOnglets: 120,
  /** Bas d'un écran plein sans barre d'onglets (Kyroz+, mentions légales). */
  ecran: 60,
  /** Bas d'une feuille modale : la zone sûre du menton de l'iPhone. */
  feuille: 40,
} as const;

// 🔴 Cible tactile minimale d'Apple (Human Interface Guidelines). Ce n'est pas
// un espacement non plus : c'est une HAUTEUR, et elle se fabrique le plus
// souvent par le `paddingVertical` d'un bouton — ce qui explique que la mesure
// du 2026-08-06 ait trouvé des `paddingVertical` à 6, 9 et 11 sur des éléments
// pressables. `hitSlop` élargit la zone au doigt, mais ne la rattrape jamais à
// l'œil : un bouton qui a l'air petit reste difficile à viser.
export const CIBLE_TACTILE_MIN = 44;

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
//   hero             chiffre héros (kcal du jour, poids) — un seul par écran
//   display          titre d'écran
//   h1               titre d'étape (onboarding, écran secondaire plein)
//   h2               titre de feuille modale ou de dialogue
//   h3               titre de bloc à l'intérieur d'un écran
//   label            libellé de bouton, nom d'un item de liste
//   input            texte SAISI dans un champ — voir le plancher ci-dessous
//   body             le texte qu'on lit
//   bodySmall        le texte secondaire qui accompagne (macros sous un repas,
//                    libellé gris d'une ligne de réglage, sous-titre de bloc)
//   caption          la mention qu'on ne lit qu'en cas de doute
//   micro            mention de bas d'écran, badge, libellé d'axe de graphe
//   overline         sur-titre en CAPITALES — c'est l'interlettrage qui le fait,
//                    pas la taille : `micro` a le même corps sans l'espacement
//
// Chaque cran a un variant `…Strong` quand la mesure a montré qu'il servait
// vraiment aux deux graisses. Aucun token de cette table n'est spéculatif.
//
// ⚠️ Cette échelle a été POSÉE le 2026-08-05, pas inventée : l'app employait
// 18 tailles pour 8 tokens déclarés. Les deux grandes absentes étaient les plus
// courues — 14 (76 fois) et 12 (48 fois) — et la table qui SERT de référence ne
// les mentionnait nulle part. Détail de la mesure : `kyroz-app/CLAUDE.md` §8.
//
// ⚠️ La graisse 600 a été BANNIE le même jour (72 emplois). Elle ne marquait
// rien : mesurée, elle se répartissait sur les six tailles au hasard de qui
// écrivait « un peu gras ». Deux graisses suffisent, et c'est ce que dit déjà
// la première ligne de ce commentaire — 500 pour le texte, 700 pour ce qui porte.
//
// 🔴 `input` ne descend JAMAIS sous 16. Ce n'est pas un choix esthétique : Safari
// iOS ZOOME de force sur un champ dont le texte fait moins de 16 px, et les
// testeurs de Kyroz ouvrent l'app dans le navigateur de leur téléphone (c'est
// le lien du README). Avant ce token, les sept champs de l'app respectaient ce
// plancher par accident et rien n'empêchait le prochain de le casser.
export const Type = {
  // tailles + graisses (la police système rend du SF Pro sur iOS)
  hero: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -1.4 },
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.9, lineHeight: 41 },
  h1: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3 },
  label: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.3 },
  input: { fontSize: 16, fontWeight: '500' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const },
  bodySmall: { fontSize: 14, fontWeight: '500' as const },
  bodySmallStrong: { fontSize: 14, fontWeight: '700' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  captionStrong: { fontSize: 13, fontWeight: '700' as const },
  micro: { fontSize: 11, fontWeight: '500' as const },
  microStrong: { fontSize: 11, fontWeight: '700' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
} as const;

// La mention de bas d'écran — « Kyroz n'est pas un dispositif médical », etc.
// Le style était RECOPIÉ à l'identique dans sept fichiers (login, onboarding,
// plan, profil, kyroz-plus, FirstPlanReveal, HealthScreening) : même corps, même
// interligne, même centrage. Sept copies d'un texte de prudence, c'est sept
// occasions qu'une seule dérive et que la phrase la plus sensible de l'app soit
// composée différemment d'un écran à l'autre.
export const Disclaimer = { ...Type.micro, lineHeight: 16, textAlign: 'center' as const };

// Les tailles que l'échelle AUTORISE, et rien d'autre. `lib/__tests__/typoDA.test.ts`
// s'en sert pour refuser tout `fontSize:` littéral qui n'y figure pas — sans cette
// liste, ajouter un cran de plus ne coûterait rien à personne, et c'est exactement
// comme ça qu'on est arrivé à 18 tailles.
export const TAILLES_AUTORISEES = [11, 13, 14, 15, 16, 17, 22, 30, 34, 40] as const;

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
