// ── Rappel quotidien : l'heure choisie et ce qu'on dit ───────────────────────
//
// Module PUR — aucun import `react-native` ni `expo-notifications`, donc
// testable (cf. le préambule de `vitest.config.ts` : c'est précisément ce qui
// rendait `notifications.ts` intestable). `lib/notifications.ts` ne garde que
// la programmation système et vient chercher ici l'heure et le texte.
//
// Deux choses vivent là :
//
//  1. **L'heure est un nombre, plus un créneau.** Le rappel se réglait sur trois
//     valeurs en dur (8h00 · 12h00 · 18h30). Quelqu'un qui déjeune à 13h ou
//     dîne à 20h30 recevait donc un rappel à côté de sa vie. Les trois créneaux
//     survivent comme RACCOURCIS (`REMINDER_PRESETS`), pas comme le modèle : ce
//     qu'on stocke est une heure libre, et le raccourci se DÉDUIT d'elle.
//
//  2. **Le message tourne.** Une notification qui répète la même phrase pendant
//     six mois devient un bruit qu'on balaie sans lire. Chaque créneau de la
//     journée a donc son jeu de messages, et l'index se calcule à partir du JOUR
//     où la notification tombera — aucun compteur à stocker, aucune part de
//     hasard, donc un test peut le vérifier.
//
// ⚠️ Le ton : encourager, jamais mettre la pression. Pas de « ne casse pas ta
// chaîne » ni de « tu as raté hier » — un rappel qui culpabilise fait fermer
// l'app, pas ouvrir le plan. Et pas d'émoji : la règle de CLAUDE.md §8 vaut ici
// comme ailleurs, une notification est de l'interface même si elle vit dans une
// chaîne de `lib/`.

/** Heure du jour à laquelle le rappel tombe, en heure LOCALE. */
export interface ReminderTime {
  hour: number;
  minute: number;
}

/** Titre + corps d'une notification. */
export interface ReminderCopy {
  title: string;
  body: string;
}

/** Raccourcis d'un tap. Ce ne sont QUE des heures — le modèle reste l'heure. */
export const REMINDER_PRESETS = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 18, minute: 30 },
} as const;

export type ReminderPresetId = keyof typeof REMINDER_PRESETS;

export const REMINDER_PRESET_IDS: ReminderPresetId[] = ['morning', 'midday', 'evening'];

export const REMINDER_PRESET_LABELS: Record<ReminderPresetId, string> = {
  morning: 'Matin',
  midday: 'Midi',
  evening: 'Soir',
};

/** Heure posée quand on active le rappel sans rien préciser. */
export const DEFAULT_REMINDER_TIME: ReminderTime = REMINDER_PRESETS.morning;

/** Ramène n'importe quelle paire dans un cadran valide (0–23 h, 0–59 min). */
export function clampReminderTime(hour: number, minute: number): ReminderTime {
  const h = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour))) : 0;
  const m = Number.isFinite(minute) ? Math.min(59, Math.max(0, Math.trunc(minute))) : 0;
  return { hour: h, minute: m };
}

/**
 * Lit la préférence stockée. `null` = aucun rappel.
 *
 * ⚠️ Reprend les valeurs de l'ANCIEN format (`'morning' | 'midday' | 'evening'`) :
 * la clé `@kyroz:reminder` survit à la purge des données (cf. le `KEEP` du
 * Profil), donc elle contient encore un créneau chez tous ceux qui avaient réglé
 * leur rappel avant l'heure libre. Sans cette reprise, leur rappel s'éteignait
 * en silence à la mise à jour.
 */
export function parseReminder(raw: string | null | undefined): ReminderTime | null {
  if (!raw || raw === 'off') return null;
  if (raw in REMINDER_PRESETS) return { ...REMINDER_PRESETS[raw as ReminderPresetId] };
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return { hour: h, minute: min };
}

/** Écrit la préférence. Toujours `'off'` ou `'HH:MM'` — jamais un créneau. */
export function serializeReminder(time: ReminderTime | null): string {
  if (!time) return 'off';
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/** Affichage français : `8h00`, `18h30`. L'heure ne se pave pas, les minutes si. */
export function formatReminderTime(time: ReminderTime): string {
  return `${time.hour}h${String(time.minute).padStart(2, '0')}`;
}

/** Le raccourci qui correspond EXACTEMENT à cette heure, sinon `null` (= perso). */
export function presetOf(time: ReminderTime | null): ReminderPresetId | null {
  if (!time) return null;
  return REMINDER_PRESET_IDS.find(
    (id) => REMINDER_PRESETS[id].hour === time.hour && REMINDER_PRESETS[id].minute === time.minute,
  ) ?? null;
}

// ── Le moment de la journée décide de ce qu'on dit ───────────────────────────
// Un rappel à 20h qui annonce « prépare ton petit-déjeuner » est pire que pas de
// rappel du tout. L'heure libre rendait ce risque réel : les trois créneaux
// garantissaient le contexte, plus maintenant. On le retrouve donc par calcul.
export type ReminderPeriod = 'matin' | 'midi' | 'apresmidi' | 'soir';

/**
 * Le créneau de journée d'une heure. La nuit (00h–04h59) est rattachée au SOIR :
 * quelqu'un qui règle son rappel à 1h du matin finit sa journée, il ne la
 * commence pas.
 */
export function periodOf(time: ReminderTime): ReminderPeriod {
  const h = time.hour;
  if (h >= 5 && h <= 10) return 'matin';
  if (h >= 11 && h <= 14) return 'midi';
  if (h >= 15 && h <= 17) return 'apresmidi';
  return 'soir';
}

// ── Le TITRE dit pourquoi on dérange, le CORPS motive ────────────────────────
//
// Découpage voulu : une notification qui ne porterait QUE la citation ne dirait
// plus ce qu'on attend de toi, et une qui ne porterait que la consigne finirait
// en bruit. Le titre reste donc ancré au moment de la journée (c'est lui qui
// remplace le contexte que les trois créneaux garantissaient), et le corps porte
// la citation.
//
// ⚠️ **Les deux compteurs doivent être PREMIERS ENTRE EUX**, sinon le couple
// tourne au rythme du plus petit dénominateur commun et non de leur produit.
// Mesuré : retirer UNE citation (16 → 15) avec 3 titres a fait tomber le cycle
// de 48 à 15 jours — un tiers de la variété perdu par une suppression qui n'avait
// rien à voir. 4 titres et 15 citations sont premiers entre eux → **60 jours**.
// Le test « le couple ne se répète pas avant un mois » tient cette propriété :
// c'est lui qui a désigné la régression, pas une relecture.
export const REMINDER_TITLES: Record<ReminderPeriod, string[]> = {
  matin: ['Ta journée commence', 'Le plan du jour est prêt', 'On y va', 'Un coup d’œil et c’est parti'],
  midi: ['C’est l’heure de manger', 'Pause déjeuner', 'Ton déjeuner t’attend', 'Ton midi est déjà prévu'],
  apresmidi: ['Point de l’après-midi', 'Ton plan est toujours là', 'Il te reste la journée', 'Un point rapide'],
  soir: ['Le dîner approche', 'Dernier repas de la journée', 'On finit la journée', 'Ce soir, tout est prêt'],
};

/** Une citation. `auteur` absent = maxime maison, et ça se voit à l'écran. */
export interface Citation {
  texte: string;
  auteur?: string;
}

// ⚠️ **On n'attribue que ce qui tient.** Le registre « citation motivante » est
// le plus mal attribué qui soit : « Que ton aliment soit ta seule médecine »
// n'est pas d'Hippocrate (absente du corpus), et « l'excellence est une
// habitude » est de Will Durant résumant Aristote, pas d'Aristote. Ces deux-là
// sont précisément celles qu'une app de nutrition a envie de mettre — elles ne
// sont pas ici. Un auteur faux est un mensonge affiché, au même titre qu'un
// chiffre faux (cf. la règle « pas de mensonge » de CLAUDE.md).
//
// Ce qui porte un auteur ci-dessous est du domaine public et sourcé :
// Sénèque (Lettres à Lucilius), Ovide (Pontiques), Marc Aurèle (Pensées),
// Épictète (Manuel), Lao Tseu (Tao Te King 64). Le reste n'a PAS d'auteur —
// ce sont des maximes écrites pour Kyroz, et elles s'affichent sans signature
// plutôt que sous un nom emprunté.
//
// ⚠️ Une citation d'auteur ne se RACCOURCIT pas pour tenir dans une bannière :
// la tronquer ferait dire à Sénèque ce qu'il n'a pas écrit. Une seule
// (« Ce n'est pas parce que les choses sont difficiles… », 141 caractères)
// dépassait le plafond de 140 — elle a été RETIRÉE, pas rognée, et le plafond
// n'a pas bougé d'un caractère pour l'accueillir.
// ⚠️ **L'ORDRE DU TABLEAU EST L'ORDRE DES JOURS** — il n'est pas décoratif.
// Rangées par famille (les 6 signées, puis les 9 maximes), elles donnaient trois
// philosophes d'affilée en ouverture puis neuf jours de maximes : « semaine
// antique, puis semaine Kyroz ». Ça ne se voit pas dans le fichier, ça se voit
// sur un aperçu de 14 jours. Elles sont donc ENTRELACÉES, et un test tient la
// propriété (jamais 3 de la même famille de suite, bouclage compris).
export const CITATIONS: Citation[] = [
  { texte: 'Tu n’as pas besoin de motivation aujourd’hui. Tu as un plan.' },
  { texte: 'La goutte d’eau creuse la pierre, non par la force, mais en tombant souvent.', auteur: 'Ovide' },
  { texte: 'La régularité bat l’intensité, tous les jours de la semaine.' },
  { texte: 'Un voyage de mille lieues commence toujours par un premier pas.', auteur: 'Lao Tseu' },
  { texte: 'Ce n’est pas le repas parfait qui compte, c’est le suivant.' },
  { texte: 'Les résultats viennent des jours ordinaires, pas des jours exceptionnels.' },
  { texte: 'Tu as pouvoir sur ton esprit, non sur les événements extérieurs. Comprends-le, et tu trouveras la force.', auteur: 'Marc Aurèle' },
  { texte: 'Un plan suivi à 80 % vaut mieux qu’un plan parfait abandonné.' },
  { texte: 'Il n’est pas de vent favorable pour qui ne sait où il va.', auteur: 'Sénèque' },
  { texte: 'Ce que tu répètes devient facile. C’est tout le secret.' },
  { texte: 'Trois mois passent de toute façon. Autant qu’ils comptent.' },
  { texte: 'Ce ne sont pas les choses qui troublent les hommes, mais les opinions qu’ils en ont.', auteur: 'Épictète' },
  { texte: 'Manger comme prévu, c’est déjà une victoire de la journée.' },
  { texte: 'Ce n’est pas que nous ayons peu de temps, c’est que nous en perdons beaucoup.', auteur: 'Sénèque' },
  { texte: 'Personne ne se transforme en un jour. Tout le monde se transforme en un an.' },
];

/** Le corps affiché : la citation, suivie de son auteur s'il y en a un. */
export function formatCitation(c: Citation): string {
  return c.auteur ? `${c.texte} — ${c.auteur}` : c.texte;
}

export const WEIGH_IN_MESSAGES: ReminderCopy[] = [
  { title: 'Ta pesée du jour', body: 'Note ton poids : Kyroz réajuste tes calories et ton plan tout seul.' },
  { title: 'Un chiffre, rien de plus', body: 'La pesée sert à caler ton plan, pas à te juger.' },
  { title: 'C’est le jour de la pesée', body: 'Trente secondes, et ton plan reste aligné sur ta progression.' },
];

/**
 * Numéro du jour civil LOCAL d'une date (jours depuis l'époque). Sert d'index de
 * rotation : deux jours voisins donnent deux messages voisins, et le même jour
 * redonne le MÊME message — ré-armer le rappel trois fois dans la journée ne
 * doit pas faire défiler le jeu.
 */
export function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * Prochaine occurrence de l'heure choisie, en local. Si l'heure du jour est déjà
 * passée, c'est demain — c'est cette date qui donne l'index du message, pour que
 * le texte corresponde au jour où il s'affichera et non au jour où on l'arme.
 */
export function nextReminderAt(time: ReminderTime, now: Date): Date {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

// `%` garde le signe en JS : un index négatif (date antérieure à 1970, ou horloge
// fantaisiste) sortirait du tableau et rendrait `undefined`.
const rang = (index: number, taille: number) => ((index % taille) + taille) % taille;

/** La citation du jour `index`. Déterministe. */
export function pickCitation(index: number): Citation {
  return CITATIONS[rang(index, CITATIONS.length)];
}

/** Le message du jour `index` pour une heure donnée. Déterministe. */
export function pickReminderCopy(time: ReminderTime, index: number): ReminderCopy {
  const titres = REMINDER_TITLES[periodOf(time)];
  return {
    title: titres[rang(index, titres.length)],
    body: formatCitation(pickCitation(index)),
  };
}

/**
 * Idem pour la pesée — indexé sur le jour de l'échéance, pas de la
 * programmation. ⚠️ Pas de citation ici : la pesée demande un GESTE précis, et
 * une maxime à sa place laisserait l'utilisateur sans savoir quoi faire.
 */
export function pickWeighInCopy(index: number): ReminderCopy {
  return WEIGH_IN_MESSAGES[rang(index, WEIGH_IN_MESSAGES.length)];
}
