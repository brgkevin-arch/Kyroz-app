import { Streak } from './types';

// ── Logique du streak (North Star : 7 jours consécutifs) ─────────────────────
// Source unique de vérité pour : paliers à célébrer, progression visuelle vers
// le prochain palier, et microcopie de motivation. Séparée du hook (état) et de
// l'UI (rendu) pour rester testable et réutilisable plan ⇄ profil.

// Recharge du bouclier : tous les 7 jours de série (1 gel pardonné par semaine).
const FREEZE_RECHARGE = 7;

// Paliers célébrés. 7 est LE palier du North Star (% d'utilisateurs à 7 jours
// consécutifs dans les 14 premiers jours) ; 3 récompense tôt pour amorcer
// l'habitude, les suivants entretiennent la rétention longue.
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

// Fenêtre du chaînon visuel : on affiche toujours une « semaine » de 7 points.
// Les 7 premiers jours (la fenêtre North Star) se remplissent donc 1→7.
const CHAIN_WINDOW = 7;

/** Le prochain palier que l'utilisateur cherche à atteindre. */
export function nextMilestone(streak: number): number {
  for (const m of STREAK_MILESTONES) if (streak < m) return m;
  // Au-delà du dernier palier fixe : prochain multiple de 100.
  return Math.ceil((streak + 1) / 100) * 100;
}

/** `count` est-il EXACTEMENT un palier à célébrer ? (reset à 1 n'en est pas un) */
export function isMilestone(count: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(count) || (count > 100 && count % 100 === 0);
}

/**
 * Progression du chaînon vers la fin de la semaine en cours.
 * Renvoie le nb de points pleins sur une fenêtre de 7. À 7 jours la semaine est
 * pleine (récompense visuelle), puis le compteur repart pour la semaine suivante
 * tandis que le nombre de jours, lui, continue de grimper.
 */
export function chainProgress(streak: number): { filled: number; total: number } {
  const total = CHAIN_WINDOW;
  const filled = streak <= 0 ? 0 : ((streak - 1) % total) + 1;
  return { filled, total };
}

/** Ligne de motivation sous le chaînon (état courant → prochain objectif). */
export function streakMessage(streak: number): string {
  if (streak <= 0) return 'Cuisine aujourd’hui pour lancer ta série';
  if (streak < 7) {
    const left = 7 - streak;
    return `Plus que ${left} jour${left > 1 ? 's' : ''} pour ton objectif 7 jours 🎯`;
  }
  if (streak === 7) return 'Objectif 7 jours atteint 🎉 Ne casse pas la chaîne.';
  const next = nextMilestone(streak);
  const left = next - streak;
  return `${streak} jours d’affilée · prochain palier ${next} (${left} j)`;
}

/** Titre + texte de la célébration affichée quand un palier est franchi. */
export function celebrationCopy(n: number): { emoji: string; title: string; body: string } {
  switch (n) {
    case 3:
      return { emoji: '🔥', title: '3 jours d’affilée', body: 'Tu prends le rythme. Encore 4 jours pour ton premier vrai palier.' };
    case 7:
      return { emoji: '🎉', title: '7 jours d’affilée !', body: 'Une semaine pleine — tu as bouclé le cap qui compte. Continue sur ta lancée.' };
    case 14:
      return { emoji: '💪', title: '14 jours d’affilée', body: 'Deux semaines sans casser la chaîne. C’est devenu une habitude.' };
    case 30:
      return { emoji: '🏆', title: '30 jours d’affilée', body: 'Un mois complet. Tu es dans le club des réguliers.' };
    case 60:
      return { emoji: '⭐', title: '60 jours d’affilée', body: 'Deux mois pleins. La constance, c’est toi.' };
    default:
      return { emoji: '👑', title: `${n} jours d’affilée`, body: 'Une régularité hors norme. Respect.' };
  }
}

// ── Bouclier de série (gel d'un jour manqué) ─────────────────────────────────

export interface StreakStep {
  streak: Streak;
  froze: boolean;                  // un jour manqué vient d'être pardonné (gel)
  reachedMilestone: number | null; // palier franchi à célébrer (jamais sur un gel)
}

/** Prochain palier de 7 jours où le bouclier se rechargera (pour la microcopie UI). */
export function nextFreezeRecharge(streakDays: number): number {
  return Math.ceil((streakDays + 1) / FREEZE_RECHARGE) * FREEZE_RECHARGE;
}

/**
 * Applique un jour d'activité à la série, avec « bouclier » :
 *  - actif hier → +1 (continue) ; le bouclier se recharge à chaque palier de 7.
 *  - exactement 1 jour manqué + bouclier dispo → série PRÉSERVÉE (gel), bouclier
 *    consommé (`froze = true`).
 *  - sinon (≥2 jours manqués, ou 1 jour sans bouclier) → reset à 1, bouclier neuf.
 * `today/yesterday/dayBefore` = stamps 'YYYY-MM-DD' en heure LOCALE (cf. lib/weight.ts).
 * Pur & déterministe → testable. Renvoie la MÊME référence `streak` si déjà compté
 * aujourd'hui (permet à l'appelant de court-circuiter l'écriture).
 */
export function advanceStreak(current: Streak, today: string, yesterday: string, dayBefore: string): StreakStep {
  if (current.last_active_date === today) {
    return { streak: current, froze: false, reachedMilestone: null }; // déjà compté
  }
  const freezeAvail = current.freeze_available !== false; // undefined = dispo

  let newCount: number;
  let froze = false;
  let freeze: boolean;

  if (current.last_active_date === yesterday) {
    newCount = current.current_streak_days + 1;
    freeze = freezeAvail || newCount % FREEZE_RECHARGE === 0; // recharge au palier 7
  } else if (current.last_active_date === dayBefore && freezeAvail && current.current_streak_days > 0) {
    newCount = current.current_streak_days; // série gelée → préservée telle quelle
    froze = true;
    freeze = false;                         // bouclier consommé
  } else {
    newCount = 1;                           // série cassée → reset
    freeze = true;                          // nouveau départ protégé
  }

  const streak: Streak = {
    current_streak_days: newCount,
    longest_streak_days: Math.max(newCount, current.longest_streak_days),
    last_active_date: today,
    freeze_available: freeze,
  };
  // Pas de célébration sur un gel (le compteur n'a pas avancé → on ne re-fête pas).
  return { streak, froze, reachedMilestone: !froze && isMilestone(newCount) ? newCount : null };
}
