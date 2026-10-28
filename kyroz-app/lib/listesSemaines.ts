/**
 * UNE LISTE PAR SEMAINE (décision fondateur du 2026-10-28, segment 10, constat 1).
 *
 * Avant : une fois les courses de la semaine closes, la semaine suivante se préparait et
 * l'écran Courses mêlait les deux en UNE liste, « Encore pour cette semaine » en tête, sous
 * une phrase qui annonçait la semaine suivante. Après : la liste de la semaine EN COURS reste
 * en grand ; celle d'après vit dans un petit encadré, et passe en grand le jour où sa semaine
 * commence (le plan se renouvelle alors sur elle).
 *
 * ⚠️ Deux listes calculées SÉPARÉMENT compteraient deux fois la même réserve (le poulet de
 * dimanche soir servirait aussi lundi). D'où : la semaine en cours = ses repas restants moins
 * la réserve ; la suivante = (les deux semaines moins la réserve) MOINS la semaine en cours.
 * Ce fichier n'importe rien : il se teste en l'appelant.
 */

/** Ce dont la séparation a besoin d'un article de liste. */
export interface ArticleDeListe { name: string; quantity: number; unit: string }

/**
 * Les articles de la semaine suivante : le besoin des deux semaines, moins ce que la semaine
 * en cours prend déjà. Un article dont la semaine en cours prend tout disparaît.
 */
export function articlesDeLaSuivante<T extends ArticleDeListe>(lesDeux: T[], enCours: ArticleDeListe[]): T[] {
  const pris = new Map(enCours.map((i) => [`${i.name.toLowerCase()}|${i.unit}`, i.quantity]));
  const out: T[] = [];
  for (const i of lesDeux) {
    const reste = i.quantity - (pris.get(`${i.name.toLowerCase()}|${i.unit}`) ?? 0);
    if (reste > 0) out.push({ ...i, quantity: reste });
  }
  return out;
}

/** Les articles cochés d'une liste qui n'est pas encore en grand, rattachés à SA semaine. */
export interface CochesDeSemaine { semaine: string; noms: string[] }

/**
 * Le jour où sa semaine commence, la liste d'après passe en grand : ses cases cochées la
 * suivent (sinon ce qu'on a pris en avance redeviendrait « à prendre »). Des cases d'une autre
 * semaine ne s'appliquent jamais.
 */
export function cochesPourLaSemaine(coches: CochesDeSemaine | null, semaine: string | null): Set<string> {
  if (!coches || !semaine || coches.semaine !== semaine) return new Set();
  return new Set(coches.noms.map((n) => n.toLowerCase()));
}
