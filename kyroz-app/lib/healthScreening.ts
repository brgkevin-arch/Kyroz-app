import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Dépistage santé BLOQUANT à l'onboarding (CLAUDE.md §6 — hard block dans le code) ──
// Kyroz est réservé aux adultes en bonne santé. Grossesse/allaitement et pathologies
// chroniques sont EXCLUS (un plan macro auto-généré ne peut pas s'y substituer). Le
// blocage vit ici (logique pure + persistance, testé), dans components/HealthScreening.tsx
// (l'écran-portail) et app/(auth)/onboarding.tsx (qui affiche le portail avant l'assistant).
// Le hard block « < 16 ans » et « < MIN_KCAL » reste, lui, dans lib/tdee.ts (validateProfile).

export const SCREENING_KEY = '@kyroz:healthScreening';

// Version des critères : l'incrémenter si les situations dépistées changent → re-dépistage
// forcé des utilisateurs ayant validé une version antérieure.
export const SCREENING_VERSION = 1;

// Situations médicales incompatibles avec un plan Kyroz.
export interface ScreeningFlags {
  pregnant_or_breastfeeding: boolean; // grossesse ou allaitement
  chronic_condition: boolean;         // diabète, maladie rénale/cardiaque, TCA, autre pathologie chronique suivie
}

export const EMPTY_FLAGS: ScreeningFlags = {
  pregnant_or_breastfeeding: false,
  chronic_condition: false,
};

// Bloqué dès qu'UNE situation à risque est déclarée.
export function screeningBlocked(flags: ScreeningFlags): boolean {
  return Object.values(flags).some(Boolean);
}

export interface ScreeningRecord { passedAt: string; version: number }

// L'utilisateur a-t-il déjà passé le dépistage (version courante) ? → ne pas le remontrer.
export async function hasPassedScreening(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SCREENING_KEY);
    if (!raw) return false;
    const rec: ScreeningRecord = JSON.parse(raw);
    return rec.version === SCREENING_VERSION;
  } catch { return false; }
}

// Enregistre l'attestation (adulte en bonne santé, aucune situation à risque), horodatée.
// `passedAt` = instant (toISOString OK : c'est un timestamp, pas une date-calendrier —
// cf. le piège localStamp de lib/weight.ts qui ne concerne QUE les jours).
export async function recordScreeningPassed(now: Date = new Date()): Promise<void> {
  const rec: ScreeningRecord = { passedAt: now.toISOString(), version: SCREENING_VERSION };
  try { await AsyncStorage.setItem(SCREENING_KEY, JSON.stringify(rec)); } catch {}
}
