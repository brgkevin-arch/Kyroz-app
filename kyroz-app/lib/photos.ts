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

/**
 * Ce que Kyroz promet — et ce qu'il ne promet PAS — sur les photos de progression.
 *
 * 🔴 **SOURCE UNIQUE, depuis le 2026-08-26.** Cette phrase vivait en TROIS copies :
 * `Transformation::PhotoCompare`, `WeightCheckin` et l'écran de vente `kyroz-plus`,
 * la dernière dans une variante légèrement différente. Trois textes qui disent la
 * même chose sont trois textes libres de diverger sans que personne ne le voie —
 * c'est l'histoire du `disclaimer` recopié sept fois (CLAUDE.md §8), reprise.
 *
 * ⚠️ Elle porte DEUX faits, et le second est le plus important : les photos ne
 * quittent pas l'appareil, ET elles ne sont pas sauvegardées. Sur l'écran qui VEND,
 * taire cette fragilité serait un mensonge par omission (audit paywall 2026-08-25).
 * Ne pas raccourcir en « restent sur ton téléphone » : c'est ce qu'elle disait avant,
 * et c'était incomplet.
 */
export const PHOTOS_NOTICE_LOCALE =
  'Tes photos de progression restent sur ton téléphone, jamais envoyées — et ne sont pas sauvegardées : un changement de téléphone les perd.';
