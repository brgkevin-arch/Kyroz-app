import { describe, it, expect } from 'vitest';
import { restrictionsOkFor } from '../recipeDiet';

describe('restrictionsOkFor — halal', () => {
  it('le porc viole halal (et no_pork)', () => {
    const ok = restrictionsOkFor(['porc_filet']);
    expect(ok).not.toContain('halal');
    expect(ok).not.toContain('no_pork');
  });

  it('le jambon (charcuterie porcine) viole halal', () => {
    expect(restrictionsOkFor(['jambon_blanc'])).not.toContain('halal');
  });

  it('le poulet est halal-compatible (viande non-porc supposée halal)', () => {
    expect(restrictionsOkFor(['poulet_filet'])).toContain('halal');
  });

  it('le bœuf est halal-compatible', () => {
    expect(restrictionsOkFor(['boeuf_5'])).toContain('halal');
  });

  it('un plat 100 % végétal est halal-compatible', () => {
    expect(restrictionsOkFor(['tofu_ferme', 'riz_basmati', 'brocoli'])).toContain('halal');
  });
});
