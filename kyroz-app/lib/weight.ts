import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeighInDay, WeighInFrequency } from './types';
// Les noms de jours ne se réécrivent pas ici : `NOMS_JOURS` est indexée par
// `getDay()` (0 = dimanche), exactement la convention de `weigh_in_day`. Le module
// porte un nom de courses, mais la liste, elle, n'a rien de spécifique aux courses —
// et une seconde copie finirait par diverger de la première.
import { NOMS_JOURS } from './coursesDepuis';

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

// ── Cadence → intervalle en jours ────────────────────────────────────────────
//
// Pilote le rappel de check-in (écran Plan) ET la notification.
//
// 🔴 **TOUS MULTIPLES DE 7 DEPUIS LE 2026-09-20, et c'est ce qui rend le jour de
// pesée tenable.** Le rendez-vous est désormais ancré sur un JOUR DE SEMAINE choisi
// (cf. `weigh_in_day`) : un pas qui n'est pas un multiple de 7 le fait glisser à
// chaque échéance. Avec l'ancien `monthly: 30`, la 2ᵉ occurrence d'une série
// programmée d'avance tombait deux jours plus loin dans la semaine que la 1ʳᵉ, la
// 3ᵉ quatre jours plus loin — « le dimanche » devenait mardi, puis jeudi, sans que
// rien ne l'ait demandé.
// ➡️ `monthly` vaut donc **28 jours** (4 semaines), et son libellé le dit. C'est
// 2 jours de moins qu'avant pour les comptes en cadence mensuelle — assumé : le
// choix du jour ne peut pas tenir autrement, et l'alternative (arrondir chaque
// occurrence au jour choisi) donnerait des écarts de 28 ou 35 jours selon le mois.
// ⚠️ `'daily'` a disparu de la cadence (décision fondateur, 2026-09-20 : *« une fois
// par semaine minimum, c'est ce qu'il faut »*). Un compte qui la portait est refermé
// sur `'weekly'` à la lecture — `syncGuard::normalizeWeighIn`.
export const WEIGH_IN_INTERVALS: Record<WeighInFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 28,
};
export const DEFAULT_WEIGH_IN_FREQUENCY: WeighInFrequency = 'weekly';

export const WEIGH_IN_LABELS: Record<WeighInFrequency, string> = {
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  // « Chaque mois » aurait été le libellé confortable, et il aurait été FAUX de
  // deux jours à chaque échéance (§10 : un chiffre affiché est celui qui sera servi).
  monthly: 'Toutes les 4 semaines',
};

/** Les sept jours dans l'ORDRE D'AFFICHAGE (lundi d'abord), au format `getDay()`. */
export const JOURS_PESEE: { value: WeighInDay; court: string }[] = [
  { value: 1, court: 'Lun' }, { value: 2, court: 'Mar' }, { value: 3, court: 'Mer' },
  { value: 4, court: 'Jeu' }, { value: 5, court: 'Ven' }, { value: 6, court: 'Sam' },
  { value: 0, court: 'Dim' },
];

/** « lundi », « dimanche »… pour la phrase d'aide. Source unique : `NOMS_JOURS`. */
export function nomDuJour(day: WeighInDay): string {
  return NOMS_JOURS[day];
}

/** Vrai pour 0…6, et pour rien d'autre (une valeur venue de la base peut être n'importe quoi). */
export function estUnJourDePesee(v: unknown): v is WeighInDay {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6;
}

/**
 * Le jour où le rendez-vous de pesée tombe RÉELLEMENT.
 *
 * ⚠️ **Le repli n'est pas un défaut arbitraire, c'est le comportement d'avant.**
 * Sans jour choisi, Kyroz plaçait l'échéance à « dernière pesée + cadence », donc le
 * MÊME jour de semaine que la dernière pesée. On le calcule ici explicitement : un
 * compte qui installe la mise à jour sans rien régler ne voit donc aucun rendez-vous
 * se déplacer, et l'écran peut MONTRER ce jour-là comme sélectionné — un réglage dont
 * l'écran n'affiche aucune sélection est un réglage qu'on ne sait pas corriger
 * (`normalizeVariety` l'a déjà payé).
 */
export function weighInDayOf(
  day: WeighInDay | undefined,
  lastStamp: string | null,
  now: Date = new Date(),
): WeighInDay {
  if (estUnJourDePesee(day)) return day;
  if (lastStamp) return stampDate(lastStamp).getDay() as WeighInDay;
  return now.getDay() as WeighInDay;
}

/** Le résumé que les réglages affichent : « chaque semaine, le dimanche ». */
export function weighInResume(freq: WeighInFrequency | undefined, jour: WeighInDay): string {
  const cadence = WEIGH_IN_LABELS[freq ?? DEFAULT_WEIGH_IN_FREQUENCY].toLowerCase();
  return `${cadence}, le ${nomDuJour(jour)}`;
}

/** Intervalle (jours) d'une cadence, avec repli défaut. */
export function frequencyDays(freq?: WeighInFrequency): number {
  return WEIGH_IN_INTERVALS[freq ?? DEFAULT_WEIGH_IN_FREQUENCY];
}

/** Heure locale à laquelle tombe le rappel de pesée. */
export const WEIGH_IN_HOUR = 9;

// ── LE RENDEZ-VOUS EST UN JOUR, PLUS UN INTERVALLE (2026-09-20) ──────────────
//
// **Avant**, l'échéance valait « dernière pesée + cadence », point. Trois
// conséquences que personne n'avait choisies :
//  · le jour de la semaine venait d'un HASARD — celui où on s'était pesé la
//    première fois ;
//  · il DÉRIVAIT : une pesée en retard le samedi faisait passer tous les rendez-vous
//    suivants au samedi, définitivement ;
//  · et la notification pouvait tomber n'importe quel jour, ce qui est exactement
//    ce qu'on ne veut pas d'un rituel hebdomadaire.
//
// **Depuis**, le jour choisi (`weigh_in_day`) est l'ANCRE : l'échéance est
// l'occurrence de ce jour la plus proche de « dernière pesée + cadence ». Se peser
// un autre jour ne déplace donc plus rien, et l'écart réel reste borné (±3 jours
// une seule fois, le temps de se recaler sur le jour demandé).
//
// ⚠️ **L'ARRONDI VA VERS L'ARRIÈRE, ET CE N'EST PAS UN DÉTAIL DE CALCUL.** L'échéance
// est la DERNIÈRE occurrence du jour choisi qui ne dépasse pas « dernière pesée +
// cadence » : jamais plus tard que la cadence promise, au plus 6 jours plus tôt, le
// temps de se recaler sur le jour demandé.
//  · Les deux autres arrondis ont été écrits puis jetés, et ils se trompaient dans le
//    même sens : « la prochaine occurrence APRÈS dernière pesée + cadence » rendait
//    **11 jours** à quelqu'un qui s'était pesé un mercredi avec rendez-vous le
//    dimanche ; « l'occurrence la plus PROCHE » rendait **10 jours** à une pesée du
//    vendredi avec rendez-vous le lundi. Une cadence hebdomadaire qui fait attendre
//    dix jours ne tient pas la promesse du réglage qu'on vient de poser.
//  · Vers l'arrière, la cadence hebdomadaire redevient exactement ce que le réglage
//    dit — **chaque lundi**, un point (démontré : « la dernière occurrence ≤ pesée + 7 »
//    est toujours la première occurrence qui suit la pesée).
//  · Et l'écart n'est raccourci QUE pour qui s'est pesé hors de son jour, une seule
//    fois : se peser le jour du rendez-vous rend un espacement exact.
// ➡️ Le sens choisi est aussi le moins coûteux quand il se trompe : une pesée
// proposée un peu tôt s'ignore d'un regard, une pesée proposée trop tard fait mentir
// la phrase affichée juste au-dessus du réglage (§10).

/** Minuit LOCAL du jour `stamp` ('YYYY-MM-DD'). Jamais `new Date(stamp)`, qui lit de l'UTC. */
function stampDate(stamp: string): Date {
  return new Date(Date.parse(stamp + 'T00:00:00'));
}

/**
 * La dernière occurrence de `jour` qui ne dépasse PAS `cible` (donc `cible` elle-même,
 * ou jusqu'à 6 jours avant), à 9h locale.
 *
 * Le pas des cadences étant multiple de 7, ce recalage ne se paie qu'UNE fois : les
 * échéances suivantes tombent pile sur le jour choisi, à l'intervalle exact.
 */
function derniereOccurrenceAvant(cible: Date, jour: WeighInDay): Date {
  const d = new Date(cible);
  d.setHours(WEIGH_IN_HOUR, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - jour + 7) % 7));    // 0…6 jours en arrière
  return d;
}

/** La prochaine occurrence de `jour` à partir de `now` (aujourd'hui 9h s'il est encore tôt). */
function prochaineOccurrence(jour: WeighInDay, now: Date): Date {
  const d = new Date(now);
  d.setHours(WEIGH_IN_HOUR, 0, 0, 0);
  const enAvant = (jour - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (enAvant === 0 && d.getTime() <= now.getTime() ? 7 : enAvant));
  return d;
}

/**
 * L'échéance THÉORIQUE de la prochaine pesée : la dernière occurrence du jour choisi
 * qui ne dépasse pas « dernière pesée + cadence », à 9h locale. En cadence
 * hebdomadaire, c'est donc simplement **le prochain jour de rendez-vous**. Peut être dans le passé —
 * c'est même ce qui permet à la bannière de savoir qu'une pesée est attendue
 * (`checkinDue`). Pour programmer une notification, c'est `nextWeighInAt`.
 */
export function echeancePeseeAt(
  lastStamp: string | null,
  freq?: WeighInFrequency,
  day?: WeighInDay,
  now: Date = new Date(),
): Date {
  const cible = lastStamp ? stampDate(lastStamp) : new Date(now);
  cible.setDate(cible.getDate() + frequencyDays(freq));
  return derniereOccurrenceAvant(cible, weighInDayOf(day, lastStamp, now));
}

/** La même échéance, au format 'YYYY-MM-DD' (c'est la DATE qui décide, pas l'heure). */
export function echeancePesee(lastStamp: string, freq?: WeighInFrequency, day?: WeighInDay): string {
  return localStamp(echeancePeseeAt(lastStamp, freq, day));
}

/**
 * Prochaine échéance de pesée (Date, heure locale, 9h00) telle qu'on la PROGRAMME.
 *
 * ⚠️ **En retard, on vise le prochain jour de rendez-vous — plus « demain 9h ».**
 * C'est le seul changement de comportement pour qui n'a rien réglé : un rappel
 * envoyé un mardi parce que la pesée du dimanche a été manquée n'est pas un
 * rendez-vous, c'est du harcèlement de rattrapage. Et rien n'est perdu : la
 * bannière de l'écran Plan, elle, est déjà là (`checkinDue` regarde l'échéance
 * théorique, qui est dans le passé).
 */
export function nextWeighInAt(
  lastStamp: string | null,
  freq?: WeighInFrequency,
  day?: WeighInDay,
  now: Date = new Date(),
): Date {
  const due = echeancePeseeAt(lastStamp, freq, day, now);
  if (due.getTime() > now.getTime()) return due;
  return prochaineOccurrence(weighInDayOf(day, lastStamp, now), now);
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

/**
 * Comment programmer le rappel de pesée, en termes neutres.
 *
 * ⚠️ Le cas `daily` (déclencheur quotidien natif) est parti avec la cadence
 * « Chaque jour », le 2026-09-20. Il n'y a plus de rappel qui puisse tomber un jour
 * que l'utilisateur n'a pas choisi.
 */
export type WeighInSchedule =
  /** `weekday` suit la convention d'expo/iOS : **1 = dimanche**, pas `getDay()`. */
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  /** Série d'occurrences datées, chacune avec le texte de SON jour. */
  | { kind: 'dates'; dates: Date[] };

/**
 * Nombre d'occurrences programmées d'avance pour les cadences que le système ne
 * sait pas répéter (quinzaine, 4 semaines) — soit **84 jours** et **168 jours** de
 * couverture *(180 avant que la cadence mensuelle passe à 28 jours pour tenir le jour
 * choisi : douze jours de couverture en moins, sur une cadence où celui qui n'a pas
 * ouvert l'app depuis cinq mois ne revient de toute façon pas sur une notification)*. *(La première rédaction annonçait « ~3 mois » pour la quinzaine :
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
  day?: WeighInDay,
  now: Date = new Date(),
): WeighInSchedule {
  const cadence = freq ?? DEFAULT_WEIGH_IN_FREQUENCY;
  const jour = weighInDayOf(day, lastStamp, now);

  // Hebdo : le déclencheur natif répétitif tombe sur le JOUR CHOISI, et plus sur
  // celui de la prochaine échéance — c'était là que la dérive entrait. Une pesée en
  // retard changeait l'échéance, donc le `weekday`, donc le rendez-vous de toutes les
  // semaines suivantes.
  // ⚠️ `getDay()` rend 0 pour dimanche, expo attend 1 — l'oublier décale le rappel
  // d'un jour, en silence, une fois par semaine.
  if (cadence === 'weekly') {
    return { kind: 'weekly', weekday: jour + 1, hour: WEIGH_IN_HOUR, minute: 0 };
  }

  // Quinzaine / 4 semaines : série datée. Le pas est multiple de 7, donc TOUTES les
  // occurrences retombent sur le jour choisi — c'est la raison d'être du 28.
  const premiere = nextWeighInAt(lastStamp, cadence, jour, now);
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

/**
 * Une pesée est-elle attendue aujourd'hui ? (bannière de l'écran Plan + carte du Profil)
 *
 * 🔴 **CE N'EST PLUS UN COMPTE DE JOURS, C'EST LE JOUR DU RENDEZ-VOUS** (2026-09-20).
 * La version d'avant demandait « le dernier point date-t-il d'au moins 7 jours ? » :
 * la bannière tombait donc n'importe quel jour de la semaine, et elle contredisait la
 * notification dès que l'utilisateur se pesait hors de son jour. Les deux lisent
 * désormais la MÊME échéance — une seule source pour un seul rendez-vous.
 *
 * ⚠️ Jamais de nag le J1 : sans historique, aucune pesée n'est réclamée.
 * ⚠️ La comparaison se fait sur des chaînes 'YYYY-MM-DD', qui s'ordonnent
 * lexicographiquement — pas sur des `Date`, dont l'heure ferait mentir le « aujourd'hui ».
 */
export function checkinDue(
  list: WeightEntry[],
  today = todayStamp(),
  freq?: WeighInFrequency,
  day?: WeighInDay,
): boolean {
  const last = latest(list);
  if (!last) return false;
  return echeancePesee(last.date, freq, day) <= today;
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

// ── LE PROFIL SUIT LA PESÉE LA PLUS RÉCENTE — PAS CELLE D'AUJOURD'HUI ────────
//
// 🔴 LE DÉFAUT, SIGNALÉ PAR LE FONDATEUR LE 2026-09-20, CAPTURE À L'APPUI.
// Profil à 85 kg, puis deux pesées rattrapées — 84 le 12 septembre, 83 le 19. Ce
// qu'il avait sous les yeux : **« 85 kg » en gros**, juste au-dessus de « −1 kg
// depuis la pesée précédente » et d'une courbe qui finit à **83**. La même carte
// annonçait deux poids différents.
// Et le pire n'était pas à l'écran : **ses macros tournaient sur 85 kg**. Il en est
// sorti en devinant tout seul qu'il fallait re-saisir une pesée datée d'aujourd'hui.
//
// **La cause était une règle écrite exprès**, dans `useWeightLog::logWeight` : *« SEULE
// la pesée d'AUJOURD'HUI pilote le profil → macros → plan ; un jour passé (backfill)
// n'alimente que l'historique »*. Son intention est juste — rattraper une pesée du
// 3 août ne doit pas écraser le poids d'aujourd'hui — mais elle confond deux choses :
// **« la plus récente » et « celle du jour »**. Une pesée d'hier est la plus récente
// de l'historique ; elle n'est simplement pas d'aujourd'hui.
//
// ➡️ La règle devient : **le profil porte toujours le poids du dernier point de
// l'historique.** L'intention d'origine est PRÉSERVÉE sans condition de date — une
// pesée ancienne n'est pas le dernier point, donc elle ne change rien.
//
// ⚠️ **Cet invariant n'est tenable que parce que la pesée est la SEULE porte d'entrée
// du poids** : l'éditeur « Informations » ne le saisit plus depuis le 2026-08-14
// (`wN = profile.weight_kg`, il renvoie vers la feuille de pesée), et l'onboarding est
// suivi du semis d'un premier point. Si un jour un écran réécrit `weight_kg` sans
// écrire de pesée, il le perdra au prochain chargement — c'est ce commentaire-ci qu'il
// faudra rouvrir, pas cette fonction.

/**
 * Le poids que le PROFIL doit porter au vu de l'historique — ou `null` quand il n'y
 * a rien à changer.
 *
 * Volontairement AVEUGLE aux dates : `latest` tranche déjà, et une deuxième notion
 * de « récent » ici rouvrirait exactement la confusion qu'on vient de fermer.
 */
export function recalageDuProfil(list: WeightEntry[], profileWeightKg: number): number | null {
  const derniere = latest(list);
  // Aucun point : on ne touche à rien. Un historique vide n'est pas une information
  // sur le poids — et c'est le SEMIS (`useWeightLog`) qui le remplit dans ce cas.
  if (!derniere) return null;
  return derniere.weight_kg === profileWeightKg ? null : derniere.weight_kg;
}

/**
 * Ce que l'écran annonce après l'enregistrement d'une pesée.
 *
 * 🔴 SORTI DU COMPOSANT LE 2026-09-20 pour qu'un test le COMPTE. Sa version d'avant
 * disait *« Le plan ne suit que ta pesée du jour »* — vrai quand seule la pesée du
 * jour pilotait le moteur, **faux depuis que le profil suit la plus récente**. Une
 * phrase qui décrit une règle doit vivre à côté de la règle : à deux fichiers de
 * distance, elle survit au changement qu'elle était censée expliquer.
 *
 * `dateLisible` est injectée parce que le formatage humain appartient à l'écran ;
 * la DÉCISION, elle, appartient ici.
 */
export function messageApresPesee(
  list: WeightEntry[],
  date: string,
  macroManuel: boolean,
  dateLisible: (iso: string) => string = (iso) => iso,
): string {
  const derniere = latest(list);
  if (derniere && derniere.date !== date) {
    return `Ajouté à ton historique. Ton plan suit ta pesée la plus récente (${dateLisible(derniere.date)}).`;
  }
  if (macroManuel) return 'Macros en mode manuel : le plan garde tes cibles fixées (modifiable dans Profil).';
  return 'Calories, macros et plan ajustés automatiquement.';
}

// Variation entre les deux derniers points (kg). null si < 2 points.
export function lastDelta(list: WeightEntry[]): number | null {
  if (list.length < 2) return null;
  return Math.round((list[list.length - 1].weight_kg - list[list.length - 2].weight_kg) * 10) / 10;
}
