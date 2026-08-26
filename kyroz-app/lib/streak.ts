import { Streak } from './types';

// ── Logique du streak — UN OUTIL DE RÉTENTION, PAS LA NORTH STAR ─────────────
//
// ⚠️ CE FICHIER S'APPELAIT « North Star : 7 jours consécutifs » JUSQU'AU 2026-08-20,
// et c'était faux : la série avance dès qu'on OUVRE le plan (`plan.tsx`,
// `markActiveToday` au montage), cuisiné ou pas. Elle compte donc des ouvertures.
// La north star, elle, compte des jours où un repas a été CUISINÉ — c'est un autre
// indicateur, décidé séparé le 2026-08-20 (fondateur). Voir `METRICS.md`.
// ➡️ Ne pas recoller les deux noms : c'est en les confondant qu'on lirait « 7 jours
// d'affilée » comme « a suivi son plan 7 jours », ce que ce compteur ne dit pas.
// Source unique de vérité pour : paliers à célébrer, progression visuelle vers
// le prochain palier, et microcopie de motivation. Séparée du hook (état) et de
// l'UI (rendu) pour rester testable et réutilisable plan ⇄ profil.

// Recharge du bouclier : tous les 7 jours de série (1 gel pardonné par semaine).
const FREEZE_RECHARGE = 7;

// Paliers célébrés. 7 est le cap visé — c'est la fenêtre d'habitude que la north
// star mesure aussi, par un autre compte (METRICS.md §1) ; 3 récompense tôt pour
// amorcer l'habitude, les suivants entretiennent la rétention longue.
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

// Fenêtre du chaînon visuel : on affiche toujours une « semaine » de 7 points.
// Les 7 premiers jours (la fenêtre d'habitude) se remplissent donc 1→7.
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
    return `Plus que ${left} jour${left > 1 ? 's' : ''} pour ton objectif 7 jours`;
  }
  // ⚠️ « Ne casse pas la chaîne. » RETIRÉ le 2026-08-26. C'était une injonction, sur
  // le seul compteur que l'app montre tous les jours. CLAUDE.md §5 n'autorise la
  // série qu'à une condition — qu'elle « rassure au lieu de mettre la pression » —
  // et son propre test est : *est-ce que ça compare, ou est-ce que ça aide à ne pas
  // décrocher ?* Une consigne de ne pas échouer ne passe ni l'un ni l'autre.
  // ➡️ Le fait suffit. Il n'y a rien à ajouter au chiffre.
  if (streak === 7) return 'Objectif 7 jours atteint.';
  const next = nextMilestone(streak);
  const left = next - streak;
  return `${streak} jours d’affilée · prochain palier ${next} (${left} j)`;
}

/**
 * Chiffre + libellé + texte de la célébration affichée quand un palier est franchi.
 *
 * ⚠️ LE CHIFFRE A REMPLACÉ L'ÉMOJI (E22, décision fondateur du 2026-08-09), et le
 * motif n'est pas seulement « pas d'émoji dans l'interface » (CLAUDE.md §8). Les six
 * emblèmes servis ici — 🔥 3 j, 🎉 7 j, 💪 14 j, 🏆 30 j, ⭐ 60 j, 👑 au-delà —
 * formaient une ÉCHELLE DE BADGES, c'est-à-dire de la **collection** : exactement la
 * moitié de ce que CLAUDE.md §5 interdit (« compétition et collection »). Les
 * remplacer par six TRACÉS aurait gardé le défaut en le rhabillant aux couleurs de
 * la DA — un pictogramme par palier reste une vignette à débloquer.
 * ➡️ Le nombre de jours dit le fait, et rien d'autre. Il n'y a plus rien à collectionner.
 *
 * Le libellé est séparé du chiffre parce que l'écran les compose à deux tailles :
 * le nombre en `Type.hero`, le libellé sous lui. Les recoller ici obligerait
 * `StreakCelebration` à redécouper une chaîne pour la mettre en page.
 */
export function celebrationCopy(n: number): { jours: string; libelle: string; body: string } {
  // Le plus petit palier est 3 (`MILESTONES`), donc le pluriel est toujours vrai —
  // le singulier est écrit quand même pour que la fonction reste juste si un jour
  // un palier à 1 apparaît. Une ligne, contre une faute d'accord invisible en test.
  const libelle = n > 1 ? 'jours d’affilée' : 'jour d’affilée';
  const jours = String(n);
  switch (n) {
    case 3:
      return { jours, libelle, body: 'Tu prends le rythme. Encore 4 jours pour ton premier vrai palier.' };
    case 7:
      return { jours, libelle, body: 'Une semaine pleine — tu as bouclé le cap qui compte. Continue sur ta lancée.' };
    case 14:
      return { jours, libelle, body: 'Deux semaines sans casser la chaîne. C’est devenu une habitude.' };
    case 30:
      // « Tu es dans le club des réguliers » supposait les AUTRES — un club, donc une
      // appartenance, donc une comparaison. Retiré le 2026-08-26 (CLAUDE.md §5).
      return { jours, libelle, body: 'Un mois complet. Le plan fait partie de ta semaine.' };
    case 60:
      return { jours, libelle, body: 'Deux mois pleins. La constance, c’est toi.' };
    default:
      // ⚠️ **GARDÉ SUR ARBITRAGE DU FONDATEUR (2026-08-26).** La relecture des textes
      // l'avait réécrit : « hors norme » mesure contre une norme et « Respect »
      // juge — deux sorties du constat au sens de CLAUDE.md §5. Le fondateur l'a
      // remis tel quel, en connaissance de la remarque.
      // ➡️ C'est le palier des 100 jours et au-delà : le seul que presque personne
      // n'atteint, et le seul où l'app se permet de saluer. Les autres restent des
      // constats. L'exception est INSCRITE dans `streak.test.ts` — le vocabulaire
      // reste interdit partout ailleurs, et le test rougit si cette phrase-ci
      // disparaît, pour qu'on ne perde pas la trace de la décision.
      return { jours, libelle, body: 'Une régularité hors norme. Respect.' };
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
