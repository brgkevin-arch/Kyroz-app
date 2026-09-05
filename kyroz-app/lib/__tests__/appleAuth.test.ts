import { describe, it, expect } from 'vitest';
import { consentSanteManquant } from '../appleAuth';

/**
 * Sign in with Apple (2026-09-05) — ce qui est TESTABLE, et pourquoi c'est ça.
 *
 * `lib/appleAuth.ts` parle à un SDK natif : son comportement réel ne s'observe
 * que sur un appareil, avec un compte Apple. Ce qui se teste ici est la partie
 * qui ENGAGE LE PRODUIT et qui vit en TypeScript pur : le prédicat qui décide
 * si le consentement santé doit être recueilli avant d'entrer dans l'app.
 *
 * `hooks/useAuth.tsx::signInWithApple` ouvre une session Supabase directement
 * depuis le jeton Apple, contrairement à l'inscription par e-mail qui fait
 * cocher la case AVANT (`canSubmit` l'exige, `login.tsx`). Sans ce prédicat,
 * un compte Apple neuf entrerait dans l'app avec `consent_health_data` resté
 * à `false`/absent, en silence — le trou déjà noté pour tout parcours OAuth.
 */
describe('consentSanteManquant — le trou RGPD des parcours OAuth', () => {
  it('aucune ligne de profil = consentement manquant (compte neuf)', () => {
    expect(consentSanteManquant(null)).toBe(true);
    expect(consentSanteManquant(undefined)).toBe(true);
  });

  it('ligne de profil sans le champ = consentement manquant', () => {
    expect(consentSanteManquant({})).toBe(true);
  });

  it('consent_health_data explicitement faux = consentement manquant', () => {
    expect(consentSanteManquant({ consent_health_data: false })).toBe(true);
  });

  it('consent_health_data vrai = consentement déjà donné (compte qui revient)', () => {
    expect(consentSanteManquant({ consent_health_data: true })).toBe(false);
  });

  it('ne se trompe JAMAIS dans le sens qui donne accès sans consentement', () => {
    // Toute valeur qui n'est pas littéralement `true` doit rester bloquante —
    // une chaîne, un nombre, `null` explicite sur le champ. C'est la prudence
    // déjà appliquée à `identifyUser` (lib/purchases.ts) : se tromper en
    // REFUSANT coûte un second essai, se tromper en DONNANT ouvre la porte.
    // @ts-expect-error — valeur volontairement hors du type, pour vérifier le repli
    expect(consentSanteManquant({ consent_health_data: 1 })).toBe(true);
    expect(consentSanteManquant({ consent_health_data: null })).toBe(true);
  });
});
