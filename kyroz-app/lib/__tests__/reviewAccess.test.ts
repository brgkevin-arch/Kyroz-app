import { describe, it, expect } from 'vitest';
import { isReviewLogin, REVIEW_EMAIL } from '../reviewAccess';

const CODE = 'super-secret-code-123';

describe('accès reviewer (isReviewLogin)', () => {
  // LE test de sûreté : sans code configuré (cas du web public, où
  // EXPO_PUBLIC_REVIEW_CODE n'est jamais posé), l'accès invité reste FERMÉ,
  // même si quelqu'un devine l'e-mail sentinelle.
  it('FERMÉ quand aucun code n’est configuré', () => {
    expect(isReviewLogin(REVIEW_EMAIL, 'nimporte', undefined)).toBe(false);
    expect(isReviewLogin(REVIEW_EMAIL, 'nimporte', null)).toBe(false);
    expect(isReviewLogin(REVIEW_EMAIL, 'nimporte', '')).toBe(false);
  });

  it('ouvre l’accès avec l’e-mail sentinelle + le bon code', () => {
    expect(isReviewLogin(REVIEW_EMAIL, CODE, CODE)).toBe(true);
    expect(isReviewLogin('  Review@Kyroz.app  ', CODE, CODE)).toBe(true); // tolère casse/espaces
  });

  it('refuse un mauvais code ou un autre e-mail', () => {
    expect(isReviewLogin(REVIEW_EMAIL, 'mauvais', CODE)).toBe(false);
    expect(isReviewLogin('autre@user.com', CODE, CODE)).toBe(false);
    expect(isReviewLogin('autre@user.com', 'autre', CODE)).toBe(false);
  });
});
