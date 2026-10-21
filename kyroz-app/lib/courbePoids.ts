// ── La courbe du poids, par période ──────────────────────────────────────────
//
// Décision fondateur du 2026-10-21, sur la capture d'une app de composition
// corporelle : le suivi du poids devient un ONGLET à lui (il remplace « Profil »),
// avec une courbe qu'on lit par période — Mois · 3 mois · 6 mois · Année · Tout —
// et des flèches pour remonter dans le temps.
//
// 🔴 CE FICHIER N'IMPORTE RIEN, ET C'EST LA CONDITION DE SON EXISTENCE. Même procédé
// que `lib/revelation.ts` ou `lib/collapsingTitle.ts` : tout ce qui DÉCIDE (quelle
// fenêtre, quels points, quel trait en pointillés, quel écart) est une fonction pure,
// donc testée ; `components/CourbePoids.tsx` ne fait que dessiner ce qu'elle rend.
//
// Trois règles, et chacune est une règle de §10 (« pas de mensonge », « rassurer ») :
//
// 1. **Un POINTILLÉ veut dire « pas de pesée entre ces deux points ».** La ligne
//    continue affirme qu'on a suivi le poids ; elle ne peut pas l'affirmer à travers
//    un mois sans balance. Le seuil suit la cadence choisie par la personne : se peser
//    toutes les quatre semaines n'est pas un trou, c'est le rythme.
//    ⚠️ Sur les points MOYENS aussi, l'écart se mesure entre les PESÉES qui bordent le
//    trait (la dernière du mois A, la première du mois B) — pas entre les mois. Une
//    pesée le 1er décembre et la suivante le 26 janvier font deux mois « remplis » et
//    huit semaines sans balance : vu à l'écran le 2026-10-21, la ligne pleine mentait.
// 2. **Un point MOYEN se dit.** Sur un an, la courbe montre la moyenne de chaque mois
//    (comme la capture). Ce point n'est pas une pesée : l'écran l'écrit sous la courbe
//    (`agregation === 'mois'`), il ne le laisse pas deviner.
// 3. **L'échelle ne descend jamais sous 2 kg** (`ECART_AXE_MIN_KG`). Sans plancher, une
//    oscillation de 300 g — de l'eau, un repas salé — remplit toute la hauteur et se
//    lit comme une falaise. Une zone, pas une ligne au pixel près (§10).

/** Une pesée, telle que `lib/weight.ts` la stocke — recopiée pour ne rien importer. */
export interface Pesee { date: string; weight_kg: number }

export type Periode = 'mois' | 'trimestre' | 'semestre' | 'annee' | 'tout';

/**
 * Les libellés du sélecteur. « 3 mois » / « 6 mois » plutôt que « Trimestre » /
 * « Semestre » (ceux de la capture) : cinq cases tiennent dans un iPhone, et le
 * nombre se lit sans traduire un mot.
 */
export const PERIODES: readonly { value: Periode; label: string }[] = [
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: '3 mois' },
  { value: 'semestre', label: '6 mois' },
  { value: 'annee', label: 'Année' },
  { value: 'tout', label: 'Tout' },
];

/** Durée de chaque période glissante, en mois. « Tout » n'en a pas. */
export const MOIS_PAR_PERIODE: Record<Exclude<Periode, 'tout'>, number> = {
  mois: 1, trimestre: 3, semestre: 6, annee: 12,
};

/** Hauteur minimale de l'axe des poids, en kg — cf. règle 3 en tête. */
export const ECART_AXE_MIN_KG = 2;

/**
 * Au-delà de cette durée, la courbe passe aux moyennes mensuelles. 200 jours : « 6 mois »
 * (≈ 183 j) reste en pesées, « Année » passe en mois.
 */
export const SEUIL_AGREGATION_JOURS = 200;

/** Le plus petit écart entre deux pesées qui compte comme un trou, en jours. */
export const TROU_MIN_JOURS = 14;

// ── Dates ────────────────────────────────────────────────────────────────────
// En jours UTC depuis l'époque : aucun changement d'heure ne fait sauter un jour.

const MS_JOUR = 86_400_000;
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const INITIALES = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const deux = (n: number) => String(n).padStart(2, '0');
function parse(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m, d];
}
export function versJour(s: string): number {
  const [y, m, d] = parse(s);
  return Math.round(Date.UTC(y, m - 1, d) / MS_JOUR);
}
export function versStamp(jour: number): string {
  const d = new Date(jour * MS_JOUR);
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}
const joursDansMois = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
/** Ajoute `n` mois (négatif possible) ; le 31 devient le dernier jour du mois visé. */
export function ajouterMois(s: string, n: number): string {
  const [y, m, d] = parse(s);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${deux(nm + 1)}-${deux(Math.min(d, joursDansMois(ny, nm)))}`;
}
const debutDuMois = (s: string) => `${s.slice(0, 7)}-01`;
const finDuMois = (s: string) => {
  const [y, m] = parse(s);
  return `${y}-${deux(m)}-${deux(joursDansMois(y, m - 1))}`;
};
/** Rang absolu d'un mois (année × 12 + mois). */
const rangMois = (s: string) => { const [y, m] = parse(s); return y * 12 + (m - 1); };

/** « 21 oct. », « 1er nov. » — la forme française du premier du mois. */
function jourMois(s: string): string {
  const [, m, d] = parse(s);
  return `${d === 1 ? '1er' : d} ${MOIS_COURTS[m - 1]}`;
}

// ── La fenêtre ───────────────────────────────────────────────────────────────

/** Une période de dates, bornes INCLUSES, au format 'YYYY-MM-DD'. */
export interface Fenetre { debut: string; fin: string }

/**
 * La fenêtre affichée. `decalage` = combien de fois on a reculé (0 = la plus récente).
 *
 * · Mois, 3 mois, 6 mois : GLISSANTES, elles finissent aujourd'hui. Une fenêtre calée
 *   sur le calendrier montrerait trois jours le 3 du mois.
 * · Année : calée sur les MOIS (du 1er d'il y a onze mois à aujourd'hui), parce que ses
 *   points sont des moyennes mensuelles — un mois coupé en deux serait une moyenne
 *   d'une moitié de mois présentée comme celle du mois.
 * · Tout : de la première pesée à aujourd'hui ; on ne recule pas.
 */
export function fenetre(periode: Periode, decalage: number, aujourdhui: string, premiere: string | null): Fenetre {
  if (periode === 'tout') {
    const debut = premiere && premiere < aujourdhui ? premiere : aujourdhui;
    // Au-delà du seuil, les points sont mensuels : même raison que l'année.
    const agrege = versJour(aujourdhui) - versJour(debut) > SEUIL_AGREGATION_JOURS;
    return { debut: agrege ? debutDuMois(debut) : debut, fin: aujourdhui };
  }
  const n = MOIS_PAR_PERIODE[periode];
  if (periode === 'annee') {
    const moisFin = ajouterMois(aujourdhui, -n * decalage);
    return {
      debut: debutDuMois(ajouterMois(moisFin, -(n - 1))),
      fin: decalage === 0 ? aujourdhui : finDuMois(moisFin),
    };
  }
  const fin = ajouterMois(aujourdhui, -n * decalage);
  return { debut: versStamp(versJour(ajouterMois(fin, -n)) + 1), fin };
}

/** Il existe une pesée plus ancienne que la fenêtre : la flèche ‹ a quelque chose à montrer. */
export function peutReculer(periode: Periode, debut: string, pesees: readonly Pesee[]): boolean {
  if (periode === 'tout') return false;
  return pesees.some((p) => p.date < debut);
}

/** « 22 sept. – 21 oct. 2026 », ou « 1er nov. 2025 – 21 oct. 2026 » à cheval sur deux ans. */
export function libelleFenetre(f: Fenetre): string {
  const ad = f.debut.slice(0, 4);
  const af = f.fin.slice(0, 4);
  return ad === af
    ? `${jourMois(f.debut)} – ${jourMois(f.fin)} ${af}`
    : `${jourMois(f.debut)} ${ad} – ${jourMois(f.fin)} ${af}`;
}

// ── La courbe ────────────────────────────────────────────────────────────────

/** Un point dessiné. `x` va de 0 (début de la fenêtre) à 1 (fin). */
export interface PointCourbe {
  x: number;
  kg: number;
  /** La pesée, ou le mois ('YYYY-MM') quand le point est une moyenne. */
  date: string;
  /** Combien de pesées ce point résume (1 hors agrégation). */
  n: number;
}

/** Un trait entre deux points. Les traits de bord partent du bord (x = 0 ou 1). */
export interface SegmentCourbe {
  x1: number; kg1: number; x2: number; kg2: number;
  /** Aucune pesée entre les deux bouts — cf. règle 1 en tête. */
  pointille: boolean;
}

/** Un repère vertical de l'axe du temps, avec son libellé (qui peut être vide). */
export interface Repere { x: number; libelle: string }

export interface Courbe {
  fenetre: Fenetre;
  /** `pesee` = chaque point est une pesée ; `mois` = chaque point est la moyenne d'un mois. */
  agregation: 'pesee' | 'mois';
  points: PointCourbe[];
  segments: SegmentCourbe[];
  /** Graduations de l'axe des poids, du bas vers le haut. */
  graduations: number[];
  /** Bornes de l'axe — la première et la dernière graduation. */
  min: number;
  max: number;
  reperes: Repere[];
  /** Nombre de pesées RÉELLES dans la fenêtre (pas de points moyens). */
  nbPesees: number;
  /**
   * Dernière pesée de la fenêtre moins la première, arrondi à 100 g. `null` sous deux
   * pesées. Lu sur les PESÉES, jamais sur les moyennes : c'est l'écart vécu.
   */
  ecartKg: number | null;
}

const arrondi1 = (v: number) => Math.round(v * 10) / 10;

/** Le seuil de trou, en jours, pour une cadence de pesée donnée (en jours). */
export function seuilTrou(cadenceJours: number): number {
  return Math.max(TROU_MIN_JOURS, Math.ceil(cadenceJours * 1.5));
}

/** Valeur au jour `j` sur le trait qui joint (ja, ka) à (jb, kb). */
const interpoler = (ja: number, ka: number, jb: number, kb: number, j: number) =>
  jb === ja ? kb : ka + ((kb - ka) * (j - ja)) / (jb - ja);

/**
 * Les graduations : un pas « rond » (0,5 · 1 · 2 · 5 · 10 · 20 kg) qui couvre l'étendue
 * en cinq intervalles au plus (six lignes), sur au moins `ECART_AXE_MIN_KG`.
 */
export function graduer(valeurs: readonly number[]): { graduations: number[]; min: number; max: number } {
  let bas = Math.min(...valeurs);
  let haut = Math.max(...valeurs);
  if (haut - bas < ECART_AXE_MIN_KG) {
    const milieu = (haut + bas) / 2;
    bas = milieu - ECART_AXE_MIN_KG / 2;
    haut = milieu + ECART_AXE_MIN_KG / 2;
  }
  const PAS = [0.5, 1, 2, 5, 10, 20, 50];
  const pas = PAS.find((p) => (Math.ceil(haut / p) - Math.floor(bas / p)) <= 5) ?? 50;
  const min = Math.floor(bas / pas) * pas;
  const max = Math.ceil(haut / pas) * pas;
  const graduations: number[] = [];
  for (let v = min; v <= max + pas / 1000; v += pas) graduations.push(Math.round(v * 10) / 10);
  return { graduations, min: graduations[0], max: graduations[graduations.length - 1] };
}

/** Les repères de l'axe du temps — leur grain suit la durée affichée. */
function reperesPour(f: Fenetre): Repere[] {
  const j0 = versJour(f.debut);
  const j1 = versJour(f.fin);
  const duree = Math.max(1, j1 - j0);
  const x = (j: number) => (j - j0) / duree;
  const out: Repere[] = [];
  if (duree <= 40) {
    // Une semaine par repère, en partant d'AUJOURD'HUI (le bord droit) vers le passé.
    for (let j = j1; j >= j0; j -= 7) out.unshift({ x: x(j), libelle: jourMois(versStamp(j)) });
    return out;
  }
  if (duree <= SEUIL_AGREGATION_JOURS) {
    // Le 1er de chaque mois, nommé en court (« sept. »).
    for (let m = rangMois(f.debut) + 1; m <= rangMois(f.fin); m++) {
      const s = `${Math.floor(m / 12)}-${deux((m % 12) + 1)}-01`;
      out.push({ x: x(versJour(s)), libelle: MOIS_COURTS[m % 12] });
    }
    return out;
  }
  if (duree <= 430) {
    // Le milieu de chaque mois, par son initiale (« N D J F… », comme la capture) —
    // c'est là que tombent les points moyens.
    for (let m = rangMois(f.debut); m <= rangMois(f.fin); m++) {
      out.push({ x: Math.min(1, Math.max(0, x(milieuDuMois(m)))), libelle: INITIALES[m % 12] });
    }
    return out;
  }
  // Plusieurs années : un repère par 1er janvier.
  for (let a = Number(f.debut.slice(0, 4)) + 1; a <= Number(f.fin.slice(0, 4)); a++) {
    out.push({ x: x(versJour(`${a}-01-01`)), libelle: String(a) });
  }
  return out;
}

/** Le jour du milieu d'un mois donné par son rang absolu. */
function milieuDuMois(rang: number): number {
  const y = Math.floor(rang / 12);
  const m0 = rang % 12;
  const debut = versJour(`${y}-${deux(m0 + 1)}-01`);
  return debut + (joursDansMois(y, m0) - 1) / 2;
}

/**
 * Un point avant agrégation : un jour, un poids, et ce qu'il résume. `premier` et
 * `dernier` = les jours de la première et de la dernière pesée résumées — c'est entre
 * eux que se mesure un trou.
 */
interface Brut { jour: number; kg: number; date: string; n: number; premier: number; dernier: number }

/** Moyennes mensuelles — un point au milieu de chaque mois qui a au moins une pesée. */
function parMois(pesees: readonly Pesee[]): Brut[] {
  const groupes = new Map<number, Pesee[]>();
  for (const p of pesees) {
    const r = rangMois(p.date);
    groupes.set(r, [...(groupes.get(r) ?? []), p]);
  }
  return [...groupes.entries()].sort((a, b) => a[0] - b[0]).map(([rang, ps]) => {
    const jours = ps.map((p) => versJour(p.date));
    return {
      jour: milieuDuMois(rang),
      kg: arrondi1(ps.reduce((s, p) => s + p.weight_kg, 0) / ps.length),
      date: `${Math.floor(rang / 12)}-${deux((rang % 12) + 1)}`,
      n: ps.length,
      premier: Math.min(...jours),
      dernier: Math.max(...jours),
    };
  });
}

/**
 * La courbe d'une période. `cadenceJours` = le rythme de pesée choisi (7 par défaut) :
 * il fixe ce qui compte comme un trou.
 */
export function courbe(
  pesees: readonly Pesee[],
  periode: Periode,
  decalage: number,
  aujourdhui: string,
  cadenceJours: number,
): Courbe {
  const triees = [...pesees].sort((a, b) => a.date.localeCompare(b.date));
  const f = fenetre(periode, decalage, aujourdhui, triees[0]?.date ?? null);
  const j0 = versJour(f.debut);
  const j1 = versJour(f.fin);
  const duree = Math.max(1, j1 - j0);
  const xDe = (j: number) => Math.min(1, Math.max(0, (j - j0) / duree));

  const dedans = triees.filter((p) => p.date >= f.debut && p.date <= f.fin);
  const avant = triees.filter((p) => p.date < f.debut);
  const apres = triees.filter((p) => p.date > f.fin);
  const agregation: Courbe['agregation'] = duree > SEUIL_AGREGATION_JOURS ? 'mois' : 'pesee';

  // Les points, puis leurs voisins hors fenêtre — ceux qui font entrer le trait par le bord.
  let bruts: Brut[];
  let voisinAvant: Brut | undefined;
  let voisinApres: Brut | undefined;
  const brut = (p: Pesee): Brut => {
    const j = versJour(p.date);
    return { jour: j, kg: p.weight_kg, date: p.date, n: 1, premier: j, dernier: j };
  };
  if (agregation === 'mois') {
    bruts = parMois(dedans);
    voisinAvant = parMois(avant).pop();
    voisinApres = parMois(apres)[0];
  } else {
    bruts = dedans.map(brut);
    voisinAvant = avant.length ? brut(avant[avant.length - 1]) : undefined;
    voisinApres = apres.length ? brut(apres[0]) : undefined;
  }

  // Deux bouts sont-ils séparés par un trou ? Toujours mesuré entre PESÉES (règle 1).
  const trou = (a: Brut, b: Brut) => b.premier - a.dernier > seuilTrou(cadenceJours);

  const points: PointCourbe[] = bruts.map((b) => ({ x: xDe(b.jour), kg: b.kg, date: b.date, n: b.n }));
  const segments: SegmentCourbe[] = [];
  const valeursAxe = bruts.map((b) => b.kg);

  if (bruts.length) {
    const premier = bruts[0];
    const dernier = bruts[bruts.length - 1];
    if (voisinAvant && premier.jour > j0) {
      const kgBord = arrondi1(interpoler(voisinAvant.jour, voisinAvant.kg, premier.jour, premier.kg, j0));
      segments.push({ x1: 0, kg1: kgBord, x2: xDe(premier.jour), kg2: premier.kg, pointille: trou(voisinAvant, premier) });
      valeursAxe.push(kgBord);
    }
    for (let i = 1; i < bruts.length; i++) {
      const a = bruts[i - 1];
      const b = bruts[i];
      segments.push({ x1: xDe(a.jour), kg1: a.kg, x2: xDe(b.jour), kg2: b.kg, pointille: trou(a, b) });
    }
    if (voisinApres && dernier.jour < j1) {
      const kgBord = arrondi1(interpoler(dernier.jour, dernier.kg, voisinApres.jour, voisinApres.kg, j1));
      segments.push({ x1: xDe(dernier.jour), kg1: dernier.kg, x2: 1, kg2: kgBord, pointille: trou(dernier, voisinApres) });
      valeursAxe.push(kgBord);
    }
  }

  const axe = valeursAxe.length ? graduer(valeursAxe) : { graduations: [], min: 0, max: 0 };
  return {
    fenetre: f,
    agregation,
    points,
    segments,
    ...axe,
    reperes: reperesPour(f),
    nbPesees: dedans.length,
    ecartKg: dedans.length >= 2 ? arrondi1(dedans[dedans.length - 1].weight_kg - dedans[0].weight_kg) : null,
  };
}
