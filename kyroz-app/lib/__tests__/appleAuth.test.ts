import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { consentSanteManquant, paireNonce, prenomApple } from '../appleAuth';
import { estIdentiteApple } from '../identiteApple';
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


// ── VERROU : on ne REDEMANDE pas ce qu'Apple a déjà donné ────────────────────
//
// 🔴 REJET APPLE DU 2026-09-10, guideline 4 (Design) :
//
// > *« The app offers Sign in with Apple as a login option but does not follow the
// > design and user experience requirements for Sign in with Apple. Specifically,
// > users are required to provide their name and/or email address after using Sign in
// > with Apple even though that information is already provided by the Authentication
// > Services framework. »*
//
// Le correctif tient en TROIS moitiés, et il en faut trois — chacune couvre un chemin
// que les deux autres laissent ouvert :
//   1. **demander** le scope `FULL_NAME` (`lib/appleAuth.ts`) ;
//   2. **le persister à l'instant même** (`hooks/useAuth.tsx`) — Apple ne le rend
//      qu'à la toute première autorisation du compte ;
//   3. **ne plus BLOQUER** l'étape 1 pour un compte Apple (`onboarding.tsx`) — parce
//      qu'à la deuxième connexion, `fullName` vaut `null` et le champ redeviendrait un
//      mur. C'est le chemin d'une CONTRE-vérification par le relecteur.
//
// ⚠️ Livrer 1 et 2 sans 3 rejouerait le rejet à l'identique, sur l'essai le plus
// probable. C'est pour ça que les trois sont comptées ici, dans le même fichier.
const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentairesJS = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('Sign in with Apple — le prénom vient d\'Apple, pas d\'un formulaire', () => {
  it('le scope FULL_NAME est DEMANDÉ — sans lui, Apple ne propose rien à donner', () => {
    const src = sansCommentairesJS(lire('lib/appleAuth.ts'));
    expect(src, 'scope FULL_NAME absent : Apple ne renverra jamais de nom').toContain('AppleAuthenticationScope.FULL_NAME');
    expect(src).toContain('AppleAuthenticationScope.EMAIL');
  });

  it('prenomApple lit le prénom quand Apple le donne', () => {
    expect(prenomApple({ givenName: 'Kévin' })).toBe('Kévin');
    expect(prenomApple({ givenName: '  Kévin  ' })).toBe('Kévin');
  });

  it('prenomApple rend null sur les trois absences, et jamais une chaîne vide', () => {
    // Une chaîne vide écraserait un prénom déjà connu — c'est le cas qui compte.
    // `null` = toute connexion SUIVANTE ; l'objet vide = la personne a effacé les
    // champs dans la feuille système avant de valider ; `undefined` = scope refusé.
    expect(prenomApple(null)).toBeNull();
    expect(prenomApple(undefined)).toBeNull();
    expect(prenomApple({})).toBeNull();
    expect(prenomApple({ givenName: null })).toBeNull();
    expect(prenomApple({ givenName: '   ' })).toBeNull();
  });

  it('le prénom est persisté AU MOMENT de la connexion, pas plus tard', () => {
    // 🔴 Apple ne rend `fullName` qu'à la PREMIÈRE autorisation. Différer l'écriture
    // — au montage de l'onboarding, à la fin de l'inscription — c'est le perdre.
    const src = sansCommentairesJS(lire('hooks/useAuth.tsx'));
    expect(src, 'le prénom d\'Apple n\'est jamais écrit').toContain('saveFirstName(r.prenom)');
    // Et on n'écrase pas un prénom déjà posé (correction faite dans Profil).
    expect(src, 'l\'écriture n\'est pas gardée : elle écraserait une correction de l\'utilisateur')
      .toContain('!getFirstName()');
  });

  it('l\'onboarding SÈME le champ au lieu de partir vide', () => {
    const src = sansCommentairesJS(lire('app/(auth)/onboarding.tsx'));
    expect(src, 'le champ prénom repart de zéro : le prénom d\'Apple est jeté')
      .toContain('useState(() => getFirstName())');
  });

  it('🔴 l\'étape 1 ne BLOQUE plus un compte Apple', () => {
    // La moitié qu'on oublie, et la seule que le relecteur atteint en réessayant.
    const src = sansCommentairesJS(lire('app/(auth)/onboarding.tsx'));
    expect(src).toContain('estIdentiteApple');
    expect(src, 'la validité de l\'étape 1 ne tient pas compte du compte Apple')
      .toMatch(/const firstNameValid = parApple \|\|/);
  });

  it('le champ reste AFFICHÉ et modifiable — on retire l\'obligation, pas le choix', () => {
    const src = sansCommentairesJS(lire('app/(auth)/onboarding.tsx'));
    expect(src).toContain('<NameStep');
    expect(src, 'rien ne dit à l\'utilisateur d\'où sort ce prénom').toContain('venuDApple');
  });
});

describe('estIdentiteApple — quel fournisseur a ouvert cette session', () => {
  it('reconnaît le fournisseur principal', () => {
    expect(estIdentiteApple({ app_metadata: { provider: 'apple' } })).toBe(true);
  });

  it('reconnaît Apple parmi PLUSIEURS identités liées', () => {
    // `provider` ne nomme que la dernière employée. Ne lire que lui ferait retomber
    // sur le champ bloquant quelqu'un qui a bel et bien Apple sur son compte.
    expect(estIdentiteApple({ app_metadata: { provider: 'email', providers: ['email', 'apple'] } })).toBe(true);
  });

  it('dit NON pour un compte e-mail, un compte invité, et l\'absence de métadonnées', () => {
    // Un test qu'on n'a jamais vu dire non ne prouve rien.
    expect(estIdentiteApple({ app_metadata: { provider: 'email', providers: ['email'] } })).toBe(false);
    expect(estIdentiteApple({ app_metadata: { provider: 'anonymous' } })).toBe(false);
    expect(estIdentiteApple({ app_metadata: {} })).toBe(false);
    expect(estIdentiteApple({})).toBe(false);
    expect(estIdentiteApple(null)).toBe(false);
    expect(estIdentiteApple(undefined)).toBe(false);
  });
});
