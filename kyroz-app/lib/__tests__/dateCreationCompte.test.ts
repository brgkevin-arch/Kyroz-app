// ── La date de création du compte, et d'où elle vient ────────────────────────
//
// 🔴 CE FICHIER EXISTE PARCE QUE LE DÉFAUT A ÉTÉ VU À L'ÉCRAN, PAS DANS LE CODE
// (2026-08-27). Un compte invité créé onze minutes plus tôt affichait
// « Kyroz+ · Inclus à vie », puis redevenait verrouillé au lancement SUIVANT.
//
// La cause n'était pas le repli « date absente → on donne » — celui-là est juste et
// ne bouge pas. C'était sa SOURCE : `usePremium` lisait `profile.created_at`, une
// colonne écrite en UN SEUL endroit (`sync.ts`, à la LECTURE du miroir Supabase).
// Un compte tout juste créé ne l'a donc pas encore, et le repli couvrait alors
// l'intégralité des nouveaux inscrits, pendant toute leur première session.
//
// ⚠️ Ce que ça coûtait, dans l'ordre de gravité :
//  1. le RELECTEUR APPLE crée un compte neuf et ouvre l'app UNE fois — il ne
//     pouvait donc PAS atteindre l'écran d'achat. Motif de rejet, pas manque à gagner ;
//  2. tout nouvel inscrit recevait Kyroz+ gratuitement pendant sa première session,
//     puis le voyait se fermer — la pire façon de présenter un paywall.
//
// ⚠️ Aucune suite ne pouvait l'attraper : les tests d'accès passaient une date, donc
// ils mesuraient la RÈGLE, jamais la SOURCE. C'est ce que ce fichier compte.

import { describe, it, expect } from 'vitest';
import { dateCreationCompte, premiumAccess, canUse, isGrandfathered } from '../premium';

const LANCEMENT = '2026-08-27T00:00:00+02:00';
const AVANT = '2026-08-01T10:00:00Z';   // compte de longue date → grand-péré
const APRES = '2026-08-27T19:28:00Z';   // compte créé après la date → verrouillé

describe('dateCreationCompte — la source, pas la règle', () => {
  it('prend la session quand elle est là, MÊME si le profil n\'a pas encore sa date', () => {
    // C'est exactement l'état d'un compte neuf : session ouverte, miroir pas encore lu.
    expect(dateCreationCompte(APRES, undefined)).toBe(APRES);
  });

  it('retombe sur le profil quand la session manque', () => {
    // Démarrage hors ligne, hydratation en cours : le profil en cache est la seule source.
    expect(dateCreationCompte(undefined, AVANT)).toBe(AVANT);
    expect(dateCreationCompte(null, AVANT)).toBe(AVANT);
  });

  it('la session PASSE DEVANT le profil', () => {
    // `auth.users.created_at` est la date du COMPTE — celle que promettent les CGU §3.
    // `profiles.created_at` date la ligne miroir, créée au premier envoi, donc plus tard.
    expect(dateCreationCompte(AVANT, APRES)).toBe(AVANT);
  });

  it('rend `undefined` quand les deux manquent — le repli reste possible', () => {
    // On ne remplace PAS « date inconnue → on donne » : on l'empêche seulement de
    // couvrir quelqu'un dont la date est parfaitement connue.
    expect(dateCreationCompte(undefined, undefined)).toBeUndefined();
    expect(dateCreationCompte(null, null)).toBeUndefined();
  });
});

describe('le défaut lui-même — un compte neuf est VERROUILLÉ dès sa première session', () => {
  it('session postérieure + profil sans date → locked', () => {
    const acces = premiumAccess({
      entitled: false,
      createdAt: dateCreationCompte(APRES, undefined),
      launch: LANCEMENT,
    });
    expect(acces.allowed).toBe(false);
    expect(acces.reason).toBe('locked');
  });

  it('🔴 la SEULE lecture du profil rendait « grandfathered » — la preuve du défaut', () => {
    // Ce cas n'est pas un souhait : c'est le comportement d'avant le 2026-08-27,
    // reproduit ici pour que sa disparition soit mesurée et non racontée.
    const avantCorrectif = premiumAccess({
      entitled: false,
      createdAt: undefined,       // ce que rendait `profile?.created_at` sur un compte neuf
      launch: LANCEMENT,
    });
    expect(avantCorrectif.allowed).toBe(true);
    expect(avantCorrectif.reason).toBe('grandfathered');
  });

  it('un compte de longue date reste grand-péré, à vie — la promesse des CGU §3 tient', () => {
    const acces = premiumAccess({
      entitled: false,
      createdAt: dateCreationCompte(AVANT, undefined),
      launch: LANCEMENT,
    });
    expect(acces.allowed).toBe(true);
    expect(acces.reason).toBe('grandfathered');
  });

  it('le repli « date inconnue → on donne » n\'est PAS touché', () => {
    expect(isGrandfathered(undefined, LANCEMENT)).toBe(true);
    expect(isGrandfathered(null, LANCEMENT)).toBe(true);
    expect(isGrandfathered('pas une date', LANCEMENT)).toBe(true);
  });
});

describe('canUse — la même porte, fermée du même côté', () => {
  it('verrouille une feature premium sur un compte neuf dont seul le profil manque', () => {
    expect(
      canUse('dated_goal', {
        entitled: false,
        profile: null,
        sessionCreatedAt: APRES,
        launch: LANCEMENT,
      }),
    ).toBe(false);
  });

  it('sans `sessionCreatedAt`, elle retombe sur le profil — donc la compatibilité tient', () => {
    expect(
      canUse('dated_goal', {
        entitled: false,
        profile: { created_at: APRES } as never,
        launch: LANCEMENT,
      }),
    ).toBe(false);
  });
});
