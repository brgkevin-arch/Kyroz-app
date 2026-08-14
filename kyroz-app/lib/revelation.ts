// ── Dévoiler une longue liste par paliers ────────────────────────────────────
//
// Décision fondateur du 2026-08-14 : « dans les recettes que l'on peut faire, en
// mettre 8 puis passer aux presque. Et si on veut plus de 8, on met "voir + de
// recettes". Pareil pour les 512 recettes : 10, puis voir +, puis 10, puis voir +,
// et après voir tout. »
//
// 🔴 CE FICHIER N'IMPORTE RIEN, ET C'EST LA CONDITION DE SON EXISTENCE. Le même
// procédé que `lib/tours.ts`, `lib/collapsingTitle.ts` et `lib/motion.ts` : la
// décision est une fonction PURE, donc testable, et l'écran ne fait que la rendre.
// Trois listes s'en servent (recettes prêtes, presque prêtes, catalogue) — trois
// copies de la même arithmétique auraient divergé à la première retouche, et c'est
// exactement ce que §8 appelle « un style recopié partout est un rôle sans nom ».
//
// ⚠️ CE QUE ÇA N'EST PAS : une pagination. Rien n'est chargé à la demande, tout le
// catalogue est déjà en mémoire (il est embarqué dans le bundle, CLAUDE.md §3). On
// ne réduit pas un coût réseau, on réduit ce qu'on DEMANDE À L'ŒIL : 512 cartes
// servies d'un coup, ce n'est pas une liste, c'est un mur.

/** Ce que le bouton du bas propose, ou `null` quand il n'y a plus rien à montrer. */
export type ActionRevelation = 'plus' | 'tout' | null;

export interface EtatRevelation {
  /** Combien d'éléments l'écran affiche. */
  visibles: number;
  /** Combien restent cachés — c'est le chiffre que le bouton doit dire. */
  reste: number;
  action: ActionRevelation;
}

/**
 * Combien de « Voir + » avant que le bouton ne devienne « Voir tout ».
 *
 * ⚠️ Deux, et c'est le chiffre du fondateur, pas un réglage esthétique : au-delà,
 * atteindre la fin d'un catalogue de 512 demanderait cinquante appuis. Le palier
 * « tout » n'est pas un raccourci de confort, c'est ce qui empêche la liste d'être
 * un cul-de-sac.
 */
export const PALIERS_AVANT_TOUT = 2;

/**
 * @param total  la taille réelle de la liste
 * @param pas    combien on montre au départ, et combien chaque « Voir + » ajoute
 * @param appuis combien de fois « Voir + » a été pressé
 * @param tout   « Voir tout » a été pressé — plus aucun palier ne s'applique
 */
export function revelation(total: number, pas: number, appuis: number, tout: boolean): EtatRevelation {
  // Bornes défensives : un `pas` nul rendrait une liste vide qui a l'air pleine,
  // et un compteur d'appuis négatif viendrait forcément d'un état corrompu.
  const p = Math.max(1, Math.floor(pas));
  const n = Math.max(0, Math.floor(appuis));
  const t = Math.max(0, Math.floor(total));

  if (tout) return { visibles: t, reste: 0, action: null };

  const visibles = Math.min(t, p * (1 + n));
  const reste = t - visibles;

  if (reste === 0) return { visibles, reste: 0, action: null };
  // ⚠️ « Voir + » ne s'affiche PAS quand il montrerait déjà tout le reste : le
  // bouton doit dire ce qu'il fait. Promettre « + de recettes » pour en révéler
  // les trois dernières est un petit mensonge d'interface, et c'est la règle
  // §10 — un libellé affiché est celui qui sera tenu.
  const action: ActionRevelation = n >= PALIERS_AVANT_TOUT || reste <= p ? 'tout' : 'plus';
  return { visibles, reste, action };
}

/**
 * Le libellé du bouton. Il vit ici et pas dans l'écran : les trois listes doivent
 * dire la même chose, et le RESTE doit y figurer — « Voir tout » sans son chiffre
 * ne dit pas si on ouvre trois cartes ou quatre cent quatre-vingts.
 */
export function libelleRevelation(action: ActionRevelation, reste: number, nom = 'recettes'): string {
  if (action === 'plus') return `Voir + de ${nom}`;
  if (action === 'tout') return `Voir les ${reste} restantes`;
  return '';
}
