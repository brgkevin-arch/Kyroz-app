import { Platform, useWindowDimensions } from 'react-native';
import { formeBarre, type FormeBarre } from '../lib/barreOnglets';
import { designLiquidGlass } from '../components/Materiau';

/**
 * La forme de la barre d'onglets sur CET appareil, à CETTE largeur — la règle vit dans
 * `lib/barreOnglets.ts`. Re-rend quand la fenêtre change de taille : sur iPad, le
 * Split View fait passer la barre du haut au bas sans relancer l'app.
 */
export function useFormeBarre(): FormeBarre {
  const { width } = useWindowDimensions();
  return formeBarre({
    os: Platform.OS,
    isPad: Platform.OS === 'ios' && Platform.isPad,
    versionIos: Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) || 0 : 0,
    liquidGlass: designLiquidGlass(),
    largeur: width,
  });
}
