import { describe, it, expect } from 'vitest';
import { consentSanteManquant, paireNonce } from '../appleAuth';
import { sha256Hex } from '../sha256';

/**
 * Le nonce — le défaut du build (15), corrigé le 2026-09-05.
 *
 * 🔴 La première version transmettait la valeur BRUTE à Apple ET à Supabase, sur la
 * foi de la documentation Supabase pour Expo. Résultat sur un vrai téléphone :
 * « Nonces mismatch », systématiquement. Supabase compare `SHA-256(ce qu'on lui
 * donne)` à `ce qu'Apple a mis dans le jeton` — donner le brut aux deux rend la
 * comparaison impossible à satisfaire, par construction.
 *
 * ⚠️ **Ces tests n'auraient PAS attrapé le défaut d'origine** : écrits sous la
 * croyance fausse, ils auraient vérifié la mauvaise chose. Ils servent à autre
 * chose — empêcher le RETOUR du défaut, parce que remplacer `pourApple` par le
 * nonce brut est un « nettoyage » d'apparence anodine que rien d'autre ne signale.
 */
describe('paireNonce — ce qui part chez Apple n\'est pas ce qui part chez Supabase', () => {
  const brut = '4c3028e1-30ca-44e6-9aca-c265c8f72051';

  it('Apple reçoit l\'EMPREINTE du nonce, Supabase reçoit le BRUT', () => {
    const { pourApple, pourSupabase } = paireNonce(brut);
    expect(pourSupabase).toBe(brut);
    expect(pourApple).toBe(sha256Hex(brut));
  });

  it('les deux valeurs ne sont JAMAIS égales — c\'est exactement le défaut du (15)', () => {
    for (const n of [brut, 'a', '', 'kyroz-nonce-2026']) {
      const { pourApple, pourSupabase } = paireNonce(n);
      expect(pourApple).not.toBe(pourSupabase);
    }
  });

  it('la relation est vérifiable dans le sens où Supabase la vérifie', () => {
    // C'est le calcul que fait le serveur : il hache ce qu'on lui donne et compare
    // à la revendication `nonce` du jeton d'identité, qu'Apple a recopiée telle
    // quelle depuis ce qu'on lui avait transmis.
    const { pourApple, pourSupabase } = paireNonce(brut);
    const revendicationDansLeJeton = pourApple;          // Apple recopie, ne hache pas
    expect(sha256Hex(pourSupabase)).toBe(revendicationDansLeJeton);
  });

  it('deux appels rendent des nonces différents', () => {
    // Un nonce réutilisé n'est plus un nonce : il n'empêche plus le rejeu.
    expect(paireNonce('a').pourApple).not.toBe(paireNonce('b').pourApple);
  });
});

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
