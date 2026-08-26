import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeighInFrequency } from './types';

// ── Suivi du poids + check-in hebdo ──────────────────────────────────────────
// Un point de poids par jour (le dernier de la journée écrase). Un nouveau point
// met à jour le poids du profil → TDEE/macros/plan recalculés (offline-first).
// But : garder le plan juste DANS LE TEMPS à mesure que le poids évolue, et créer
// une raison de revenir chaque semaine (rétention → North Star).

export interface WeightEntry {
  date: string;       // 'YYYY-MM-DD'
  weight_kg: number;
  note?: string;      // note libre optionnelle (ressenti, contexte : « voyage », « malade »…)
}

export const WEIGHT_KEY = '@kyroz:weights';
const CHECKIN_DAYS = 7;

// Cadence → intervalle en jours. Pilote le rappel de check-in (écran Plan).
export const WEIGH_IN_INTERVALS: Record<WeighInFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};
export const DEFAULT_WEIGH_IN_FREQUENCY: WeighInFrequency = 'weekly';

export const WEIGH_IN_LABELS: Record<WeighInFrequency, string> = {
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
};

/** Intervalle (jours) d'une cadence, avec repli défaut. */
export function frequencyDays(freq?: WeighInFrequency): number {
  return WEIGH_IN_INTERVALS[freq ?? DEFAULT_WEIGH_IN_FREQUENCY];
}

/** Heure locale à laquelle tombe le rappel de pesée. */
export const WEIGH_IN_HOUR = 9;

/**
 * Prochaine échéance de pesée (Date, heure locale), à 9h00 : dernière pesée +
 * cadence. Si l'échéance est déjà passée (pesée en retard), vise le prochain
 * créneau de 9h (aujourd'hui si avant 9h, sinon demain). Sert à programmer la
 * notification de rappel de pesée (lib/notifications.ts).
 */
export function nextWeighInAt(lastStamp: string | null, freq?: WeighInFrequency, now: Date = new Date()): Date {
  const due = new Date(lastStamp ? Date.parse(lastStamp + 'T00:00:00') : now.getTime());
  due.setDate(due.getDate() + frequencyDays(freq));
  due.setHours(WEIGH_IN_HOUR, 0, 0, 0);
  if (due.getTime() > now.getTime()) return due;
  const next = new Date(now);
  next.setHours(WEIGH_IN_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

// ── Le rappel de pesée doit SURVIVRE à quelqu'un qui n'ouvre plus l'app ───────
//
// 🔴 Il ne le faisait pas. Une seule notification `DATE` était programmée, et le
// SEUL chemin qui en programmait la suivante était `useWeightLog`, monté par
// l'écran Plan — donc « ouvrir l'app ». Quelqu'un qui décroche recevait UNE
// notification de pesée, puis plus jamais : le rappel s'éteignait exactement au
// moment où il sert.
//
// Le raisonnement inverse était déjà écrit, mot pour mot, pour le rappel
// QUOTIDIEN (`lib/notifications.ts::applyReminder`, « un rappel qui lâche vaut
// moins qu'un message qui se répète ») — il n'avait jamais été appliqué au
// voisin, qui est pourtant le seul des deux à en avoir eu besoin.
//
// ⚠️ **Ce module ne connaît RIEN du système** : il rend une DÉCISION, que
// `lib/notifications.ts` traduit en déclencheurs expo. C'est ce qui la rend
// testable, comme `collapsingTitle.ts` ou `motion.ts`.

/** Comment programmer le rappel de pesée, en termes neutres. */
export type WeighInSchedule =
  /** Répétitif natif — ne s'éteint jamais, mais son texte est figé (cf. ci-dessous). */
  | { kind: 'daily'; hour: number; minute: number }
  /** `weekday` suit la convention d'expo/iOS : **1 = dimanche**, pas `getDay()`. */
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  /** Série d'occurrences datées, chacune avec le texte de SON jour. */
  | { kind: 'dates'; dates: Date[] };

/**
 * Nombre d'occurrences programmées d'avance pour les cadences que le système ne
 * sait pas répéter (quinzaine, mois) — soit **84 jours** et **180 jours** de
 * couverture. *(La première rédaction annonçait « ~3 mois » pour la quinzaine :
 * c'est 12 semaines, et c'est le TEST qui l'a dit — 6 occurrences espacées de
 * 14 jours couvrent 5 × 14 = 70 jours à partir de la première échéance.)*
 *
 * ⚠️ Ce plafond est le compromis que `applyReminder` refuse pour le rappel
 * quotidien, et il tient ici pour une raison de cadence, pas de goût : 15 jours
 * de couverture sur un rappel quotidien s'épuisent en deux semaines, six mois de
 * couverture sur un rappel mensuel s'épuisent après quelqu'un qui n'a pas ouvert
 * Kyroz depuis six mois — et celui-là ne revient pas sur une notification.
 * En échange, chaque occurrence porte le texte de SON jour : la rotation des
 * messages, elle, continue de tourner sans l'app.
 */
export const WEIGH_IN_AHEAD = 6;

/**
 * La façon de programmer le rappel de pesée pour une cadence donnée.
 *
 * ⚠️ **`daily` et `weekly` figent leur texte**, comme le rappel quotidien et pour
 * la même raison : le système ne rappelle pas l'app pour lui demander quoi
 * écrire. C'est le prix d'un rappel qui ne s'éteint pas, et c'est le bon prix —
 * il se paie au ré-armement (chaque ouverture de l'app renouvelle le message).
 *
 * ⚠️ En cadence `daily`, le déclencheur tombe à 9h **tous les jours**, y compris
 * le matin d'une pesée déjà faite à 7h. C'est assumé : « je me pèse chaque jour »
 * est précisément la demande d'un rappel quotidien.
 */
export function weighInSchedule(
  lastStamp: string | null,
  freq?: WeighInFrequency,
  now: Date = new Date(),
): WeighInSchedule {
  const premiere = nextWeighInAt(lastStamp, freq, now);
  const cadence = freq ?? DEFAULT_WEIGH_IN_FREQUENCY;

  if (cadence === 'daily') return { kind: 'daily', hour: WEIGH_IN_HOUR, minute: 0 };
  // `getDay()` rend 0 pour dimanche, expo attend 1 — l'oublier décale le rappel
  // d'un jour, en silence, une fois par semaine.
  if (cadence === 'weekly') {
    return { kind: 'weekly', weekday: premiere.getDay() + 1, hour: WEIGH_IN_HOUR, minute: 0 };
  }

  const pas = frequencyDays(cadence);
  const dates: Date[] = [];
  for (let i = 0; i < WEIGH_IN_AHEAD; i++) {
    const d = new Date(premiere);
    d.setDate(d.getDate() + i * pas);
    dates.push(d);
  }
  return { kind: 'dates', dates };
}

// Date au format 'YYYY-MM-DD' en heure LOCALE (surtout pas toISOString, qui
// convertit en UTC et peut décaler d'un jour selon le fuseau → dates incohérentes
// entre le sélecteur, le seed et le tri).
export function localStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStamp(): string {
  return localStamp(new Date());
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(a + 'T00:00:00');
  const db = Date.parse(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export async function loadWeights(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(WEIGHT_KEY);
  const list: WeightEntry[] = raw ? JSON.parse(raw) : [];
  // Auto-nettoyage : aucun point ne peut légitimement être daté dans le futur
  // (l'UI ne le permet pas). S'il y en a — données héritées du bug de fuseau — on purge.
  const today = todayStamp();
  return list.filter((e) => e.date <= today).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveWeights(list: WeightEntry[]): Promise<void> {
  await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(list));
}

// Ajoute/écrase le point du jour et renvoie la liste triée.
export function upsertEntry(
  list: WeightEntry[],
  weight_kg: number,
  date = todayStamp(),
  note?: string,
): WeightEntry[] {
  const others = list.filter((e) => e.date !== date);
  const trimmed = note?.trim();
  const entry: WeightEntry = { date, weight_kg, ...(trimmed ? { note: trimmed } : {}) };
  return [...others, entry].sort((a, b) => a.date.localeCompare(b.date));
}

/** Supprime le point d'une date (nettoyage d'une saisie erronée). */
export function removeEntry(list: WeightEntry[], date: string): WeightEntry[] {
  return list.filter((e) => e.date !== date);
}

export function latest(list: WeightEntry[]): WeightEntry | null {
  return list.length ? list[list.length - 1] : null;
}

// Check-in dû si le dernier point date d'au moins `intervalDays` (jamais de nag le
// J1 : on attend qu'il y ait un historique). L'intervalle suit la cadence choisie.
export function checkinDue(
  list: WeightEntry[],
  today = todayStamp(),
  intervalDays = CHECKIN_DAYS
): boolean {
  const last = latest(list);
  if (!last) return false;
  return daysBetween(last.date, today) >= intervalDays;
}

/**
 * Combien de pesées l'historique de la feuille « Suivi du poids » montre au plus.
 *
 * Le plafond n'est PAS une optimisation : sans lui la liste grandit à chaque pesée
 * et finit par occuper la feuille entière, sous une courbe qui dit déjà la tendance.
 * Dix, c'est plus de deux mois pour la cadence par défaut (hebdomadaire).
 */
export const HISTORIQUE_MAX = 10;

/** Une pesée telle que l'historique la montre : le point, et son écart au précédent. */
export type LignePesee = WeightEntry & {
  /** Écart avec la pesée PRÉCÉDENTE (kg). `null` pour la toute première, elle seule. */
  delta: number | null;
};

/**
 * Les `max` dernières pesées, de la plus récente à la plus ancienne, chacune avec
 * son écart à la précédente.
 *
 * 🔴 **L'ÉCART SE CALCULE SUR LA SÉRIE ENTIÈRE ; LE PLAFOND NE S'APPLIQUE QU'APRÈS.**
 * Ça vivait dans `WeightCheckin` en une ligne — `[...entries].reverse().slice(0, 10)` —
 * et la boucle d'affichage lisait le voisin dans la liste DÉJÀ coupée. La 10ᵉ ligne
 * n'avait donc plus de voisin et affichait « — », c'est-à-dire exactement ce que
 * l'écran réserve à la toute PREMIÈRE pesée. À partir de 11 pesées, l'app annonçait
 * un début de série qui n'existe pas, sur la seule ligne qu'on ne peut pas recouper
 * avec la suivante.
 * ➡️ Le plafond fabriquait lui-même le mensonge : il ne peut pas vivre dans la
 * boucle qui dessine. C'est pour ça que ce calcul est sorti ici, sous test.
 *
 * ⚠️ `list` est attendue triée par date CROISSANTE — invariant tenu par
 * `upsertEntry` et par `mergeWeightEntries` (syncGuard), les deux seules portes
 * d'écriture. Même hypothèse que `latest()` juste au-dessus.
 */
export function historiquePesees(list: WeightEntry[], max: number = HISTORIQUE_MAX): LignePesee[] {
  const recentes = [...list].reverse();
  return recentes.slice(0, Math.max(0, max)).map((e, i) => {
    const precedente = recentes[i + 1];   // ← la série entière, pas la tranche
    return {
      ...e,
      delta: precedente ? Math.round((e.weight_kg - precedente.weight_kg) * 10) / 10 : null,
    };
  });
}

// Variation entre les deux derniers points (kg). null si < 2 points.
export function lastDelta(list: WeightEntry[]): number | null {
  if (list.length < 2) return null;
  return Math.round((list[list.length - 1].weight_kg - list[list.length - 2].weight_kg) * 10) / 10;
}
