import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

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


// ── La carte et les OCTETS ne partaient pas ensemble ─────────────────────────
//
// 🔴 LE DÉFAUT MESURÉ, le 2026-08-27. `expo-image-picker` écrit dans le
// répertoire de CACHE de l'app — iOS `cachesDirectory/ImagePicker`, Android
// `cacheDirectory` — et rien ici ne recopiait le fichier ailleurs : `setPhoto`
// n'enregistre qu'une carte `date → URI`. « Supprimer définitivement » effaçait
// la carte et laissait les octets. Des photos de corps, donnée de santé
// sensible, restaient en clair dans le bac à sable de l'app — sans plus aucune
// référence pour les retrouver, donc sans plus aucun moyen de les effacer.
//
// ⚠️ La clé vit ICI, avec les fonctions qui effacent les fichiers : un seul
// propriétaire pour la carte ET pour ce qu'elle désigne. `useWeightLog` l'importe.

export const PHOTOS_KEY = '@kyroz:weightPhotos';

/**
 * Efface les octets d'une photo. Silencieux : un fichier déjà parti — le cache
 * est purgeable par l'OS — n'est pas une erreur.
 *
 * ⚠️ On ne touche QUE ce qui est à nous. Sur web l'URI est un `blob:`/`data:`,
 * il n'y a pas de fichier ; et un `ph://` désigne la photo de l'utilisateur dans
 * SA photothèque, pas notre copie. Les effacer serait détruire son album.
 */
export function deleteProgressPhoto(uri: string | null | undefined): void {
  if (Platform.OS === 'web' || !uri || !uri.startsWith('file://')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}

/**
 * Efface TOUTES les photos de progression — octets compris — puis retire la carte.
 *
 * ⚠️ Elle lit la carte elle-même, exprès : l'appelant n'a pas à connaître la clé,
 * donc il ne peut pas l'oublier. Et elle doit tourner AVANT toute purge du
 * stockage — après, la carte a disparu et les fichiers sont introuvables.
 *
 * Les deux chemins de sortie l'appellent, y compris la déconnexion : les photos
 * ne sont jamais poussées au cloud, donc elles ne reviennent pas à la
 * reconnexion. Les laisser serait garder des octets que plus rien ne désigne.
 */
export async function purgeAllProgressPhotos(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PHOTOS_KEY);
    if (raw) {
      const carte = JSON.parse(raw) as Record<string, string>;
      for (const uri of Object.values(carte)) deleteProgressPhoto(uri);
    }
  } catch {}
  try { await AsyncStorage.removeItem(PHOTOS_KEY); } catch {}
}
