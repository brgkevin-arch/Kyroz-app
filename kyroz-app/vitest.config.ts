import { defineConfig } from 'vitest/config';
import path from 'path';

// Tests de la LOGIQUE PURE (lib/) uniquement — pas de runtime React Native.
// AsyncStorage est remplacé par un mock en mémoire (test/asyncStorageMock.ts), et
// `react-native` lui-même par un mock minimal (test/reactNativeMock.ts) : vitest ne
// sait pas parser la source du paquet (annotée Flow), ce qui rendait INTESTABLE tout
// fichier de `lib/` qui l'importe. `lib/purchases.ts` décide qui paie — il ne pouvait
// pas rester hors tests comme `exportData` et `notifications`.
export default defineConfig({
  test: {
    include: ['lib/__tests__/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'test/asyncStorageMock.ts'
      ),
      'react-native': path.resolve(__dirname, 'test/reactNativeMock.ts'),
    },
  },
});
