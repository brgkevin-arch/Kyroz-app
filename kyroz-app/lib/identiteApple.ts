// ── « Ce compte vient-il de Sign in with Apple ? » ───────────────────────────
//
// 🔴 POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST À PART DE `lib/appleAuth.ts` :
// ce dernier est résolu PAR PLATEFORME (`appleAuth.web.ts` le remplace sur le
// navigateur, cf. sa note d'en-tête). Toute fonction qu'on y ajoute doit donc être
// recopiée dans le fichier web, sinon elle vaut `undefined` en production web — et
// personne ne le verrait avant l'exécution. Celle-ci ne parle à aucun SDK : c'est une
// lecture de session, elle n'a rien à faire derrière une résolution de plateforme.
//
// PUR, sans aucun import — donc testable sous vitest, comme `lib/otaFiches.ts` et
// `lib/collapsingTitle.ts`.

/** Ce que Supabase pose sur un utilisateur, réduit à ce qu'on lit ici. */
export interface UtilisateurIdentifiable {
  app_metadata?: {
    provider?: string | null;
    providers?: string[] | null;
  } | null;
}

/**
 * Vrai si la session courante a été ouverte par Sign in with Apple.
 *
 * 🔴 **CE PRÉDICAT DÉCIDE SI L'ÉTAPE 1 DE L'INSCRIPTION BLOQUE**, et c'est la moitié
 * du correctif du rejet Apple du 2026-09-10 (guideline 4). L'autre moitié — demander
 * le scope `FULL_NAME` et le persister aussitôt (`lib/appleAuth.ts`,
 * `hooks/useAuth.tsx`) — ne suffit PAS toute seule : Apple ne renvoie le nom qu'à la
 * **toute première** autorisation du compte. Un relecteur qui réessaie une deuxième
 * fois, un réinstall, un second appareil → `fullName: null`, et le champ prénom
 * redevient un mur. Sans ce prédicat, le rejet se reproduirait à l'identique sur le
 * chemin le plus probable d'une CONTRE-vérification.
 *
 * ⚠️ **On lit les DEUX champs, pas seulement `provider`.** Un compte peut porter
 * plusieurs identités (e-mail lié après coup) : `provider` ne nomme alors que la
 * dernière employée, quand `providers` les liste toutes. Ne lire que la première
 * ferait retomber sur le champ bloquant quelqu'un qui a bel et bien Apple sur son
 * compte — un défaut invisible ici, mesurable seulement chez lui.
 *
 * ⚠️ **Le sens du repli est CHOISI** : sans métadonnées lisibles, on répond `false`,
 * donc le champ prénom reste exigé. C'est le repli qui dégrade l'expérience plutôt que
 * de servir une salutation vide — et il ne concerne que des comptes non-Apple, puisque
 * Supabase pose toujours `provider` sur une identité fédérée.
 */
export function estIdentiteApple(utilisateur: UtilisateurIdentifiable | null | undefined): boolean {
  const meta = utilisateur?.app_metadata;
  if (!meta) return false;
  if (meta.provider === 'apple') return true;
  return Array.isArray(meta.providers) && meta.providers.includes('apple');
}
