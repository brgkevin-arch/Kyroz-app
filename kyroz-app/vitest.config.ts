import { defineConfig } from 'vitest/config';
import path from 'path';

// Tests de la LOGIQUE PURE (lib/) uniquement — pas de runtime React Native.
// AsyncStorage est remplacé par un mock en mémoire (test/asyncStorageMock.ts).
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
    },
  },
});
