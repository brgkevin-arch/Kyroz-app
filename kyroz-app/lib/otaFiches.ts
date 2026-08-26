/**
 * La dernière OTA publiée est écrite à DEUX endroits — ce module les LIT.
 *
 * 🔴 **POURQUOI CE FICHIER EXISTE** (2026-08-26). `STORE-RELEASE.md` annonçait
 * encore la **21ᵉ** OTA alors que la 22ᵉ était partie la veille : elle n'avait été
 * consignée que dans la ligne « OTA publiées » d'`AGENTS.md`. Les deux fiches
 * décrivent le même fait, elles dérivent librement, et **la première à mentir est
 * celle qu'on lit pour décider quoi soumettre à Apple**. C'est la famille du
 * compteur d'émojis et du décompte d'OTA tenu à la main : un inventaire écrit à
 * deux endroits sans compteur se confirme tout seul.
 *
 * ⚠️ **CE QU'IL NE SAIT PAS FAIRE, et c'est sa vraie limite** : deux fiches
 * peuvent être parfaitement d'accord et **fausses toutes les deux** — il suffit
 * qu'une session publie une OTA sans documenter ni l'une ni l'autre. Ce module
 * compare deux COPIES ; il ne dit pas si elles disent le VRAI. Seul EAS le dit,
 * et ça demande le réseau : c'est `npm run check:ota`, exactement comme
 * `check:migrations` existe parce que le dépôt ne sait rien de la prod.
 *
 * Aucun import : il est lu par un test ET par un script, donc il doit rester pur.
 */

export type FicheOta = {
  /** Le rang de la dernière OTA (23 pour la 23ᵉ). */
  numero: number;
  /** Les 8 premiers caractères de l'identifiant de groupe EAS. */
  groupe: string;
  /** Le commit publié, tel qu'il est cité (7 caractères ou plus). */
  commit: string;
};

/** Les trois champs comparés, dans l'ordre où on les lit. */
export const CHAMPS_OTA = ['numero', 'groupe', 'commit'] as const;

// Le groupe et le commit s'écrivent pareil dans les deux fiches ; seul le rang
// diffère de tournure, d'où deux motifs et non un.
const GROUPE = /groupe\s+`([0-9a-f]{8})`/;
const COMMIT = /commit\s+\*{0,2}`([0-9a-f]{7,40})`/;

/**
 * La ligne « OTA publiées » de la table de référence d'`AGENTS.md`.
 *
 * 🔴 **L'ANCRAGE EST LE POINT DÉLICAT, ET LE PIÈGE EST DÉJÀ ARMÉ DANS LE FICHIER.**
 * `AGENTS.md` porte **un autre numéro de groupe plus haut** (une note datée qui
 * cite une OTA de 2026-08-21). Chercher « le premier groupe du fichier » se
 * verrouillerait dessus et resterait **vert à vie**, en mesurant une phrase que
 * personne ne touche jamais — la sonde aurait l'air de marcher et regarderait
 * ailleurs. On s'ancre donc sur la LIGNE de la table, jamais sur le fichier.
 */
export function ligneOtaAgents(md: string): string | null {
  const l = md.split('\n').find((x) => x.startsWith('| OTA publiées |'));
  return l ?? null;
}

/**
 * La puce « **OTA** : » de `STORE-RELEASE.md`, qui court sur plusieurs lignes.
 * Elle se termine à la ligne vide : l'historique des OTA précédentes vit DEDANS,
 * donc la valeur courante est toujours la première rencontrée.
 */
export function blocOtaStore(md: string): string | null {
  const i = md.indexOf('- **OTA** : la dernière est la');
  if (i < 0) return null;
  const fin = md.indexOf('\n\n', i);
  return md.slice(i, fin < 0 ? undefined : fin);
}

const premier = (motif: RegExp, texte: string): string | null => texte.match(motif)?.[1] ?? null;

/** `**23 — la 23ᵉ publiée le …** (groupe `…`, …, commit **`…`**` */
export function lireAgents(md: string): FicheOta | null {
  const ligne = ligneOtaAgents(md);
  if (!ligne) return null;
  // Le rang est écrit DEUX fois — le total publié, puis l'ordinal de celle-ci.
  // Ils valent le même nombre par construction ; les lire tous les deux fait de
  // leur désaccord un échec au lieu d'un détail invisible.
  const rangs = ligne.match(/\*\*(\d+)\s*—\s*la\s+(\d+)ᵉ/);
  const groupe = premier(GROUPE, ligne);
  const commit = premier(COMMIT, ligne);
  if (!rangs || !groupe || !commit) return null;
  if (rangs[1] !== rangs[2]) return null;
  return { numero: Number(rangs[2]), groupe, commit };
}

/** `- **OTA** : la dernière est la **23ᵉ** (groupe `…`, …), publiée sur le commit `…`` */
export function lireStore(md: string): FicheOta | null {
  const bloc = blocOtaStore(md);
  if (!bloc) return null;
  const rang = premier(/la dernière est la\s+\*\*(\d+)ᵉ\*\*/, bloc);
  const groupe = premier(GROUPE, bloc);
  const commit = premier(COMMIT, bloc);
  if (!rang || !groupe || !commit) return null;
  return { numero: Number(rang), groupe, commit };
}

/**
 * Les désaccords entre les deux fiches, en clair. Une liste vide = elles
 * racontent la même OTA.
 *
 * ⚠️ Une fiche ILLISIBLE n'est pas un accord : c'est un désaccord bruyant. Sans
 * ça, un changement de tournure ferait rendre `null` des deux côtés et le
 * contrôle passerait au vert en ne mesurant plus rien — le défaut exact que
 * `check:migrations` évite en refusant une liste de colonnes vide.
 */
export function desaccords(agents: FicheOta | null, store: FicheOta | null): string[] {
  if (!agents && !store) return ['AGENTS.md et STORE-RELEASE.md sont tous deux illisibles'];
  if (!agents) return ['la ligne « OTA publiées » d’AGENTS.md est illisible'];
  if (!store) return ['la puce « **OTA** : » de STORE-RELEASE.md est illisible'];
  return CHAMPS_OTA.filter((c) => String(agents[c]) !== String(store[c])).map(
    (c) => `${c} : AGENTS.md dit « ${agents[c] as string | number} », STORE-RELEASE.md dit « ${store[c] as string | number} »`,
  );
}
