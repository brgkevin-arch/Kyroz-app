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
    // ── Délai par test : 30 s au lieu des 5 s par défaut (2026-08-06) ──────────
    //
    // Ce n'est pas un assouplissement pour faire taire un test capricieux : le 5 s
    // est la valeur par DÉFAUT de vitest, personne ne l'a jamais choisie pour cette
    // suite, et plusieurs tests d'ici simulent des CENTAINES de semaines de plans.
    //
    // Ce qui l'a révélé : `varieteFamille` > « le PREMIER plan servi n'est pas le
    // moins varié » est passé de 3 à 12 gabarits de référence — un élargissement
    // VOULU (à 3 profils, le verdict se jouait à trois plans près et le plus mince
    // décidait seul). Coût ×4, et la CI est tombée quatre fois de suite.
    //
    // ⚠️ LE PIÈGE EST QUE ÇA NE SE VOIT PAS EN LOCAL. Mesuré le 2026-08-06 :
    //   ce test          local 2 021 ms  →  CI 6 561 ms   (×3,25)
    // Sur un Mac il consomme 40 % du budget et paraît sain ; sur le runner GitHub il
    // est à 131 %. Tout test au-dessus de ~1,5 s en local est donc DÉJÀ à risque, et
    // aucun `npm test` local ne le dira.
    //
    // ⚠️ Et le moteur, lui, N'A PAS ralenti — vérifié avant de toucher à ce réglage,
    // parce que relever un délai est exactement le geste qui masquerait une vraie
    // régression : coût d'UN plan servi, 6 gabarits × 5 tirages, médiane
    // **14,7 ms avant / 14,6 ms après**. La contrainte « < 1 s » de CLAUDE.md §4
    // garde ses trois ordres de grandeur de marge.
    //
    // Les trois plus lourds au 2026-08-06 (local) : reroll « max renouvelle plus que
    // balanced » 2 518 ms · variété « PREMIER plan servi » 2 348 ms · goalLadder
    // « échéances tenables sans trou » 1 416 ms. Si l'un dépasse 8 s en local, c'est
    // le TEST ou le MOTEUR qu'il faut regarder, pas ce chiffre.
    testTimeout: 30_000,
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
