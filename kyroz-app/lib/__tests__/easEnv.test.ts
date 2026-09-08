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

// ── `eas.json` NE PORTE AUCUN IDENTIFIANT DE CLÉ APPLE ──────────────────────
//
// 🔴 CHANTIER SÉCURITÉ, marqué prioritaire par le fondateur le 2026-09-03, fait le
// 2026-09-08. Ce dépôt est PUBLIC (`gh repo view` → PUBLIC), et `eas.json` y portait
// `ascApiKeyId` et `ascApiKeyIssuerId` en clair, plus le chemin du `.p8`.
//
// ⚠️ CE QUE ÇA VALAIT EXACTEMENT, sans dramatiser : le `.p8` — la partie SECRÈTE —
// n'a jamais été dans le dépôt (il vit dans `~/.eas-credentials/`, hors arbre). Un
// identifiant de clé et un issuer ID ne sont pas des credentials : sans la clé
// privée, ils n'ouvrent rien. Ils désignent en revanche le compte, et ils sont la
// moitié d'une paire — les publier n'a aucun bénéfice et un coût non nul.
// ⚠️ ET LES RETIRER NE RÉÉCRIT PAS L'HISTOIRE : les valeurs restent dans les commits
// passés. Seule une révocation de la clé dans App Store Connect ferme complètement,
// et c'est un geste humain dans le portail Apple.
//
// ➡️ Les trois champs vivent désormais dans `~/.eas-credentials/asc.env`, sous les
//    noms que l'eas-cli lit lui-même : `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`,
//    `EXPO_ASC_ISSUER_ID`. Une soumission commence donc par `source` de ce fichier.
describe('eas.json ne publie aucun identifiant Apple', () => {
  const brut = readFileSync(join(__dirname, '../../eas.json'), 'utf8');

  it('les champs de clé ne portent que des RÉFÉRENCES, jamais des valeurs', () => {
    // 🔴 PREMIÈRE VERSION FAUSSE, corrigée le 2026-09-08 dans l'heure : elle interdisait
    // les NOMS de champs. Or `eas submit --non-interactive` en a besoin — sans eux il
    // part chercher des credentials sur le serveur EAS et échoue net. Retirer les champs
    // avait donc cassé la soumission, découvert au premier usage réel.
    // ➡️ Ce qui ne doit pas être publié, ce sont les VALEURS. Les champs restent, et ne
    //    contiennent qu'une référence `$VARIABLE` résolue depuis `~/.eas-credentials`.
    const ios = (EAS as unknown as { submit?: { production?: { ios?: Record<string, string> } } })
      .submit?.production?.ios ?? {};
    for (const champ of ['ascApiKeyId', 'ascApiKeyIssuerId', 'ascApiKeyPath']) {
      const v = ios[champ];
      if (v === undefined) continue;
      expect(v, `${champ} doit être une référence, pas une valeur`).toMatch(/^\$[A-Z0-9_]+$/);
    }
  });

  it('aucune valeur en forme d’identifiant de clé ou d’issuer', () => {
    // Une clé ASC fait 10 caractères majuscules/chiffres, un issuer est un UUID.
    // Chercher les FORMES et pas les noms de champs : renommer la clé ne doit pas
    // suffire à repasser au vert.
    expect(brut).not.toMatch(/"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"/i);
    expect(brut).not.toMatch(/"\.\.\/\.\.\/\.eas-credentials/);
  });

  it('…mais garde ce qui n’est pas secret, sinon la soumission ne sait plus où aller', () => {
    // `ascAppId` et `appleTeamId` sont publics (visibles dans une URL App Store et
    // dans tout profil de provisioning). Les retirer coûterait sans rien fermer.
    expect(brut).toContain('ascAppId');
    expect(brut).toContain('appleTeamId');
  });
});
