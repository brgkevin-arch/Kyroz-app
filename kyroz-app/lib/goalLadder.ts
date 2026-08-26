import { MAX_PROJECTION_WEEKS, daysBetween } from './datedGoal';
import { DATE_IMPOSSIBLE } from './dateLabel';

// ── Échéances proposées pour un objectif daté (A27) ──────────────────────────
//
// La rangée « Échéance » offrait CINQ DURÉES FIGÉES — 4 / 8 / 12 / 16 / 24 semaines.
// Mesuré le 2026-08-03 sur les corps de référence : **4 sur 8 n'avaient aucune option
// tenable**, la première échéance réellement atteignable se situant entre 18 et
// 82 semaines. La personne choisissait donc dans une rangée où chaque option lui
// répondait « tu y arriveras après ta date ».
//
// Ici, les cinq durées sont DÉRIVÉES DU CORPS. Deux propriétés, et il faut les deux —
// la première seule donnerait une rangée honnête mais décorative :
//
//  1. **Chaque puce est tenable.** La première est l'échéance la plus courte que les
//     garde-fous laissent tenir ; les suivantes sont plus longues, donc plus faciles.
//  2. **Chaque puce est un plan DIFFÉRENT.** Sous une certaine durée, le plancher
//     d'énergie disponible borne le déficit : allonger l'échéance ne change alors
//     RIEN à l'assiette. Mesuré avant ce garde-fou : sur `F 70 → 62`, les échéances
//     28, 36 et 46 semaines servaient les mêmes 1638 kcal — trois puces pour un seul
//     plan. C'est exactement le défaut A23 (« un réglage qui ne pilote rien »), et
//     c'est pour ça que l'échelle ne se calcule pas en arithmétique pure : elle
//     INTERROGE le moteur.
//
// ⚠️ Ce module ne réplique AUCUNE formule du moteur (CLAUDE.md §10). Il reçoit une
// sonde (`LadderProbe`) qui, elle, appelle `datedGoalStatus` + `computePlan`. Même
// principe d'injection que `WeeklyProjector` dans `datedGoal.ts`, et pour la même
// raison : le calcul reste testable, et il n'existe qu'un seul cerveau.

/** Ce que le moteur ferait vraiment d'une échéance donnée. Cf. `profil.tsx`. */
export interface LadderProbeResult {
  /** L'échéance est-elle tenue au rythme sûr ? (`DatedGoalStatus.reachableByDate`) */
  reachable: boolean;
  /** Calories réellement SERVIES par le plan à cette échéance (plancher compris). */
  servedKcal: number;
}
export type LadderProbe = (weeks: number) => LadderProbeResult;

/** Nombre de puces visé. Cinq, comme la rangée figée qu'elle remplace. */
export const LADDER_SIZE = 5;

/**
 * Étalement des puces au-delà de la première, en multiples de l'échéance minimale.
 * Le rapport de 3 entre la plus courte et la plus longue reprend celui de l'ancienne
 * rangée (4 → 24 semaines valait 6, mais ses deux premières durées ne tenaient
 * quasiment jamais : l'amplitude UTILE était bien plus étroite).
 */
const FACTEURS = [1, 1.3, 1.7, 2.2, 3.0];

/**
 * Arrondi LISIBLE. Personne ne choisit « 37 semaines » : au-delà de quelques mois, la
 * précision à la semaine est du bruit, et elle donne à la rangée un air de résultat de
 * calcul plutôt que de choix. La granularité grossit avec la durée.
 */
export function readableWeeks(w: number): number {
  if (w <= 20) return Math.round(w);
  if (w <= 52) return Math.round(w / 2) * 2;
  return Math.round(w / 4) * 4;
}

/** Plus petite semaine de `[lo, hi]` qui satisfait `ok`, en supposant `ok` monotone. */
function firstWhere(lo: number, hi: number, ok: (w: number) => boolean): number {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid; else lo = mid + 1;
  }
  return lo;
}

/**
 * Les échéances à proposer, en semaines — croissantes, toutes tenables, toutes
 * distinctes par le plan qu'elles servent.
 *
 * Renvoie un tableau VIDE quand rien n'est tenable dans l'horizon de projection :
 * le poids visé est alors hors de portée quelle que soit la date, et c'est la phrase
 * sous la rangée qui doit le dire — pas une rangée vide. L'appelant retombe sur
 * l'échelle figée, qui redevient un simple sélecteur de date.
 *
 * ⚠️ Le coût est en appels de sonde, et chacun simule jusqu'à 260 semaines de
 * trajectoire : l'appelant DOIT mémoïser sur (profil, poids cible). Recalculer à
 * chaque frappe rendrait la saisie du poids saccadée.
 */
export function deadlineLadder(probe: LadderProbe, maxWeeks = MAX_PROJECTION_WEEKS): number[] {
  // Chaque sonde simule jusqu'à 260 semaines : les deux dichotomies repassent sur les
  // mêmes semaines, et on ne les paie qu'une fois.
  const vu = new Map<number, LadderProbeResult>();
  const sonde = (w: number) => {
    let r = vu.get(w);
    if (!r) { r = probe(w); vu.set(w, r); }
    return r;
  };

  // Rien de tenable même à l'horizon le plus lointain → pas d'échelle honnête possible.
  const plafond = sonde(maxWeeks);
  if (!plafond.reachable) return [];

  // 1. La plus courte échéance qui tienne. C'est la puce « le plus vite possible ».
  const wmin = firstWhere(1, maxWeeks, (w) => sonde(w).reachable);
  const kcalMin = sonde(wmin).servedKcal;

  // 2. La plus courte échéance qui serve un plan DIFFÉRENT de celui du rythme maximal.
  //    En deçà, le plancher de sécurité borne le déficit et toutes les durées se
  //    valent : les proposer serait offrir cinq fois le même choix.
  //
  //    ⚠️ Le test est « différent », pas « supérieur », et ce n'est pas un détail de
  //    style : en PRISE de masse, allonger l'échéance fait BAISSER les calories
  //    servies (le surplus se dilue). Un test orienté perte y serait toujours faux,
  //    donc `wLibre` retomberait sur `wmin` et l'échelle marcherait par accident.
  const wLibre = kcalMin === plafond.servedKcal
    ? wmin // le plan ne bouge nulle part dans l'horizon : rien à décoller
    : firstWhere(wmin, maxWeeks, (w) => sonde(w).servedKcal !== kcalMin);

  // 3. Les quatre autres s'étalent à partir de là. On garde l'étalement
  //    multiplicatif tant qu'il tient dans l'horizon, sinon on répartit linéairement.
  const base = Math.max(wmin, wLibre);
  const dernier = FACTEURS[FACTEURS.length - 1] * base;
  const suite = dernier <= maxWeeks
    ? FACTEURS.map((f) => base * f)
    : FACTEURS.map((_, i) => base + ((maxWeeks - base) * i) / (FACTEURS.length - 1));

  const out: number[] = [wmin];
  for (const brut of suite) {
    if (out.length >= LADDER_SIZE) break;
    let v = Math.min(readableWeeks(brut), maxWeeks);
    // Strictement croissant : l'arrondi lisible peut faire retomber deux facteurs
    // voisins sur la même valeur, et deux puces identiques ne sont pas un choix.
    if (v <= out[out.length - 1]) v = out[out.length - 1] + 1;
    if (v > maxWeeks) break;
    out.push(v);
  }
  return out;
}

// ── Libellé d'une échéance ───────────────────────────────────────────────────

const SEMAINES_PAR_MOIS = 52 / 12;

/**
 * « 12 sem », « 14 mois », « 3,5 ans » — selon la durée.
 *
 * Une échelle dérivée du corps peut légitimement proposer 216 semaines : c'est un
 * chiffre juste et illisible. La date exacte reste affichée sous la rangée, donc
 * rien ne se perd à arrondir le libellé.
 */
export function formatHorizon(weeks: number): string {
  if (weeks <= 52) return `${weeks} sem`;
  const mois = Math.round(weeks / SEMAINES_PAR_MOIS);
  if (mois < 24) return `${mois} mois`;
  const ans = Math.round((mois / 12) * 10) / 10;
  return `${String(ans).replace('.', ',')} ans`;
}

// ── Une échéance SAISIE À LA MAIN (2026-08-07) ───────────────────────────────
//
// La rangée ci-dessus est honnête, mais elle ne propose que cinq dates — et « je
// me marie le 14 novembre » n'en fait pas partie. Les puces restent le chemin
// recommandé (chacune tient, chacune pilote) ; la date libre existe pour un vrai
// événement, qui ne tombe jamais sur un multiple de semaines.
//
// ⚠️ Aucun garde-fou du moteur ne dépend de la façon dont la date est ARRIVÉE :
// `datedGoalStatus` reçoit un stamp, plafonne le rythme (modulé par l'adiposité),
// laisse le plancher d'énergie disponible mordre en aval, et depuis A15 sert le
// maximum SÛR quand la date ne tient pas. Une date saisie ne peut donc pas ouvrir
// une porte que les puces fermaient. Ce qui suit ne refuse que les échéances dont
// l'app ne peut rien dire de vrai.

export type EcheanceRefus = 'incomplete' | 'impossible' | 'passee' | 'trop_loin';

/** Horizon de projection en ANNÉES — dérivé, pas recopié (cf. `MAX_PROJECTION_WEEKS`). */
export const HORIZON_ANS = Math.round(MAX_PROJECTION_WEEKS / 52);

/**
 * L'échéance saisie est-elle exploitable ? `null` = oui, on peut l'enregistrer.
 *
 * Deux refus de fond seulement, et chacun couvre un MENSONGE — pas une maladresse :
 *
 *  • `passee` — à échéance nulle ou dépassée, `datedGoalStatus` rend `active: false` :
 *    l'objectif serait enregistré et ne piloterait **rien**, en silence. Ce cas n'est
 *    pas qu'une faute de frappe : c'est l'objectif qu'on ré-ouvre après sa date.
 *
 *  • `trop_loin` — au-delà de l'horizon de simulation, le moteur fait l'INVERSE de ce
 *    qu'on lui demande, et c'est mesuré (2026-08-07, `TODAY` = 2026-08-07) :
 *
 *      F 78 → 65 kg · échéance à 5 ans (260 sem) → **−55 kcal/j** servis, arrivée 2031
 *                   · échéance à 267 sem         → **−418 kcal/j**, arrivée mai 2027
 *      H 80 → 74 kg · 5 ans → −25 kcal/j  ·  274 sem → **−298 kcal/j**
 *
 *    La cause n'est pas un bug : passé 260 semaines, la simulation ne peut plus
 *    atteindre la cible dans son horizon, donc `reachableByDate` tombe, donc A15
 *    conclut « la date ne tient pas » et sert le rythme sûr MAXIMAL. Demander une
 *    échéance très lointaine ferait donc creuser au maximum — le contraire de
 *    l'intention. La bascule se situe quelques semaines APRÈS l'horizon et sa position
 *    dépend du corps : on coupe à l'horizon, qui est le seul point défendable (au-delà,
 *    l'app n'a plus de projection à opposer à la date).
 *    ℹ️ Aucune régression existante : la rangée de puces ne dépasse jamais l'horizon.
 *    C'est une porte que la saisie libre OUVRIRAIT, et qu'on referme avec elle.
 *
 * ⚠️ Rien ne refuse une date TRÈS proche, et c'est délibéré. Sous une semaine,
 * `datedGoalStatus` raisonne sur une semaine pleine (son garde-fou de division) :
 * mesuré, 1 / 3 / 7 jours servent exactement le même plan et la même date d'arrivée.
 * L'échéance est donc servie honnêtement, et la phrase sous la rangée annonce l'arrivée
 * réelle (« au rythme sûr, Kyroz t'y amène plutôt vers le … »). Refuser reviendrait à
 * interdire une question à laquelle l'app sait très bien répondre — et à le faire sur
 * le ton du reproche, ce que CLAUDE.md §10 écarte.
 */
export function checkEcheance(
  stamp: string | undefined,
  /** La saisie porte-t-elle ses trois nombres ? (cf. `components/DateInput.tsx`) */
  complete: boolean,
  today: string,
): EcheanceRefus | null {
  if (!complete) return 'incomplete';
  if (!stamp) return 'impossible';
  const jours = daysBetween(today, stamp);
  if (jours <= 0) return 'passee';
  if (jours > MAX_PROJECTION_WEEKS * 7) return 'trop_loin';
  return null;
}

/**
 * Message utilisateur (FR) — même patron que `safety.ts::eligibilityMessage`.
 * Ton : on dit ce que l'app sait faire, jamais que la personne demande trop.
 */
export function messageEcheance(r: EcheanceRefus): string {
  switch (r) {
    case 'incomplete': return 'Complète la date : jour, mois et année.';
    case 'impossible': return DATE_IMPOSSIBLE;
    case 'passee': return 'Choisis une date à venir : Kyroz ne peut pas piloter vers une échéance déjà passée.';
    case 'trop_loin': return `Kyroz ne projette pas au-delà de ${HORIZON_ANS} ans. Choisis une date plus proche.`;
  }
}
