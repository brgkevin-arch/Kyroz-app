import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CLES_CONSERVEES, clesAPurger, proprietaireLocal, doitPurgerAvantHydratation,
} from '../sessionLocale';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTAT 01-01 (P0) — « un compte peut hériter des données du précédent ».
//
// 🔴 Deux moitiés, et elles ne couvrent pas le même trou :
//  1. la PURGE, devenue propriété de `signOut()` **et** de l'événement `SIGNED_OUT` —
//     c'est ce qui protège les données au REPOS sur un appareil partagé, et le seul
//     chemin qui voie les pertes de session involontaires (jeton révoqué, mot de passe
//     changé ailleurs, compte supprimé à distance, rafraîchissement échoué) ;
//  2. l'IDENTITÉ à l'hydratation — le point de passage unique de toute connexion, donc
//     la seule garantie qui tienne même si la purge n'a pas eu lieu.
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
    expect(doitPurgerAvantHydratation('uid-de-A', 'uid-de-A')).toBe(false);
  });

  it('un AUTRE compte se reconnaît, et déclenche la purge', () => {
    expect(proprietaireLocal('uid-de-A', 'uid-de-B')).toBe('autre');
    expect(doitPurgerAvantHydratation('uid-de-A', 'uid-de-B')).toBe(true);
  });

  it('🔴 UNE INSCRIPTION EN COURS N’EST PAS LE PROFIL D’AUTRUI (CA-1-04)', () => {
    // La reco publiée dit : « un profil dont l'`id` diffère de l'`uid` entrant se
    // jette ». Appliquée à la lettre, elle détruit le profil de quelqu'un dont le push
    // a échoué hors ligne juste après l'inscription — son `id` est `user-<horodatage>`
    // (`onboarding.tsx`), pas un uid. C'est un cas SAIN, et le plus fréquent des trois.
    expect(proprietaireLocal('user-1756300000000', 'uid-de-A')).toBe('sans_compte');
    expect(doitPurgerAvantHydratation('user-1756300000000', 'uid-de-A')).toBe(false);
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

describe('2 — ce que la purge épargne, et ce qu’elle emporte', () => {
  it('la liste blanche ne garde que des préférences d’APPAREIL', () => {
    expect([...CLES_CONSERVEES].sort()).toEqual(['@kyroz:reminder', '@kyroz:theme']);
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

describe('3 — LE CÂBLAGE : la purge est branchée là où les sessions meurent', () => {
  // ⚠️ `hooks/useAuth.tsx` tire le runtime React Native et Supabase : il n'est pas
  // exécutable dans cette suite. Ce qui suit LIT la source — c'est le seul moyen de
  // tenir un couplage qui, sinon, se défait sans qu'aucun test ne rougisse. Même motif
  // que `analyticsPerimetre`, `fichesOta` et le test de `hasCloud` (02-02).
  const useAuth = sansCommentaires(readFileSync(join(RACINE, 'hooks', 'useAuth.tsx'), 'utf8'));

  it('`signOut` purge — la purge n’est plus une propriété de son appelant', () => {
    const corps = useAuth.slice(useAuth.indexOf('const signOut ='));
    expect(corps).toMatch(/purgerSessionLocale\(/);
  });

  it('🔴 l’événement `SIGNED_OUT` purge — c’est lui qui voit les pertes INVOLONTAIRES', () => {
    expect(useAuth).toMatch(/event === 'SIGNED_OUT'[^\n]*purgerSessionLocale/);
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
    expect(useAuth).toMatch(/hydrateFromCloud\(uid,[\s\S]{0,60}?purgerSessionLocale\(EFFETS_PURGE\)/);
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
