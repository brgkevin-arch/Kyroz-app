import { describe, it, expect } from 'vitest';
import { CASCADE, delaiCascade } from '../motion';

describe('cascade des pages d\'inscription', () => {
  it('décale les éléments dans l\'ordre, un pas après l\'autre', () => {
    expect([0, 1, 2].map((i) => delaiCascade(i, 0, false))).toEqual([0, CASCADE.pas, 2 * CASCADE.pas]);
  });
  it('borne l\'attente : au-delà de `max`, tout part avec le dernier décalé', () => {
    expect(delaiCascade(CASCADE.max + 4, 0, false)).toBe(CASCADE.max * CASCADE.pas);
  });
  it('une question DÉVOILÉE après l\'entrée de la page n\'attend pas', () => {
    expect(delaiCascade(3, CASCADE.fenetre + 1, false)).toBe(0);
  });
  it('« Réduire les animations » : aucun décalage', () => {
    expect(delaiCascade(3, 0, true)).toBe(0);
  });
});
