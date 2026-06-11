import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ── Photos de progression (MVP local-only) ───────────────────────────────────
// RGPD : une photo de corps = donnée de santé sensible. Tant que le premium et le
// consentement explicite ne sont pas en place, les photos restent SUR L'APPAREIL
// (stockées hors des données synchronisées). Aucun upload cloud ici.

export type PhotoSource = 'camera' | 'library';

/** Ouvre la galerie ou l'appareil photo, renvoie l'URI locale (ou null si annulé/refusé). */
export async function pickProgressPhoto(source: PhotoSource): Promise<string | null> {
  // Permissions (sur natif uniquement ; le web utilise l'input fichier du navigateur).
  if (Platform.OS !== 'web') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.6,
    allowsEditing: true,
    aspect: [3, 4],
  };

  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (res.canceled || !res.assets || res.assets.length === 0) return null;
  return res.assets[0].uri;
}

export const cameraAvailable = Platform.OS !== 'web';
