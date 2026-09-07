import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { frnum } from '../units';

// ── UN NOMBRE DÉCIMAL S'ÉCRIT AVEC UNE VIRGULE ───────────────────────────────
//
// 🔴 CE FICHIER FERME UN DÉFAUT DÉJÀ CORRIGÉ UNE FOIS. `frnum` a été exporté le
// 2026-08-10 pour exactement ça : la carte d'objectif affichait « 113.5 kg » et
// « 0.7 kg/sem » avec un POINT, dans une app entièrement en français. Le correctif
// a été appliqué à CETTE carte, et à elle seule.
//
// Mesuré le 2026-09-07, quinze sites plus loin : le poids du Profil, la courbe et
// ses deux axes, l'historique des pesées, la carte de suivi, la transformation
// photo, l'objectif daté — tous affichaient encore « 84.4 kg » et « -0.6 kg ». Le
// dernier est arrivé sur le PREMIER écran de l'app, dans le carrousel d'accueil.
//
// ⚠️ C'est le défaut « un principe écrit pour un seul cas » : une règle formulée en
// corrigeant UN symptôme reste fausse chez tous ses voisins tant que personne ne les
// compte. Le commentaire de `frnum` l'avait même anticipé — « un dixième formateur
// ferait un neuvième endroit où la règle peut diverger » — mais il parlait de ne pas
// en AJOUTER un, pas d'appliquer celui-ci partout.

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Les champs qui peuvent porter une décimale. Les kcal et les macros n'y sont PAS :
 * ce sont des entiers, et les milliers ont déjà leur convention
 * (`toLocaleString('fr-FR')`, dix sites). Élargir à eux ferait rougir des lignes
 * parfaitement correctes — un garde-fou qui crie sur du sain finit désactivé.
 */
const CHAMPS_DECIMAUX = [
  'weight_kg',
  'target_weight_kg',
  'targetWeightKg',
  'body_fat_pct',
];

describe('frnum rend bien du français', () => {
  it('virgule sur un décimal, rien de superflu sur un entier', () => {
    expect(frnum(84.4)).toBe('84,4');
    expect(frnum(82)).toBe('82');
    expect(frnum(-0.6)).toBe('-0,6');
  });
});

describe('aucun nombre décimal n\'est affiché brut', () => {
  const fichiers = globSync('{app,components}/**/*.tsx', { cwd: RACINE }).map(String);

  // 🔴 LA SONDE VISE UN NOMBRE SUIVI DE SON UNITÉ, ET RIEN D'AUTRE. Première version
  // écrite : « toute interpolation contenant `weight_kg` ». Elle accusait deux formes
  // parfaitement saines — `${y(e.weight_kg)}`, qui calcule une COORDONNÉE SVG, et
  // `{{ sex, weight_kg: wN, … }}`, un objet passé en prop. Ni l'une ni l'autre
  // n'affiche quoi que ce soit. Une sonde qui crie sur du sain finit désactivée, et
  // c'est ce qu'on cherche le moins.
  // ➡️ Le signal honnête est l'UNITÉ collée derrière : les quinze défauts réels
  // s'écrivaient tous `{x.weight_kg} kg` ou `${x.body_fat_pct}% MG`.
  // ⚠️ `\$?\{` ET PAS `[\{\$]\{`. La première écriture exigeait DEUX caractères, donc
  // elle ne voyait que `${…}` et `{{…}}` — jamais `{x.weight_kg}`, la forme JSX, qui
  // est précisément celle des quinze défauts. Une sonde aveugle qui reste verte pour
  // toujours : c'est l'auto-test ci-dessous qui l'a dit, pas la relecture.
  const APRES = String.raw`\s*(kg|%)`;

  it.each(CHAMPS_DECIMAUX)('%s passe toujours par frnum quand il est SUIVI DE SON UNITÉ', (champ) => {
    const fautifs: string[] = [];
    for (const rel of fichiers) {
      const src = sansCommentaires(readFileSync(join(RACINE, rel), 'utf8'));
      const motif = new RegExp(`\\$?\\{[^{}]*\\b${champ}\\b[^{}]*\\}${APRES}`, 'g');
      for (const m of src.match(motif) ?? []) {
        if (!m.includes('frnum')) fautifs.push(`${rel} → ${m.trim()}`);
      }
    }
    expect(fautifs, `affichés sans frnum :\n${fautifs.join('\n')}`).toEqual([]);
  });

  it('…et la sonde VOIT une faute quand on lui en montre une', () => {
    // Sans ce contrôle, la version resserrée ci-dessus pourrait ne plus rien voir du
    // tout et rester verte pour toujours — c'est le risque exact qu'on prend en
    // rétrécissant une sonde qui criait trop.
    const motif = new RegExp(`\\$?\\{[^{}]*\\bweight_kg\\b[^{}]*\\}${APRES}`, 'g');
    expect('<Text>{e.weight_kg} kg</Text>'.match(motif)).not.toBeNull();
    expect('`${profile.weight_kg} kg`'.match(motif)).not.toBeNull();
    // …et qu'elle laisse tranquille ce qui n'affiche rien.
    expect('d += ` ${y(e.weight_kg)} `'.match(motif)).toBeNull();
    expect('body={{ sex, weight_kg: wN }}'.match(motif)).toBeNull();
  });

  it('un écart de poids signé passe par frnum', () => {
    // La forme `{delta > 0 ? '+' : ''}{delta} kg` a existé sur QUATRE sites.
    const fautifs: string[] = [];
    for (const rel of fichiers) {
      const src = sansCommentaires(readFileSync(join(RACINE, rel), 'utf8'));
      for (const m of src.match(/\{[^{}]*> 0 \? '\+' : ''\}\{[^{}]+\}\s*kg/g) ?? []) {
        if (!m.includes('frnum')) fautifs.push(`${rel} → ${m}`);
      }
    }
    expect(fautifs, `écarts affichés sans frnum :\n${fautifs.join('\n')}`).toEqual([]);
  });

  it('aucun `toFixed` ne sert à afficher des kg — c\'est le travail de frnum', () => {
    const fautifs: string[] = [];
    for (const rel of fichiers) {
      const src = sansCommentaires(readFileSync(join(RACINE, rel), 'utf8'));
      for (const m of src.match(/toFixed\(\d\)\}?\s*kg/g) ?? []) fautifs.push(`${rel} → ${m}`);
    }
    expect(fautifs, `kg via toFixed :\n${fautifs.join('\n')}`).toEqual([]);
  });
});
