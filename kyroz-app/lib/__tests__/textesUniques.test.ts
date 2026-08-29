// ── VERROU : une phrase affichée n'existe qu'à UN endroit ────────────────────
//
// POURQUOI CE FICHIER EXISTE
//
// Relecture des textes du 2026-08-26, avant figeage de la V1. Deux phrases
// vivaient en plusieurs copies recopiées à la main :
//
//   · l'avertissement sur les photos de progression, en TROIS exemplaires — et
//     deux d'entre eux s'affichaient dans le MÊME défilement de « Suivi du poids »,
//     au caractère près, même icône comprise ;
//   · « Cette date n'existe pas — vérifie le jour et le mois. », en deux copies
//     (date de naissance et échéance d'objectif) qui ne sont jamais vues ensemble,
//     donc dont la divergence n'aurait sauté aux yeux de personne.
//
// C'est le défaut du `disclaimer` recopié sept fois (CLAUDE.md §8), qui recommence
// à chaque fois qu'un écran a besoin d'une phrase qu'un voisin porte déjà. Sortir
// la phrase dans une constante ne suffit pas : rien n'empêche la copie SUIVANTE
// d'être réécrite à la main. Ce test l'empêche.
//
// ⚠️ CE QU'IL NE SAIT PAS FAIRE : trouver une phrase RÉÉCRITE (mêmes faits, autres
// mots). Celle-là ne se voit qu'en relisant — c'est ce que fait
// `../../docs/archive/2026-08-26-relecture-textes.md`.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ⚠️ On LIT les sources, on ne les importe pas : `lib/photos.ts` tire
// `expo-image-picker`, qui exige `__DEV__` et fait tomber la suite entière avant le
// premier test. Même parti pris que `harnaisEcrans.test.ts` — un verrou de texte
// n'a pas besoin d'exécuter l'app.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

function sources(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(join(RACINE, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== '__tests__') sources(rel, acc); }
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) acc.push(rel);
  }
  return acc;
}

const FICHIERS = [...sources('app'), ...sources('components'), ...sources('lib'), ...sources('constants')];

/**
 * Le fragment le plus reconnaissable de la phrase — assez long pour qu'aucun autre
 * texte ne le contienne par hasard, assez court pour attraper une copie retouchée.
 */
const UNIQUES: { nom: string; fragment: string; source: string }[] = [
  {
    nom: 'avertissement photos de progression',
    fragment: 'un changement de téléphone les perd',
    source: 'lib/photos.ts',
  },
  {
    nom: 'date impossible',
    fragment: 'vérifie le jour et le mois',
    source: 'lib/dateLabel.ts',
  },
];

describe('une phrase affichée n’est écrite qu’une fois', () => {
  it.each(UNIQUES)('$nom : la constante existe et porte le fragment', ({ fragment, source }) => {
    expect(lire(source), `${source} ne porte plus « ${fragment} »`).toContain(fragment);
  });

  it.each(UNIQUES)('$nom : une seule source', ({ fragment, source }) => {
    const porteurs = FICHIERS.filter((f) => lire(f).includes(fragment));
    expect(porteurs, `« ${fragment} » recopié hors de ${source}`).toEqual([source]);
  });

  // Un test qui ne compte que des absences resterait vert si la constante était
  // vidée et la phrase supprimée partout. On vérifie donc qu'elle est bien SERVIE.
  it.each(UNIQUES)('$nom : la phrase est réellement affichée quelque part', ({ source }) => {
    const nom = source.split('/').pop()!.replace(/\.ts$/, '');
    const lecteurs = FICHIERS.filter((f) => f !== source && new RegExp(`from '[^']*${nom}'`).test(lire(f)));
    expect(lecteurs.length, `personne n’importe ${source}`).toBeGreaterThan(0);
  });
});
