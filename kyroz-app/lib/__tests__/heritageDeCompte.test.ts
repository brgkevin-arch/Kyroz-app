import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CLES_CONSERVEES, clesAPurger, proprietaireLocal, doitPurgerAvantHydratation, profilServable,
} from '../sessionLocale';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTAT 01-01 (P0) — « un compte peut hériter des données du précédent ».
//
// 🔴 Il y avait deux moitiés ; il n'en reste qu'une depuis le 2026-09-19 :
//  1. ~~la PURGE à la déconnexion (`signOut()` et `SIGNED_OUT`)~~ — RETIRÉE, décision du
//     fondateur : « si un plan a été généré et que l'user se déco, il a plus son plan ?
//     nul un peu ». Elle effaçait plan, suivi et photos à chaque reconnexion ;
//  2. l'IDENTITÉ à l'hydratation — le point de passage unique de toute connexion, et
//     désormais la SEULE garde. Elle lit le PROPRIÉTAIRE noté sur l'appareil
//     (`CLE_PROPRIETAIRE`) : l'`id` du profil ne suffit plus, un profil d'inscription
//     (`user-<horodatage>`) passerait pour « sans compte » chez le compte suivant.
//
// La moitié 2 est exercée de bout en bout dans `sync.test.ts` (sur l'orchestration
// réelle). Ce fichier tient les DÉCISIONS pures, et **le câblage** — parce que
// `hooks/useAuth.tsx` n'est pas exécutable ici et qu'un garde-fou qui ne vérifie pas
// que l'appelant appelle ne garde rien (c'est la mutation qui l'a montré, deux fois).
// ─────────────────────────────────────────────────────────────────────────────

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

describe('1 — à qui appartiennent les données posées sur cet appareil ?', () => {
  it('le MÊME compte se reconnaît', () => {
    expect(proprietaireLocal('uid-de-A', 'uid-de-A')).toBe('meme');
    expect(doitPurgerAvantHydratation('uid-de-A', null, 'uid-de-A')).toBe(false);
  });

  it('un AUTRE compte se reconnaît, et déclenche la purge', () => {
    expect(proprietaireLocal('uid-de-A', 'uid-de-B')).toBe('autre');
    expect(doitPurgerAvantHydratation('uid-de-A', null, 'uid-de-B')).toBe(true);
  });

  it('🔴 UNE INSCRIPTION EN COURS N’EST PAS LE PROFIL D’AUTRUI (CA-1-04)', () => {
    // La reco publiée dit : « un profil dont l'`id` diffère de l'`uid` entrant se
    // jette ». Appliquée à la lettre, elle détruit le profil de quelqu'un dont le push
    // a échoué hors ligne juste après l'inscription — son `id` est `user-<horodatage>`
    // (`onboarding.tsx`), pas un uid. C'est un cas SAIN, et le plus fréquent des trois.
    expect(proprietaireLocal('user-1756300000000', 'uid-de-A')).toBe('sans_compte');
    expect(doitPurgerAvantHydratation('user-1756300000000', null, 'uid-de-A')).toBe(false);
    // Et un profil sans `id` du tout non plus (formes anciennes, tests).
    expect(proprietaireLocal(undefined, 'uid-de-A')).toBe('sans_compte');
    expect(proprietaireLocal(null, 'uid-de-A')).toBe('sans_compte');
    expect(proprietaireLocal('', 'uid-de-A')).toBe('sans_compte');
  });

  it('le défaut n’est PAS permissif : une forme inconnue compte comme AUTRUI', () => {
    // ⚠️ Les deux erreurs ne se valent pas. Classer à tort en `sans_compte` fait FUIR
    // des données de santé vers un autre compte ; classer à tort en `autre` fait perdre
    // un profil d'une forme d'`id` qu'aucun producteur de ce dépôt n'écrit. On teste
    // donc l'APPARTENANCE à une forme connue, jamais l'absence d'une autre.
    for (const exotique of ['user-abc', 'user-', 'USER-123', 'local-123', 'user-12x3', '42']) {
      expect(proprietaireLocal(exotique, 'uid-de-A'), exotique).toBe('autre');
    }
    // Et une valeur qui n'est même pas une chaîne ne se laisse pas prendre pour un uid.
    expect(proprietaireLocal(42, 'uid-de-A')).toBe('sans_compte');
    expect(proprietaireLocal({ id: 'x' }, 'uid-de-A')).toBe('sans_compte');
  });
});

describe('1 bis — le PROPRIÉTAIRE noté fait foi (2026-09-19)', () => {
  it('🔴 un profil d’inscription d’un AUTRE compte est purgé — le cas que l’`id` ne voit pas', () => {
    // A s'inscrit (profil `user-<horodatage>`), se déconnecte : ses données RESTENT. B se
    // connecte : sans propriétaire noté, `proprietaireLocal` dirait « sans compte » et le
    // profil de A partirait dans le cloud de B.
    expect(doitPurgerAvantHydratation('user-1756300000000', 'uid-de-A', 'uid-de-B')).toBe(true);
    expect(doitPurgerAvantHydratation('user-1756300000000', 'uid-de-A', 'uid-de-A')).toBe(false);
  });

  it('le propriétaire l’emporte sur l’`id` du profil, dans les deux sens', () => {
    expect(doitPurgerAvantHydratation('uid-de-A', 'uid-de-A', 'uid-de-B')).toBe(true);
    expect(doitPurgerAvantHydratation('uid-de-A', 'uid-de-A', 'uid-de-A')).toBe(false);
    // Un profil illisible (id inconnu) ne sauve rien : le propriétaire décide seul.
    expect(doitPurgerAvantHydratation(null, 'uid-de-A', 'uid-de-B')).toBe(true);
  });

  it('un propriétaire vide ou d’un autre type retombe sur l’ancienne règle', () => {
    expect(doitPurgerAvantHydratation('uid-de-A', '', 'uid-de-B')).toBe(true);
    expect(doitPurgerAvantHydratation('user-1756300000000', 42, 'uid-de-A')).toBe(false);
  });

  it('🔴 le profil n’est servi qu’à son propriétaire, et jamais sans session', () => {
    expect(profilServable('uid-de-A', 'uid-de-A', 'uid-de-A')).toBe(true);
    expect(profilServable('uid-de-A', 'uid-de-A', 'uid-de-B')).toBe(false);
    expect(profilServable('user-1756300000000', 'uid-de-A', 'uid-de-B')).toBe(false);
    expect(profilServable('uid-de-A', 'uid-de-A', null)).toBe(false);
    expect(profilServable('uid-de-A', 'uid-de-A', undefined)).toBe(false);
    // Appareil d'avant (aucun propriétaire noté) : la session en cours reste servie.
    expect(profilServable('user-1756300000000', null, 'uid-de-A')).toBe(true);
  });
});

describe('2 — ce que la purge (de CHANGEMENT DE COMPTE) épargne, et ce qu’elle emporte', () => {
  it('la liste blanche ne garde que des préférences d’APPAREIL', () => {
    expect([...CLES_CONSERVEES].sort()).toEqual(['@kyroz:reminder', '@kyroz:theme']);
  });

  it('au changement de compte, l’accueil se rejoue — c’est une AUTRE personne', () => {
    // Les « déjà vu » ont été gardés le matin du 2026-09-19, puis rendus à la purge :
    // la déconnexion ne purge plus, donc la purge ne frappe plus qu'un compte DIFFÉRENT.
    // Pour lui, « ton premier plan est prêt » est vrai, et les visites sont neuves.
    const dejaVu = ['@kyroz:tour:plan', '@kyroz:tour:profil', '@kyroz:firstPlanSeen',
      '@kyroz:reminderOffered', '@kyroz:preferencesProteinesRevues'];
    expect(clesAPurger(dejaVu)).toEqual(dejaVu);
  });

  it('tout le reste part — une clé NOUVELLE est purgée par défaut', () => {
    // ⚠️ C'est le sens de la liste : en liste NOIRE, toute clé ajoutée après coup
    // survivrait en silence — le défaut de 01-01, un cran plus bas.
    const toutes = [
      '@kyroz:profile', '@kyroz:weights', '@kyroz:weightPhotos', '@kyroz:pantry',
      '@kyroz:favorites', '@kyroz:streak', '@kyroz:theme', '@kyroz:reminder',
      '@kyroz:cle-inventee-demain', 'sb-abc-auth-token',
    ];
    const partis = clesAPurger(toutes);
    expect(partis).toContain('@kyroz:cle-inventee-demain');
    expect(partis).toContain('@kyroz:weightPhotos');
    expect(partis).toContain('sb-abc-auth-token');
    expect(partis).not.toContain('@kyroz:theme');
    expect(partis).not.toContain('@kyroz:reminder');
    expect(partis).toHaveLength(toutes.length - 2);
  });

  it('un stockage vide ne fait rien planter', () => {
    expect(clesAPurger([])).toEqual([]);
  });
});

describe('3 — LE CÂBLAGE : la déconnexion garde tout, le changement de compte purge', () => {
  // ⚠️ `hooks/useAuth.tsx` tire le runtime React Native et Supabase : il n'est pas
  // exécutable dans cette suite. Ce qui suit LIT la source — c'est le seul moyen de
  // tenir un couplage qui, sinon, se défait sans qu'aucun test ne rougisse. Même motif
  // que `analyticsPerimetre`, `fichesOta` et le test de `hasCloud` (02-02).
  const useAuth = sansCommentaires(readFileSync(join(RACINE, 'hooks', 'useAuth.tsx'), 'utf8'));

  const corpsSignOut = (() => {
    const i = useAuth.indexOf('const signOut =');
    expect(i, 'signOut introuvable').toBeGreaterThan(-1);
    return useAuth.slice(i, useAuth.indexOf('\n  };', i));
  })();

  it('🔴 `signOut` NE purge PAS — le plan, le suivi et les photos attendent la reconnexion', () => {
    expect(corpsSignOut).not.toMatch(/purgerSessionLocale|AsyncStorage\.(clear|multiRemove|removeItem)/);
  });

  it('🔴 `signOut` confirme le PROPRIÉTAIRE avant de couper — sinon B hériterait de A', () => {
    const note = corpsSignOut.indexOf('CLE_PROPRIETAIRE');
    const coupe = corpsSignOut.indexOf('supabase.auth.signOut()');
    expect(note, 'signOut ne note plus le propriétaire').toBeGreaterThan(-1);
    expect(note).toBeLessThan(coupe);
  });

  it('l’événement `SIGNED_OUT` ne purge plus — une session perdue n’efface rien', () => {
    expect(useAuth).not.toMatch(/SIGNED_OUT[^\n]*purgerSessionLocale/);
  });

  it('🔴 l’hydratation note le propriétaire APRÈS sa garde, jamais avant', () => {
    const sync = sansCommentaires(readFileSync(join(RACINE, 'lib', 'sync.ts'), 'utf8'));
    const corps = sync.slice(sync.indexOf('export async function hydrateFromCloud'));
    const lecture = corps.indexOf('getItem(CLE_PROPRIETAIRE)');
    const garde = corps.indexOf('if (doitPurger)');
    const ecriture = corps.indexOf('setItem(CLE_PROPRIETAIRE, uid)');
    expect(lecture, 'la garde ne lit plus le propriétaire').toBeGreaterThan(-1);
    expect(ecriture, 'l’hydratation ne note plus le propriétaire').toBeGreaterThan(garde);
    expect(garde).toBeGreaterThan(lecture);
  });

  it('🔴 le profil stocké ne s’affiche qu’à son propriétaire (`profilServable`)', () => {
    const useProfile = sansCommentaires(readFileSync(join(RACINE, 'hooks', 'useProfile.ts'), 'utf8'));
    expect(useProfile).toMatch(/if \(!profilServable\(idLocal, proprietaire, uid\)\)/);
  });

  it('🔴 le propriétaire est lu AVANT le profil, jamais en parallèle (course mesurée au simulateur)', () => {
    // Lus ensemble, le profil de A sortait avant la purge et le propriétaire B après :
    // A passait pour B. Dans cet ordre, lire B garantit que la purge est faite.
    const useProfile = sansCommentaires(readFileSync(join(RACINE, 'hooks', 'useProfile.ts'), 'utf8'));
    const proprio = useProfile.indexOf('AsyncStorage.getItem(CLE_PROPRIETAIRE)');
    const profil = useProfile.indexOf('await AsyncStorage.getItem(PROFILE_KEY)');
    expect(proprio, 'lecture du propriétaire introuvable').toBeGreaterThan(-1);
    expect(profil, 'lecture du profil introuvable').toBeGreaterThan(proprio);
    expect(useProfile).not.toMatch(/Promise\.all\(\[[^\]]*CLE_PROPRIETAIRE/);
  });

  it('🔴 mais PAS sur une session nulle — sinon l’inscription en cours meurt au démarrage', () => {
    // `INITIAL_SESSION` arrive avec `session: null` à chaque lancement sans compte.
    // Purger là-dessus effacerait, à chaque démarrage, l'onboarding de quelqu'un qui
    // n'a pas encore de compte. C'est le piège `CA-1-04`, un étage plus haut.
    expect(useAuth).not.toMatch(/if \(!s\)[^\n]*purgerSessionLocale/);
    expect(useAuth).not.toMatch(/s === null[^\n]*purgerSessionLocale/);
  });

  it('`hydrateFromCloud` reçoit une purge RÉELLE, pas un no-op', () => {
    // Le paramètre est requis (donc `tsc` l'exige), mais rien n'empêche d'y passer
    // `async () => {}` — la garde d'identité deviendrait alors décorative.
    expect(useAuth).toMatch(/const purger = \(\) => purgerSessionLocale\(EFFETS_PURGE\);/);
    expect(useAuth).toMatch(/hydrateFromCloud\(uid, purger\)/);
  });

  it('🔴 après une purge de changement de compte, l’app REDÉMARRE — la mémoire garde encore A', () => {
    // Mesuré au simulateur le 2026-09-19 : prénom, pesées, recettes personnalisées sont
    // lus au démarrage, avant la garde. Seul un redémarrage les relit tous.
    expect(useAuth).toMatch(/if \(issue !== 'purge'\) return;\s*if \(await redemarrerApp\(\)\) return;\s*await hydrateFromCloud\(uid, purger\);/);
  });

  it('les deux effets de la purge sont branchés sur les vraies fonctions', () => {
    const effets = sansCommentaires(readFileSync(join(RACINE, 'lib', 'effetsPurge.ts'), 'utf8'));
    expect(effets).toMatch(/photos:\s*purgeAllProgressPhotos/);
    expect(effets).toMatch(/notificationPesee:\s*cancelWeighInReminder/);
  });

  it('le profil EN MÉMOIRE se relit au changement de compte', () => {
    // Purger le stockage ne vide pas l'état React : sans cette dépendance, l'écran
    // continue d'afficher le profil du compte précédent après la purge.
    const useProfile = sansCommentaires(readFileSync(join(RACINE, 'hooks', 'useProfile.ts'), 'utf8'));
    expect(useProfile).toMatch(/\}, \[ready, hydrationTick, uid\]\);/);
  });
});
