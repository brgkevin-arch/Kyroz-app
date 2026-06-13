import AsyncStorage from '@react-native-async-storage/async-storage';

// Prénom de l'utilisateur — purement cosmétique (salutation sur l'écran Plan).
// Stocké en LOCAL uniquement (comme les photos), hors profil synchronisé : pas
// besoin de colonne Supabase ni de migration pour une donnée d'affichage.
const KEY = '@kyroz:firstName';

export async function saveFirstName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEY, name.trim());
}

export async function loadFirstName(): Promise<string> {
  return (await AsyncStorage.getItem(KEY)) ?? '';
}
