// Mock AsyncStorage en mémoire pour les tests vitest (lib/ uniquement).
const store = new Map<string, string>();

export default {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  // ⚠️ AJOUTÉES le 2026-08-27. Le code de production s'en sert depuis toujours
  // (`purgerSessionLocale`, `doLogout`), et leur absence ici ne se voyait pas : un
  // appel jetait, et le `try/catch` de l'appelant l'avalait. Un test de purge passait
  // donc au vert sans que rien ne soit purgé — un mock incomplet est un instrument
  // qui ment, pas une simplification.
  async getAllKeys(): Promise<string[]> {
    return [...store.keys()];
  },
  async multiRemove(keys: readonly string[]): Promise<void> {
    for (const k of keys) store.delete(k);
  },
};
