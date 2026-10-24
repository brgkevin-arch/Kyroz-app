/**
 * LE LECTEUR DE TICKET, SUR L'IPHONE (2026-10-24, décision fondateur : « on part sur le nouveau
 * build » — la lecture se fait sur l'appareil, rien ne quitte le téléphone).
 *
 * Le module natif `KyrozTicket` (étape 3, `modules/kyroz-ticket`) lit :
 *  · le TEXTE d'un ticket dématérialisé (le PDF de l'appli de l'enseigne), par PDFKit ;
 *  · le texte d'une PHOTO ou d'une capture d'écran, par la reconnaissance de texte d'Apple.
 * Il n'existe que dans un binaire construit APRÈS lui : sur le build (22), `lecteurDisponible()`
 * rend `false` et l'écran Courses garde sa clôture d'avant. C'est voulu : ce fichier vit sur
 * `main` sans toucher l'empreinte native, donc sans couper la ligne OTA.
 *
 * ⚠️ Les `require` sont PARESSEUX et protégés : sous vitest (et sur le web), ni `expo` natif ni
 * le sélecteur d'images ne se chargent, et le lecteur se dit simplement absent.
 */

export type SourceTicket = 'pdf' | 'photo' | 'image';

interface ModuleTicket {
  /** Présente le sélecteur de fichiers ; rend le texte du PDF choisi, ou `null` si annulé. */
  choisirEtLirePdf(): Promise<string | null>;
  /** Rend le texte reconnu sur une image (fichier local). */
  texteDeLImage(uri: string): Promise<string>;
}

let natif: ModuleTicket | null | undefined;

function module(): ModuleTicket | null {
  if (natif !== undefined) return natif;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    natif = Platform.OS === 'ios' ? (require('expo').requireOptionalNativeModule('KyrozTicket') as ModuleTicket | null) : null;
  } catch {
    natif = null;
  }
  return natif;
}

/** L'iPhone sait-il lire un ticket ? `false` sur tout binaire d'avant le lecteur, et sur le web. */
export function lecteurDisponible(): boolean {
  return !!module();
}

/**
 * Le texte d'un ticket, depuis la source choisie ; `null` si la personne a annulé.
 * Lève une erreur si la lecture échoue (fichier illisible) : à l'appelant de le dire.
 */
export async function lireTicketDepuis(source: SourceTicket): Promise<string | null> {
  const m = module();
  if (!m) return null;
  if (source === 'pdf') return m.choisirEtLirePdf();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ImagePicker = require('expo-image-picker');
  const r = source === 'photo'
    ? await ImagePicker.launchCameraAsync({ quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (r.canceled || !r.assets?.[0]?.uri) return null;
  return m.texteDeLImage(r.assets[0].uri);
}
