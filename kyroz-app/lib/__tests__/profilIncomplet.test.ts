import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computePlan, recalcProfile } from '../tdee';
import {
  CHAMPS_MESURES, champsMesuresManquants, profilCalculable,
  ligneCloudExploitable, normalizeMacroMode, MACRO_MODE_FALLBACK,
} from '../profilComplet';
import { bootProfile } from '../profileBoot';
import { decideProfileHydration } from '../syncGuard';
import { makeProfile } from './helpers';
import { UserProfile } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTAT 02-02 (P0) — « une ligne cloud partielle produit un plan entièrement NaN ».
//
// 🔴 CE QUE LE DÉFAUT COÛTAIT. Une ligne `profiles` où seul `sex` était posé passait
// `hasCloud: !!(row && row.sex)`, écrasait le local, et sortait `NaN` sur le TDEE, la
// cible, le plancher et les trois macros — **en émettant `LOW_EA_WARNING`**. Un échec
// total ressortait habillé en diagnostic de sécurité.
//
// 🔴 ET LA RECO PUBLIÉE (« les quatre champs du BMR ») N'AURAIT FERMÉ QU'UN CINQUIÈME
// DU TROU. Balayage des 41 colonnes, une par une à NULL (`npm run mesure:incomplet`) :
// un seul champ produit du `NaN` (`sex`) ; deux produisent un nombre FINI et absurde
// (`weight_kg` → 0 g de protéines, `height_cm`) ; `macro_mode` — absent de la reco —
// fait GELER les cibles ; et `age` rend un nombre PLAUSIBLE et faux de 260 kcal.
// ➡️ Une garde « pas de NaN » n'aurait attrapé que le premier.
//
// La règle retenue n'est donc pas « pas de NaN », c'est **« on peut replier une
// INTENTION, jamais une MESURE »** : `goal` et `macro_mode` se replient, le corps non.
// ─────────────────────────────────────────────────────────────────────────────

const CORPS_COMPLET = makeProfile({ sex: 'male', age: 40, weight_kg: 90, height_cm: 180 });
const T = '2026-08-27';

describe('1 — le moteur REFUSE plutôt que d’inventer', () => {
  it('la ligne du constat : `{ id, sex }` seul ne produit plus aucun nombre', () => {
    const partiel = { id: 'x', sex: 'male' } as unknown as UserProfile;
    const r = computePlan(partiel, T);
    expect(r.flags).toEqual(['PROFIL_INCOMPLET']);
    // Le drapeau de sécurité menteur a disparu — c'était « le plus gênant » du constat.
    expect(r.flags).not.toContain('LOW_EA_WARNING');
    // Et aucun NaN ne sort : le profil ressort tel qu'il est entré.
    expect(Number.isNaN(r.profile.target_kcal as number)).toBe(false);
    expect(r.profile.target_kcal).toBeUndefined();
    expect(r.clamp).toBeUndefined();
  });

  it('CHACUN des quatre champs de corps, seul, suffit à faire refuser', () => {
    for (const champ of CHAMPS_MESURES) {
      for (const valeur of [null, undefined, 0, NaN, '' as unknown]) {
        const p = { ...CORPS_COMPLET, [champ]: valeur } as UserProfile;
        const r = computePlan(p, T);
        expect(r.flags, `${champ} = ${String(valeur)}`).toContain('PROFIL_INCOMPLET');
        // ⚠️ `0` et `NaN` comptent : ils passent toute garde de PRÉSENCE et produisent
        // pourtant 1500 kcal et zéro protéine, exactement comme `null`.
        expect(champsMesuresManquants(p), `${champ} = ${String(valeur)}`).toContain(champ);
      }
    }
  });

  it('`recalcProfile` sur un profil incomplet ne peut plus écrire de NaN', () => {
    // C'est le vrai enjeu : `useProfile` persiste ce que `recalcProfile` rend, et
    // `pushProfile` l'envoie au cloud. Un NaN écrit ici contamine les deux.
    const p = { ...CORPS_COMPLET, weight_kg: null } as unknown as UserProfile;
    const out = recalcProfile(p, T);
    for (const [k, v] of Object.entries(out)) {
      expect(typeof v === 'number' && Number.isNaN(v), `${k} est NaN`).toBe(false);
    }
    expect(out).toEqual(p);   // rien n'a été inventé
  });

  it('un profil COMPLET n’est jamais refusé — la garde n’est pas un mur', () => {
    const r = computePlan(CORPS_COMPLET, T);
    expect(r.flags).not.toContain('PROFIL_INCOMPLET');
    expect(profilCalculable(CORPS_COMPLET)).toBe(true);
    expect(r.clamp).toBeDefined();
    expect(r.profile.target_kcal).toBeGreaterThan(0);
  });
});

describe('2 — la ligne de partage : une INTENTION se replie, une MESURE non', () => {
  it('`goal` et `macro_mode` absents ne font PAS refuser — ils se replient', () => {
    for (const champ of ['goal', 'macro_mode'] as const) {
      const p = { ...CORPS_COMPLET, [champ]: null } as unknown as UserProfile;
      const r = computePlan(p, T);
      expect(r.flags, champ).not.toContain('PROFIL_INCOMPLET');
      expect(r.profile.target_kcal, champ).toBeGreaterThan(0);
    }
  });

  it('un `macro_mode` inconnu retombe sur `auto`, JAMAIS sur `manual`', () => {
    // 🔴 Le répartiteur s'écrivait `if auto / else if percent / ELSE manual` : toute
    // valeur inconnue tombait dans la branche où le moteur ne recalcule plus rien et
    // sert des grammes figés. C'est un défaut PERMISSIF sur un interrupteur de calcul.
    const gele = makeProfile({
      macro_mode: 'dexa_2027' as never,
      target_kcal: 9999, target_protein_g: 1, target_carbs_g: 1, target_fat_g: 1,
    });
    const r = computePlan(gele, T);
    // Si le repli était `manual`, la cible resterait collée aux grammes figés.
    expect(r.profile.target_kcal).not.toBe(9999);
    expect(r.profile.target_protein_g).toBeGreaterThan(50);
    expect(MACRO_MODE_FALLBACK).toBe('auto');
  });

  it('`normalizeMacroMode` referme la DONNÉE, des deux côtés comme `goal`', () => {
    expect(normalizeMacroMode({ macro_mode: 'manual' } as Partial<UserProfile>)!.macro_mode).toBe('manual');
    expect(normalizeMacroMode({ macro_mode: null } as unknown as Partial<UserProfile>)!.macro_mode).toBe('auto');
    expect(normalizeMacroMode({ macro_mode: 'percent' } as Partial<UserProfile>)!.macro_mode).toBe('percent');
    expect(normalizeMacroMode(null)).toBeNull();
  });
});

describe('3 — le démarrage ne SERT pas un profil sans corps', () => {
  it('un profil local amputé n’est pas servi — et n’est pas effacé non plus', () => {
    // `app/index.tsx` route sur la seule EXISTENCE du profil : le servir enverrait
    // vers l'écran Plan quelqu'un dont le plan ne peut pas exister.
    const ampute = JSON.stringify({ ...CORPS_COMPLET, weight_kg: null });
    const r = bootProfile(ampute, (p) => recalcProfile(p, T));
    expect(r.profile).toBeNull();          // → onboarding
    expect(r.stored).not.toBeNull();       // → mais rien n'est jeté
    expect(r.warn).toMatch(/INCOMPLET/);
    expect(r.warn).toMatch(/weight_kg/);   // la colonne est NOMMÉE, pas juste comptée
    expect(r.degraded).toBe(false);
  });

  it('un profil local COMPLET est servi normalement', () => {
    const r = bootProfile(JSON.stringify(CORPS_COMPLET), (p) => recalcProfile(p, T));
    expect(r.profile).not.toBeNull();
    expect(r.warn).toBeNull();
  });
});

describe('4 — l’hydratation n’écrase plus le local avec une ligne partielle', () => {
  it('la garde ne teste plus le seul `sex`', () => {
    // C'est LA ligne du constat : `hasCloud: !!(row && row.sex)`.
    expect(ligneCloudExploitable({ id: 'x', sex: 'male' })).toBe(false);
    expect(ligneCloudExploitable({ id: 'x', sex: 'male', age: 40, weight_kg: 90, height_cm: 180 })).toBe(true);
    expect(ligneCloudExploitable(null)).toBe(false);
    expect(ligneCloudExploitable({})).toBe(false);
  });

  it('refuser la ligne fait GAGNER le local, il ne le supprime pas', () => {
    // Un refus ne doit pas se lire comme une perte : la décision bascule sur
    // `push_local` (le local complet repart au cloud), pas sur un effacement.
    expect(decideProfileHydration({ hasCloud: false, hasLocal: true, localDirty: false }))
      .toBe('push_local');
    // Et quand il n'y a rien des deux côtés : onboarding, pas un plan vide.
    expect(decideProfileHydration({ hasCloud: false, hasLocal: false, localDirty: false }))
      .toBe('noop');
  });

  // ⚠️ **CE TEST EXISTE PARCE QUE LA MUTATION L'A EXIGÉ.** Remettre
  // `hasCloud: !!(row && row.sex)` dans `lib/sync.ts` laissait tout le reste de ce
  // fichier VERT : il vérifiait la fonction pure, jamais que l'appelant l'appelle.
  // `sync.ts` importe AsyncStorage, donc il n'est pas exécutable ici — la seule façon
  // de tenir le couplage est de LIRE la ligne. Même motif que `analyticsPerimetre`,
  // `fichesOta` et `check:abonnements`.
  it('`hydrateFromCloud` appelle RÉELLEMENT la garde — la ligne est lue', () => {
    const src = readFileSync(join(__dirname, '..', 'sync.ts'), 'utf8');
    // On travaille sur le CODE seul : le commentaire au-dessus de cette ligne cite
    // l'ancienne garde mot pour mot, et un test qui lirait les commentaires se
    // satisferait de la citation.
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    const lignes = code.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('hasCloud:'));
    expect(lignes, 'une seule décision `hasCloud`, et elle est ici').toEqual(
      ['hasCloud: ligneCloudExploitable(row),'],
    );
    // Et l'ancienne garde n'est nulle part dans le code exécuté.
    expect(code).not.toContain('row && row.sex');
  });

  it('une ligne cloud COMPLÈTE reste exploitable — la garde n’a pas fermé la porte', () => {
    const ligne = { id: 'x', sex: 'female', age: 28, weight_kg: 62, height_cm: 168 };
    expect(ligneCloudExploitable(ligne)).toBe(true);
    expect(decideProfileHydration({ hasCloud: true, hasLocal: true, localDirty: false }))
      .toBe('pull_cloud');
  });
});
