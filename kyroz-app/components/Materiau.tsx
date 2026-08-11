import React from 'react';
import { View, Platform, type ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '../constants/theme';
import { VERRE, doitServirDuVerre } from '../lib/materiau';
import { reduceTransparencyActif, useReduceTransparency } from '../lib/reduceTransparency';

// ── Le verre, et sa peinture de secours ──────────────────────────────────────
//
// Câblage de `lib/materiau.ts` — la décision est là-bas, testée ; ici il n'y a
// que le branchement au natif et le repli.
//
// 🔴 `expo-glass-effect` ÉTAIT DÉJÀ DANS LE BINAIRE, et personne ne l'avait
// installé. `expo-router` le tire (avec `expo-symbols`) sans qu'il figure dans
// `package.json` — exactement comme il tire reanimated et gesture-handler. C'est
// ce qui rend ce lot publiable en OTA : le pod `ExpoGlassEffect` (56.0.4) est
// compilé dans le build 1.0.0 (3) du 3 août, vérifié dans `ios/Podfile.lock` et
// dans le `package-lock.json` de cette date. ➡️ « Pas dans package.json » ne veut
// jamais dire « pas dans le binaire » : la preuve est le Podfile.lock.
//
// ⚠️ ET LA MÊME MÉCANIQUE EST UN PIÈGE DANS L'AUTRE SENS. Une OTA peut atterrir
// sur un binaire plus VIEUX que le bundle. `isGlassEffectAPIAvailable()` passe
// par `requireNativeModule`, qui LÈVE si le module n'est pas compilé — donc
// l'appel est enveloppé, et un échec vaut « pas de verre », jamais un écran
// blanc. (expo/expo#40911 : appeler `GlassView` sans cette vérification crashe.)

let apiVerre: boolean | null = null;

/** Le natif répond-il ? Calculé une fois — un binaire ne change pas en vol. */
function apiDisponible(): boolean {
  if (apiVerre === null) {
    try {
      apiVerre = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
    } catch {
      apiVerre = false;
    }
  }
  return apiVerre;
}

/**
 * Sert-on du verre ici et maintenant ? Utilisable hors React.
 * ⚠️ La transparence est relue À CHAQUE APPEL et jamais capturée : le réglage
 * bascule pendant que l'app tourne. Même règle que `reduceMotionActif()` dans
 * `Presse` — une valeur d'appareil figée dans une clôture est une valeur fausse.
 */
export function verreDisponible(): boolean {
  return doitServirDuVerre({
    apiVerre: apiDisponible(),
    liquidGlass: apiDisponible(),
    transparenceReduite: reduceTransparencyActif(),
  });
}

/** Version React : re-rend quand « Réduire la transparence » bascule. */
export function useVerre(): boolean {
  const reduite = useReduceTransparency();
  return doitServirDuVerre({
    apiVerre: apiDisponible(),
    liquidGlass: apiDisponible(),
    transparenceReduite: reduite,
  });
}

type Props = ViewProps & {
  /**
   * La peinture servie quand il n'y a pas de verre. Par défaut `card` — le fond
   * des surfaces posées sur le fond d'écran, c'est-à-dire ce que Kyroz affichait
   * avant ce chantier.
   */
  fondReplie?: string;
};

/**
 * Une surface en verre là où le système sait le faire, peinte partout ailleurs.
 *
 * ℹ️ Le repli n'est pas un mode dégradé : c'est l'apparence exacte d'avant. Un
 * iPhone sur iOS 18, un Android, le web et quiconque a réduit la transparence
 * voient l'app d'hier — ce qui est la raison pour laquelle ce lot peut partir
 * en OTA sans attendre un build.
 */
export default function Materiau({ fondReplie, style, children, ...rest }: Props) {
  const t = useTheme();
  const verre = useVerre();

  if (verre) {
    return (
      <GlassView style={style} glassEffectStyle={VERRE.standard} {...rest}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ backgroundColor: fondReplie ?? t.card }, style]} {...rest}>
      {children}
    </View>
  );
}
