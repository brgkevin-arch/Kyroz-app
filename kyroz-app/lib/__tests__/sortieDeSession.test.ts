import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// Une notification armée vit dans le SYSTÈME, pas dans l'app. Elle ne part ni
// avec `AsyncStorage.clear()`, ni avec le compte, ni avec l'app désinstallée par
// l'utilisateur d'à côté. Et `WEIGH_ID-0` peut être un déclencheur RÉPÉTITIF :
// une fois armé, il se rejoue tout seul, indéfiniment, sans que l'app y soit
// pour rien.
//
// Le défaut réel, mesuré avant ce fichier : « Supprimer définitivement » faisait
// `deleteAccount` → `signOut` → `AsyncStorage.clear` → `clearProfile`, et zéro
// annulation. Le rappel de pesée continuait de tomber chaque semaine sur un
// compte effacé — et la purge venait justement de retirer le seul écran d'où on
// aurait pu le couper.
//
// ⚠️ Ce que ce fichier NE fait pas : vérifier que deux lignes ont été écrites.
// Un test écrit sur le correctif du jour ne voit pas le TROISIÈME chemin de
// sortie que quelqu'un ajoutera dans six mois. Il recense donc les chemins par
// leur RÔLE — « toute fonction qui purge le profil » — et exige de chacun qu'il
// éteigne quelque chose. C'est un test qui compte ses appelants, pas un test qui
// relit un diff.

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const profil = sansCommentaires(readFileSync(join(RACINE, 'app', '(tabs)', 'profil.tsx'), 'utf8'));
const notifs = sansCommentaires(readFileSync(join(RACINE, 'lib', 'notifications.ts'), 'utf8'));
const photos = sansCommentaires(readFileSync(join(RACINE, 'lib', 'photos.ts'), 'utf8'));
const weightLog = sansCommentaires(readFileSync(join(RACINE, 'hooks', 'useWeightLog.ts'), 'utf8'));

/** Corps de chaque `const <nom> = async () => { … }`, par appariement d'accolades. */
function fonctionsFlechees(src: string): { nom: string; corps: string }[] {
  const out: { nom: string; corps: string }[] = [];
  const debut = /const\s+(\w+)\s*=\s*async\s*\(\s*\)\s*=>\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = debut.exec(src))) {
    let i = debut.lastIndex - 1;
    let profondeur = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') profondeur++;
      else if (src[i] === '}' && --profondeur === 0) break;
    }
    out.push({ nom: m[1], corps: src.slice(debut.lastIndex, i) });
  }
  return out;
}

// ── Les chemins de sortie, recensés par leur rôle ───────────────────────────
describe('sortie de session — aucun chemin ne laisse une notification armée', () => {
  // `clearProfile()` est la signature d'une sortie : c'est le geste qui retire
  // du téléphone la personne à qui les rappels s'adressent.
  const sorties = fonctionsFlechees(profil).filter((f) => f.corps.includes('clearProfile()'));

  it('les chemins de sortie de `profil.tsx` sont bien ceux qu’on croit', () => {
    // Si ce compte bouge, c'est qu'un chemin est né ou a disparu : le test
    // suivant doit être relu, pas ce chiffre ajusté.
    expect(sorties.map((f) => f.nom).sort()).toEqual(['doDelete', 'doLogout']);
  });

  it('🔴 CHAQUE chemin de sortie éteint des notifications', () => {
    for (const { nom, corps } of sorties) {
      expect(
        /await\s+cancel(AllReminders|WeighInReminder)\(\)/.test(corps),
        `« ${nom} » purge le profil sans éteindre une seule notification : ` +
        'la cadence de pesée vit DANS ce profil, donc plus rien ne pourra ni la ' +
        'ré-armer ni l’annuler. Ajoute `await cancelAllReminders()` (effacement) ' +
        'ou `await cancelWeighInReminder()` (déconnexion).',
      ).toBe(true);
    }
  });

  it('l’effacement de compte éteint TOUT, la déconnexion seulement la pesée', () => {
    const doDelete = sorties.find((f) => f.nom === 'doDelete')?.corps ?? '';
    const doLogout = sorties.find((f) => f.nom === 'doLogout')?.corps ?? '';
    // Effacer : il ne reste aucun rappel légitime à préserver.
    expect(doDelete).toMatch(/await\s+cancelAllReminders\(\)/);
    // Se déconnecter : le rappel QUOTIDIEN survit exprès (`@kyroz:reminder` est
    // dans `KEEP`, c'est une préférence d'appareil que le démarrage relit).
    // Tout éteindre ici l'effacerait sans que personne ne le ré-arme.
    expect(doLogout).toMatch(/await\s+cancelWeighInReminder\(\)/);
    expect(doLogout).not.toMatch(/cancelAllReminders/);
    expect(doLogout).toMatch(/'@kyroz:reminder'/);
  });

  it('l’extinction précède la purge — l’ordre est ce qui la rend possible', () => {
    const corps = sorties.find((f) => f.nom === 'doDelete')?.corps ?? '';
    const extinction = corps.indexOf('cancelAllReminders');
    const purge = corps.indexOf('AsyncStorage.clear()');
    expect(extinction, 'cancelAllReminders introuvable dans doDelete').toBeGreaterThan(-1);
    expect(purge, 'AsyncStorage.clear introuvable dans doDelete').toBeGreaterThan(-1);
    expect(extinction).toBeLessThan(purge);
  });
});

// ── L'outil d'extinction lui-même ───────────────────────────────────────────
describe('notifications — l’extinction totale est réservée à l’effacement', () => {
  it('🔴 `cancelAllScheduledNotificationsAsync` n’existe qu’à UN endroit', () => {
    // Ailleurs, tout annuler effacerait l'autre rappel : c'est la doctrine posée
    // en tête de `lib/notifications.ts`, et deux incidents l'ont déjà payée.
    const appels = notifs.match(/cancelAllScheduledNotificationsAsync/g) ?? [];
    expect(appels.length).toBe(1);
    const bloc = /export async function cancelAllReminders[\s\S]*?\n}/.exec(notifs)?.[0] ?? '';
    expect(bloc, 'cancelAllReminders introuvable').not.toBe('');
    expect(bloc).toContain('cancelAllScheduledNotificationsAsync');
  });

  it('l’effacement retire aussi ce qui est DÉJÀ tombé dans le centre', () => {
    const bloc = /export async function cancelAllReminders[\s\S]*?\n}/.exec(notifs)?.[0] ?? '';
    // Une notification délivrée ne se déprogramme pas : elle se retire.
    expect(bloc).toContain('dismissAllNotificationsAsync');
  });

  it('🔴 `WEIGH_IDS` n’a qu’un seul consommateur, pour qu’aucun appelant ne l’oublie', () => {
    // Le défaut historique de ce fichier est un identifiant oublié dans une
    // liste recopiée. Un seul lecteur de la liste = une seule chose à corriger
    // le jour où un identifiant s'y ajoute.
    expect((notifs.match(/for \(const id of WEIGH_IDS\)/g) ?? []).length).toBe(1);
    const bloc = /export async function cancelWeighInReminder[\s\S]*?\n}/.exec(notifs)?.[0] ?? '';
    expect(bloc, 'cancelWeighInReminder introuvable').not.toBe('');
    expect(bloc).toContain('for (const id of WEIGH_IDS)');
    // Et le chemin d'armement passe par lui, il ne re-boucle pas de son côté.
    const armement = /export async function applyWeighInReminder[\s\S]*?\n}/.exec(notifs)?.[0] ?? '';
    expect(armement).toContain('await cancelWeighInReminder()');
  });
});

// ── Les photos : la carte ne part pas sans les octets ───────────────────────
//
// `expo-image-picker` écrit dans le répertoire de CACHE de l'app, et `setPhoto`
// n'enregistre qu'une carte `date → URI`. Effacer la carte laisse donc les
// octets — des photos de corps, en clair, que plus rien ne désigne.
describe('sortie de session — les photos de progression partent avec le reste', () => {
  const sorties = fonctionsFlechees(profil).filter((f) => f.corps.includes('clearProfile()'));

  it('🔴 CHAQUE chemin de sortie efface les fichiers, pas seulement la carte', () => {
    for (const { nom, corps } of sorties) {
      expect(
        /await\s+purgeAllProgressPhotos\(\)/.test(corps),
        `« ${nom} » purge le stockage sans effacer les photos : leurs octets ` +
        'restent sur l’appareil, et la carte qui les désignait vient de partir. ' +
        'Même à la déconnexion — les photos ne sont jamais poussées au cloud, ' +
        'elles ne reviendront pas à la reconnexion.',
      ).toBe(true);
    }
  });

  it('🔴 l’effacement des photos précède la purge du stockage — sinon il n’a plus l’adresse', () => {
    for (const { nom, corps } of sorties) {
      const photos = corps.indexOf('purgeAllProgressPhotos');
      const purge = corps.search(/AsyncStorage\.(clear\(\)|multiRemove)/);
      expect(photos, `purgeAllProgressPhotos introuvable dans ${nom}`).toBeGreaterThan(-1);
      expect(purge, `purge du stockage introuvable dans ${nom}`).toBeGreaterThan(-1);
      expect(photos, `dans « ${nom} », la carte est effacée avant les fichiers`).toBeLessThan(purge);
    }
  });
});

describe('photos — un seul propriétaire pour la carte et pour les octets', () => {
  it('`PHOTOS_KEY` n’est déclarée qu’une fois, dans le fichier qui efface les fichiers', () => {
    expect(photos).toMatch(/export const PHOTOS_KEY = '@kyroz:weightPhotos'/);
    // `useWeightLog` l'IMPORTE ; s'il la redéclarait, la carte pourrait partir
    // d'un côté sans que l'autre efface quoi que ce soit.
    expect(weightLog).not.toMatch(/const PHOTOS_KEY\s*=/);
    expect(weightLog).toMatch(/import \{[^}]*PHOTOS_KEY[^}]*\} from '\.\.\/lib\/photos'/);
  });

  it('🔴 on n’efface QUE nos fichiers — jamais la photothèque de l’utilisateur', () => {
    const bloc = /export function deleteProgressPhoto[\s\S]*?\n}/.exec(photos)?.[0] ?? '';
    expect(bloc, 'deleteProgressPhoto introuvable').not.toBe('');
    // Un `ph://` désigne la photo dans l'album de l'utilisateur, pas notre copie.
    // Un `blob:`/`data:` (web) ne désigne aucun fichier.
    expect(bloc).toContain("startsWith('file://')");
    expect(bloc).toContain("Platform.OS === 'web'");
  });

  it('remplacer ou retirer une photo efface l’ancienne', () => {
    const bloc = /const setPhoto = useCallback[\s\S]*?\n  \}, \[/.exec(weightLog)?.[0] ?? '';
    expect(bloc, 'setPhoto introuvable').not.toBe('');
    expect(bloc).toMatch(/deleteProgressPhoto\(ancienne\)/);
  });
});
