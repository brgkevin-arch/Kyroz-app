// ── Logique du streak (North Star : 7 jours consécutifs) ─────────────────────
// Source unique de vérité pour : paliers à célébrer, progression visuelle vers
// le prochain palier, et microcopie de motivation. Séparée du hook (état) et de
// l'UI (rendu) pour rester testable et réutilisable plan ⇄ profil.

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
