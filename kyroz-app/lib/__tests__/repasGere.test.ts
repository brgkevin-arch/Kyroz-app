import { describe, it, expect } from 'vitest';
import { messageRepasGere, CHEMIN_REGLAGE } from '../repasGere';
import { BUILTIN_SLOTS } from '../mealSlots';

// La boîte qui s'ouvre à la première décoche d'un repas (inscription, dernière page —
// décision fondateur du 2026-09-23). Ce qui compte : elle NOMME le repas retiré, avec
// le bon article, et elle dit où le réglage vit vraiment.

describe('la boîte nomme le repas retiré', () => {
  it('les quatre créneaux intégrés ont leur article', () => {
    expect(messageRepasGere('breakfast', 'Petit-déj').titre).toBe('Tu prends toujours le même petit-déjeuner ?');
    expect(messageRepasGere('lunch', 'Déjeuner').titre).toBe('Tu prends toujours le même déjeuner ?');
    expect(messageRepasGere('dinner', 'Dîner').titre).toBe('Tu prends toujours le même dîner ?');
    expect(messageRepasGere('snack', 'Collation').titre).toBe('Tu prends toujours la même collation ?');
  });

  it('les quatre intégrés sont TOUS couverts — un créneau ajouté au produit se verrait', () => {
    // Sinon le jour où un cinquième créneau intégré naît, il tomberait en silence sur
    // la formule des créneaux créés (« la même chose à “…” »).
    for (const slot of BUILTIN_SLOTS) {
      expect(messageRepasGere(slot.id, slot.label).titre, slot.id).not.toContain('la même chose à');
    }
  });

  it('un créneau CRÉÉ se cite par son nom, sans article deviné', () => {
    const { titre } = messageRepasGere('slot-123', 'Shaker post-training');
    expect(titre).toBe('Tu prends toujours la même chose à « Shaker post-training » ?');
    expect(titre).not.toContain('le même Shaker');
  });

  it('le message dit où ça se règle, et au FUTUR (le Profil n’existe pas encore)', () => {
    const { message } = messageRepasGere('breakfast', 'Petit-déj');
    expect(message).toContain(CHEMIN_REGLAGE);
    expect(message).toContain('tu pourras');
    expect(message).not.toContain('tu peux le régler');
  });
});
