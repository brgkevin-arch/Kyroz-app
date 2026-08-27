import { purgeAllProgressPhotos } from './photos';
import { cancelWeighInReminder } from './notifications';
import { EffetsPurge } from './sessionLocale';

// ── La composition RÉELLE de la purge de session ─────────────────────────────
//
// Ce fichier ne contient aucune décision : il branche les deux effets que
// `lib/sessionLocale.ts` réclame, et rien d'autre.
//
// ⚠️ **IL EXISTE PARCE QU'IL NE DOIT ÊTRE IMPORTÉ PAR AUCUN FICHIER TESTÉ DE `lib/`.**
// `photos.ts` et `notifications.ts` tirent `expo-image-picker`, `expo-file-system` et
// `expo-notifications` ; la suite vitest ne charge pas le runtime Expo (cf.
// `vitest.config.ts` : « pas de runtime React Native »). Mesuré : brancher ces deux
// effets directement dans `sessionLocale.ts` faisait tomber `sync.test.ts`,
// `syncSignal.test.ts` et `profileCols.test.ts` sur `__DEV__ is not defined` — donc ça
// rendait intestable le fichier qui porte la garde d'identité de 01-01.
//
// ➡️ Seul `hooks/useAuth.tsx` l'importe : c'est la racine de composition de la session,
// et le seul endroit qui connaisse à la fois la déconnexion et l'hydratation. Le
// couplage est COMPTÉ par `lib/__tests__/heritageDeCompte.test.ts` — sans ça, quelqu'un
// pourrait passer un objet d'effets vides et la purge deviendrait décorative.
export const EFFETS_PURGE: EffetsPurge = {
  photos: purgeAllProgressPhotos,
  notificationPesee: cancelWeighInReminder,
};
