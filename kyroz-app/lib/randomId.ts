// ── Identifiant aléatoire, avec repli sans `crypto` ──────────────────────────
//
// Extrait de `lib/analytics.ts` le 2026-09-05, au moment d'en avoir un second
// consommateur (le nonce de Sign in with Apple, `lib/appleAuth.ts`) : deux
// copies de la même fonction auraient divergé à la première correction
// (`CLAUDE.md` §10, « une copie stockée que personne ne relit »).
//
// `crypto.randomUUID()` n'existe pas partout (vieux moteurs JS, environnements
// de test) — le repli manuel n'a PAS besoin d'être cryptographiquement sûr ici :
// dans les deux usages, la valeur sert à distinguer un rejeu, pas à protéger un
// secret à elle seule.
export function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
