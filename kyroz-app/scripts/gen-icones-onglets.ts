// Génère les PNG des icônes d'onglets pour la barre NATIVE d'iOS.
//
// Usage : npx tsx scripts/gen-icones-onglets.ts
// ⚠️ PAS de raccourci dans `package.json` : sous `runtimeVersion: fingerprint`, une
// seule ligne de `scripts` change l'empreinte et COUPE la ligne OTA.
// Sortie : assets/onglets/<nom>[-actif][@2x|@3x].png + assets/onglets/empreinte.json
//
// Pourquoi des PNG : la barre d'onglets d'iOS (`UITabBar`, celle qui porte le Liquid
// Glass) n'affiche que des IMAGES — pas un composant React, donc pas nos SVG. Les
// tracés restent écrits une seule fois, dans `lib/iconesOnglets.ts` ; ce script les
// rastérise par le Chromium de Playwright, déjà installé pour les captures.
//
// ⚠️ Noir sur fond transparent, et c'est voulu : la barre affiche ces images en mode
// « template » — iOS n'en lit que la FORME (le canal alpha) et la teint lui-même
// (accent pour l'onglet actif, sa propre couleur pour les autres, adaptée au verre).
//
// Après une retouche de tracé : relancer ce script et commiter les PNG. Sinon
// `iconesOnglets.test.ts` échoue — l'empreinte écrite ici ne correspond plus.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRACES, TRAIT, TAILLE_ICONE, svgIcone, empreinteIcones, type NomIcone } from '../lib/iconesOnglets';

const SORTIE = join(__dirname, '..', 'assets', 'onglets');
const ECHELLES = [1, 2, 3] as const;
const ETATS = [
  { suffixe: '', trait: TRAIT.repos },
  { suffixe: '-actif', trait: TRAIT.actif },
] as const;

async function main() {
  mkdirSync(SORTIE, { recursive: true });
  const navigateur = await chromium.launch();
  try {
    for (const echelle of ECHELLES) {
      const page = await navigateur.newPage({
        viewport: { width: TAILLE_ICONE, height: TAILLE_ICONE },
        deviceScaleFactor: echelle,
      });
      for (const nom of Object.keys(TRACES) as NomIcone[]) {
        for (const etat of ETATS) {
          await page.setContent(
            `<html><body style="margin:0;background:transparent">${svgIcone(nom, etat.trait)}</body></html>`,
          );
          const fichier = `${nom}${etat.suffixe}${echelle === 1 ? '' : `@${echelle}x`}.png`;
          await page.screenshot({
            path: join(SORTIE, fichier),
            omitBackground: true,
            clip: { x: 0, y: 0, width: TAILLE_ICONE, height: TAILLE_ICONE },
          });
        }
      }
      await page.close();
    }
  } finally {
    await navigateur.close();
  }
  writeFileSync(join(SORTIE, 'empreinte.json'), `${JSON.stringify({ empreinte: empreinteIcones() }, null, 2)}\n`);
  console.log(`✓ ${Object.keys(TRACES).length * ETATS.length * ECHELLES.length} PNG dans ${SORTIE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
