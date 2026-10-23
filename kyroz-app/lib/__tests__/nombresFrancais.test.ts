import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { frnum, frsigne } from '../units';

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
    // Le VRAI signe moins (U+2212) depuis le 2026-10-23 : le tiret court était plus étroit
    // que le « + », et les écarts ne s'alignaient pas en colonne.
    expect(frnum(-0.6)).toBe('\u22120,6');
    expect(frnum(-269)).toBe('\u2212269');
  });

  it('un écart se signe dans les deux sens, par frsigne', () => {
    expect(frsigne(0.3)).toBe('+0,3');
    expect(frsigne(-0.3)).toBe('\u22120,3');
    expect(frsigne(0)).toBe('0');
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

  it('aucun « + » n\'est recollé à la main devant un nombre — c\'est le travail de frsigne', () => {
    // 🔴 Neuf sites l'écrivaient encore le 2026-10-23, dont quatre sans frnum : « -269 kcal/j »
    // sortait avec un tiret court au lieu du signe moins.
    const MOTIF = /[<>]=? 0 \? '\+' : ''/g;
    const fautifs: string[] = [];
    for (const rel of fichiers) {
      const src = sansCommentaires(readFileSync(join(RACINE, rel), 'utf8'));
      for (const m of src.match(MOTIF) ?? []) fautifs.push(`${rel} → ${m}`);
    }
    expect(fautifs, `signe recollé à la main :\n${fautifs.join('\n')}`).toEqual([]);
    expect("{delta > 0 ? '+' : ''}{delta}".match(MOTIF), 'la sonde ne voit plus rien').not.toBeNull();
  });

  it('le poids sous les photos avant/après passe par frnum', () => {
    // « 79.4 kg » avec un POINT jusqu'au 2026-10-23 : la variable s'appelle `kg`, et la
    // sonde des champs décimaux ne cherche que `weight_kg` et ses cousins.
    const src = sansCommentaires(readFileSync(join(RACINE, 'components', 'Transformation.tsx'), 'utf8'));
    expect(src).toContain('${frnum(kg)} kg');
  });

  it('l\'éditeur d\'objectif écrit « Perdre 4,4 kg » et « 0,2 kg / sem », avec une virgule', () => {
    // Avec un POINT jusqu'au 2026-10-23 (vu sur la capture de l'éditeur).
    const src = sansCommentaires(readFileSync(join(RACINE, 'app', 'profil.tsx'), 'utf8'));
    expect(src).toContain('`${dirLabel} ${frnum(gapKg)} kg`');
    expect(src).toContain('`${frnum(Math.abs(status.safeWeeklyKg))} kg / sem`');
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
