// Mock minimal de `react-native` pour les tests de LOGIQUE PURE.
//
// Pourquoi il existe : `vitest` ne sait pas parser `node_modules/react-native`
// (source annotée Flow). Résultat, tout fichier de `lib/` important `react-native`
// devenait INTESTABLE — et la parade a longtemps été de ne pas le tester du tout
// (`lib/exportData.ts`, `lib/notifications.ts` n'ont aucun test). `lib/purchases.ts`
// ne pouvait pas se le permettre : il décide qui paie.
//
// Même parti pris que `test/asyncStorageMock.ts` : on remplace la dépendance
// native par le strict minimum, déclaré dans `vitest.config.ts`.
//
// ⚠️ `Platform.OS` vaut **`ios`** par défaut, volontairement. Le mettre à `web`
// rendrait vert n'importe quel test de dormance : `purchasesConfigured()` y est
// faux quoi qu'il arrive, donc un test ne prouverait plus que la CLÉ est absente.
// Un test qui ne peut pas échouer ne protège rien.

export const Platform = {
  OS: 'ios' as 'ios' | 'android' | 'web',
  select: <T,>(specifics: { ios?: T; android?: T; web?: T; default?: T }): T | undefined =>
    specifics[Platform.OS] ?? specifics.default,
};

export const Share = {
  share: async () => ({ action: 'dismissedAction' as const }),
};

export const Linking = {
  openURL: async () => undefined,
  canOpenURL: async () => false,
};
