import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 `"permissions": []` NE VIDE RIEN — et il fait croire l'inverse (constat 03-01).
//
// Le tableau `android.permissions` d'`app.json` **n'est pas une liste blanche** : il
// AJOUTE des permissions, il n'en retire aucune. Vide, il ne fait donc strictement
// rien — sauf donner à lire « cette app ne demande aucune permission » à qui ouvre le
// fichier. Mesuré sur la config RÉSOLUE (`expo config --type introspect`) :
//
//   android.permissions        READ_EXTERNAL_STORAGE · INTERNET
//   android.blockedPermissions RECORD_AUDIO · SYSTEM_ALERT_WINDOW · WRITE_EXTERNAL_STORAGE
//
// Les deux premières viennent des PLUGINS. Le seul levier qui retire quelque chose est
// `blockedPermissions`, et il est employé — correctement — pour les trois autres.
//
// ⚠️ Ce n'est pas une coquette : c'est ce qui alimente le formulaire **Data Safety** de
// Google, qui décrit le manifeste FUSIONNÉ et non `app.json`. Une déclaration qui
// annonce zéro permission là où il y en a deux se recopie dans un formulaire signé.
//
// ➡️ Le tableau vide a été RETIRÉ le 2026-08-27, après avoir mesuré la config résolue
// AVANT et APRÈS : identique au caractère près. Il ne portait aucune information.
// 🔴 CETTE PHRASE S'EST INVERSÉE LE 2026-08-27, et elle est gardée pour ça. Elle disait :
// « retrait sans effet sur la ligne OTA — `runtimeVersion.policy` vaut `appVersion`, donc
// la coupure est liée à `expo.version`, pas à l'édition d'`app.json` ». La politique est
// passée à **`fingerprint`** (constat 03-03) : c'est désormais l'INVERSE. Toucher aux
// permissions change la surface native, donc l'empreinte, donc **coupe la ligne OTA** — un
// binaire déjà installé ne recevra plus rien tant qu'un nouveau build n'est pas distribué.
// ➡️ Conséquence pratique : une édition d'`app.json` n'est plus un geste de documentation,
// c'est un geste de LIVRAISON. `CA-5-03` l'avait annoncé (« la ligne se coupe à CHAQUE
// édition, pas une fois ») ; c'est vrai depuis aujourd'hui.
//
// ⚠️ CE TEST NE REMPLACE PAS `npm run check:permissions`, il en ferme la porte
// d'entrée. Le script LIT la vérité (il résout les plugins, ce qu'un test hors réseau
// ne peut pas faire) ; ce test empêche seulement qu'on réinstalle la déclaration qui
// fait croire à une liste blanche.

const app = JSON.parse(readFileSync(join(__dirname, '..', '..', 'app.json'), 'utf8'));

describe('permissions Android — la déclaration ne doit pas mentir', () => {
  it('la sonde lit bien `app.json` — sinon elle ne mesure rien', () => {
    expect(app?.expo?.android?.package).toBe('app.kyroz.mobile');
  });

  it('🔴 aucun tableau `android.permissions` dans `app.json`', () => {
    // Il n'y a que deux façons d'écrire ce tableau, et les deux sont fausses :
    // VIDE, il annonce zéro permission pour une app qui en a deux ;
    // REMPLI, il en AJOUTE au manifeste — jamais il n'en retire.
    // La liste réelle se lit sur la config résolue : `npm run check:permissions`.
    expect(
      app.expo.android.permissions,
      'le tableau est de retour dans app.json. Vide il ment, rempli il ajoute — '
      + 'et dans les deux cas la liste servie se lit sur la config RÉSOLUE.',
    ).toBeUndefined();
  });

  it('`blockedPermissions` est le seul levier qui RETIRE, et il est employé', () => {
    // Le pendant du test précédent : sans lui, « pas de tableau permissions » se
    // lirait comme « on ne maîtrise rien », alors que le retrait passe par ici.
    const bloquees: string[] = app.expo.android.blockedPermissions ?? [];
    for (const p of ['RECORD_AUDIO', 'SYSTEM_ALERT_WINDOW', 'WRITE_EXTERNAL_STORAGE']) {
      expect(bloquees, `${p} doit rester bloquée`).toContain(`android.permission.${p}`);
    }
  });
});
