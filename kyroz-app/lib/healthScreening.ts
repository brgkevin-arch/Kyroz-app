import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Avertissement santé à l'entrée (CLAUDE.md §6) ────────────────────────────
//
// 🔴 CE MODULE NE POSE PLUS AUCUNE QUESTION — changement du 2026-08-11, décision
// fondateur sur avis juridique (AGENTS.md E39). Il portait un DÉPISTAGE bloquant :
// deux questions (grossesse/allaitement, pathologie chronique suivie) dont un « oui »
// menait à un cul-de-sac. Deux motifs l'ont fait tomber, et le second est le vrai :
//   1. subordonner l'accès à un service à la grossesse ou à l'état de santé tombe
//      sous les critères de discrimination du code pénal (art. 225-1 / 225-2) ;
//   2. la réponse elle-même est une donnée de santé (RGPD art. 9), et AUCUN texte —
//      ni Apple, ni Google, ni le règlement dispositifs médicaux — n'exige de la
//      recueillir. On la traitait donc sans obligation qui la justifie.
//
// ⚠️ CE QUI RESTE, ET CE N'EST PAS UN RESTE : l'avertissement. Apple (1.4.1) et Google
// exigent le renvoi vers un professionnel de santé ; il est désormais DIT au lieu
// d'être VÉRIFIÉ. C'est la seule chose que le portail apportait vraiment — un « non »
// déclaré n'a jamais rien prouvé de personne.
//
// ⚠️ Les hard blocks qui subsistent vivent ailleurs et ne sont PAS touchés : l'âge
// (lib/safety.ts::MIN_AGE, 18 ans), l'IMC de départ, le volume d'entraînement, et tous
// les planchers caloriques du moteur (lib/safety.ts, lib/tdee.ts). Ce sont eux la
// défense de fond, et ils ne demandent rien à personne : ils MESURENT.

export const SCREENING_KEY = '@kyroz:healthScreening';

// Version de l'avertissement : l'incrémenter le fait RÉAPPARAÎTRE à qui l'a déjà vu.
//
// ⚠️ Volontairement laissée à 1 en passant du dépistage à l'avertissement. Ceux qui ont
// franchi l'ancien portail ont vu un texte PLUS strict que celui-ci (ils ont dû attester
// être des adultes en bonne santé) : leur re-montrer un avertissement plus léger ne leur
// apprendrait rien. Une bascule de version se paie par un écran de plus pour tout le
// monde ; elle se réserve à un avertissement dont le CONTENU change.
export const SCREENING_VERSION = 1;

export interface ScreeningRecord { passedAt: string; version: number }

// L'avertissement a-t-il déjà été vu (version courante) ? → ne pas le remontrer.
export async function hasPassedScreening(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SCREENING_KEY);
    if (!raw) return false;
    const rec: ScreeningRecord = JSON.parse(raw);
    return rec.version === SCREENING_VERSION;
  } catch { return false; }
}

// Enregistre que l'avertissement a été lu, horodaté.
//
// ⚠️ C'est la SEULE chose que ce module écrit, et c'est déjà ce qu'il écrivait avant :
// un instant et un numéro de version. Les réponses aux deux questions ne quittaient
// jamais l'état de l'écran — ni AsyncStorage, ni Supabase, ni PROFILE_COLS. Il n'y a
// donc AUCUNE donnée de santé à effacer chez les comptes existants, et ce commentaire
// est là pour qu'on ne reparte pas en chercher.
//
// `passedAt` = instant (toISOString OK : c'est un timestamp, pas une date-calendrier —
// cf. le piège localStamp de lib/weight.ts qui ne concerne QUE les jours).
export async function recordScreeningPassed(now: Date = new Date()): Promise<void> {
  const rec: ScreeningRecord = { passedAt: now.toISOString(), version: SCREENING_VERSION };
  try { await AsyncStorage.setItem(SCREENING_KEY, JSON.stringify(rec)); } catch {}
}
