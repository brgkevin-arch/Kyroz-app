import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les clés d'environnement ont DEUX chemins possibles, et ils ne servent pas la
 * même chose :
 *   • `eas.json` → `build.<profil>.env` — lu par `eas build` UNIQUEMENT ;
 *   • variables d'environnement EAS (serveur) — lues par `eas build` ET `eas update`.
 *
 * ⚠️ Le piège, mesuré le 2026-08-03 : les clés Supabase ne vivaient QUE dans
 * `eas.json`. Un `eas update` publie un bundle construit sans elles — export vérifié,
 * `rgdjsdnqlmfkourrhijv` et `sb_publishable_` à ZÉRO occurrence — et l'app ne démarre
 * pas sans. Une OTA atteint tout le monde en quelques minutes, sans revue pour l'arrêter.
 *
 * ⚠️ Le second piège : quand une clé est dans les DEUX, c'est `eas.json` qui GAGNE
 * (eas-cli, `evaluateConfigWithEnvVarsAsync` : `{ ...serverEnvVars, ...buildProfile.env }`).
 * Faire tourner une clé côté serveur seulement laisserait donc les builds servir
 * l'ancienne valeur, en silence. EAS l'écrit dans sa sortie — encore faut-il la lire.
 *
 * ➡️ Règle : une seule source de vérité, le serveur EAS. `eas.json` ne porte plus de
 * clé, et chaque profil DÉCLARE son environnement au lieu de le laisser déduire.
 *
 * Vérification hors test (elle demande le réseau) :
 *   npx eas-cli config --profile production --platform ios
 */

const EAS = JSON.parse(readFileSync(join(__dirname, '../../eas.json'), 'utf8')) as {
  build: Record<string, { env?: Record<string, string>; environment?: string }>;
};

const profils = Object.entries(EAS.build);

describe('eas.json ne peut pas réintroduire la divergence de clés', () => {
  it('a bien des profils à vérifier', () => {
    // Sans ça, un renommage de `build` viderait la boucle et tous les tests
    // ci-dessous passeraient au vert sans rien contrôler.
    expect(profils.length).toBeGreaterThanOrEqual(4);
  });

  it('ne porte AUCUNE clé applicative dans un bloc `env`', () => {
    for (const [nom, profil] of profils) {
      const clefs = Object.keys(profil.env ?? {});
      expect(clefs, `profil « ${nom} » : ces clés doivent vivre côté EAS`).toEqual([]);
    }
  });

  it('déclare explicitement son environnement sur chaque profil', () => {
    // Sans `environment`, eas-cli le DÉDUIT de `distribution` / `developmentClient`.
    // Passer un profil en `distribution: internal` le ferait donc glisser de
    // « production » à « preview » — et changer les clés servies — sans qu'aucune
    // ligne ne parle d'environnement dans le diff.
    for (const [nom, profil] of profils) {
      expect(['production', 'preview', 'development'], `profil « ${nom} »`).toContain(
        profil.environment,
      );
    }
  });
});
