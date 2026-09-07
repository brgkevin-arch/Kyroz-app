// ── La version WEB : aucun bouton, aucun SDK importé ─────────────────────────
// Même raison que `lib/purchases.web.ts` et `lib/appleAuth.web.ts` : Kyroz vend
// et connecte par les stores, le web n'a ni bouton d'achat ni bouton Apple.
export function AppleSignInButton(_props: { onPress: () => void; disabled?: boolean }) {
  return null;
}
