import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 **UNE OTA PEUT ATTERRIR SUR UN BINAIRE QUI NE SAIT PAS L'EXÉCUTER** — et rien,
// dans le dépôt, ne l'empêchait avant le 2026-08-27 (constats `03-03` et `CA-5-03`).
//
// `runtimeVersion` est la seule chose qui apparie un bundle JS à une surface NATIVE.
// Sous la politique `appVersion`, il valait `expo.version` — soit **`1.0.0`, figé
// depuis le premier commit**. Donc :
//
//   · le SDK monte (56 → 57), la surface native change entièrement ;
//   · `expo.version` ne bouge pas, donc le runtime reste `1.0.0` ;
//   · l'OTA suivante se déclare compatible avec TOUS les binaires `1.0.0`,
//     **y compris ceux compilés en SDK 56** — qui recevraient un bundle attendant
//     une architecture native qu'ils n'ont pas.
//
// Ce n'est pas une dégradation : c'est un binaire qui ne démarre plus, poussé à tout
// le parc en quelques minutes, sans revue de store pour l'arrêter (CLAUDE.md §2).
//
// ➡️ La politique **`fingerprint`** hache la surface native elle-même. Un binaire d'une
// autre surface ne correspond plus, donc il ne reçoit RIEN — c'est la coupure voulue,
// et elle est explicite au lieu d'être fatale.
//
// ⚠️ **CE QUE ÇA COÛTE, ET IL FAUT LE SAVOIR** : la ligne OTA se coupe désormais à
// **chaque** édition qui touche la surface native (`app.json`, un plugin, une
// dépendance native), pas « une fois par version ». Éditer `app.json` n'est plus un
// geste de documentation, c'est un geste de LIVRAISON. C'est exactement ce que
// `CA-5-03` annonçait.
//
// ⚠️ **Ce que ce test NE fait PAS** : vérifier qu'une OTA publiée porte le bon runtime.
// Ça demande le canal EAS — c'est `npm run check:ota`, qui en contrôle la FORME et dit
// ce qu'il ne sait pas contrôler. Ici on ferme la porte d'entrée : le retour à une
// politique qui ne peut pas couper.

const app = JSON.parse(
  readFileSync(join(process.cwd(), 'app.json'), 'utf8'),
) as {
  expo: { version?: string; runtimeVersion?: { policy?: string } | string };
};

describe('la ligne OTA ne peut pas servir un bundle à un binaire d’une autre surface', () => {
  it('la sonde lit bien `app.json` — sinon elle ne mesure rien', () => {
    // Sans ce cas, un chemin faux rendrait `undefined` partout et tout passerait :
    // le test aurait l'air de garder quelque chose en ne lisant rien.
    expect(app?.expo?.version).toBeTypeOf('string');
  });

  it('🔴 `runtimeVersion.policy` vaut `fingerprint`', () => {
    const politique = typeof app.expo.runtimeVersion === 'string'
      ? app.expo.runtimeVersion
      : app.expo.runtimeVersion?.policy;
    expect(
      politique,
      'La politique de runtime est repassée à autre chose que `fingerprint`. '
      + 'Avec `appVersion` et une `expo.version` figée, une OTA publiée depuis un arbre '
      + 'dont la surface native a changé (montée de SDK, plugin, permission) atteint les '
      + 'binaires de l’ANCIENNE surface. Ils ne démarrent plus, et rien ne l’arrête.',
    ).toBe('fingerprint');
  });

  it('la raison est MESURÉE : `expo.version` n’a jamais bougé, donc `appVersion` ne coupait rien', () => {
    // Ce cas existe pour que la règle ci-dessus ne se lise pas comme une préférence.
    // Tant que cette version reste `1.0.0`, la politique `appVersion` produit un
    // runtime CONSTANT — c'est-à-dire un appariement qui ne peut jamais dire non.
    // Le jour où quelqu'un versionne réellement l'app, ce cas rougira : il faudra
    // alors relire le raisonnement, pas le contourner.
    expect(
      app.expo.version,
      'expo.version a bougé. Relire le raisonnement de ce fichier : `appVersion` '
      + 'redevient discriminant, mais seulement si la version est montée à CHAQUE '
      + 'changement de surface native — ce qu’aucun mécanisme ne garantit.',
    ).toBe('1.0.0');
  });
});
