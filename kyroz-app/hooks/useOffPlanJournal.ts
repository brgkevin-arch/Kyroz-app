import { useState, useEffect, useCallback } from 'react';
import { OffPlanEntry, loadJournal, saveJournal, removeAt, newestFirst } from '../lib/offPlanJournal';

// Lecteur du journal des repas hors plan (E6). L'écran Plan ALIMENTE le journal
// sans état React (cf. `recordOffPlan`) ; c'est ici qu'on le lit.
//
// ⚠️ `reload` est exposé et il n'est pas décoratif : les écarts se posent depuis
// l'onglet Plan, donc la liste chargée au montage du Profil est périmée dès qu'on
// change d'onglet. L'appelant recharge à l'ouverture de la feuille.
export function useOffPlanJournal() {
  const [entries, setEntries] = useState<OffPlanEntry[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    setEntries(await loadJournal());
    setReady(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /**
   * Retire une ligne par son rang DANS LA LISTE AFFICHÉE (la plus récente
   * d'abord), puis remet la liste dans son ordre de stockage (chronologique).
   *
   * Pourquoi c'est offert : un journal qu'on ne peut pas corriger finit par
   * mentir — il suffit d'un « 3000 » tapé à côté de « 300 ». La règle « un
   * chiffre affiché est celui qui sera servi » vaut aussi pour l'historique.
   */
  const removeDisplayed = useCallback(async (index: number) => {
    const restant = newestFirst(removeAt(newestFirst(entries), index));
    setEntries(restant);
    await saveJournal(restant);
  }, [entries]);

  return { entries, ready, reload, removeDisplayed };
}
