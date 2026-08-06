#!/usr/bin/env node
/**
 * Ce qui traîne, PARTOUT — dépôt principal et tous les worktrees.
 *
 * Pourquoi ce script existe (constat du 2026-08-06). La déclaration de chiffrement
 * Apple est restée non committée pendant QUATRE jours dans le dépôt principal, alors
 * que le fondateur demandait des merges en permanence. Personne n'était en faute :
 * **chaque worktree a son propre répertoire de travail**, et `git status` n'y montre
 * que lui-même. Toutes les sessions voyaient « arbre propre » — la vérité, chez elles.
 * Ce qui traînait ailleurs était invisible pour tout le monde, y compris pour celui
 * qui posait la question.
 *
 * ➡️ Le mécanisme qui évite les conflits (un worktree par session) CRÉE l'angle mort.
 * Ce script est le seul endroit d'où l'on voit l'ensemble.
 *
 * Sort en CODE 1 si quelque chose traîne depuis plus de SEUIL_HEURES — pas avant :
 * du travail en cours n'est pas un oubli, et un contrôle qui rougit tous les jours
 * ne se lit plus. Un contrôle qui passe au VERT en répétant un avertissement ne se
 * lit pas non plus : ici, ce qui est vieux FAIT ÉCHOUER la commande.
 *
 *   node scripts/check-suspens.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SEUIL_HEURES = 24;

// `node_modules` remonte en « non suivi » dans les worktrees dont la branche est
// antérieure au `.gitignore` actuel. Ce n'est jamais quelque chose à committer :
// le lister ferait rougir ce contrôle en permanence, et un contrôle qui rougit
// toujours ne se lit plus — c'est précisément ce qu'on cherche à éviter ici.
const BRUIT = /(^|\/)node_modules(\/|$)/;

const git = (args, cwd) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};

// Tous les arbres de travail : le principal + chaque worktree.
const arbres = git(['worktree', 'list', '--porcelain'], process.cwd())
  .split('\n')
  .filter((l) => l.startsWith('worktree '))
  .map((l) => l.slice('worktree '.length).trim())
  .filter((p) => p && existsSync(p));

if (arbres.length === 0) {
  console.error('✗ Aucun arbre de travail trouvé — git est-il disponible ici ?');
  process.exit(1);
}

const maintenant = Date.now();
let vieux = 0;
let total = 0;

for (const arbre of arbres) {
  const lignes = git(['status', '--porcelain'], arbre)
    .split('\n')
    .filter(Boolean)
    .filter((l) => !BRUIT.test(l.slice(3)));
  if (lignes.length === 0) continue;

  const branche = git(['branch', '--show-current'], arbre).trim() || '(HEAD détaché)';
  console.log(`\n${arbre}  [${branche}]`);

  for (const ligne of lignes) {
    const etat = ligne.slice(0, 2);
    const chemin = ligne.slice(3).replace(/^"|"$/g, '');
    total++;

    // L'âge se lit sur le FICHIER, pas sur git : un fichier jamais committé n'a
    // aucune date dans l'historique. C'est justement le cas qu'on cherche.
    let ageH = null;
    try {
      ageH = (maintenant - statSync(join(arbre, chemin)).mtimeMs) / 3_600_000;
    } catch {
      /* supprimé ou illisible : on le liste sans âge */
    }

    const estVieux = ageH !== null && ageH > SEUIL_HEURES;
    if (estVieux) vieux++;
    const age = ageH === null ? '' : ageH < 24
      ? `  (${Math.round(ageH)} h)`
      : `  (${Math.floor(ageH / 24)} j)`;
    console.log(`  ${estVieux ? '⚠️ ' : '   '}${etat} ${chemin}${age}`);
  }
}

console.log();
if (total === 0) {
  console.log('✓ Rien en suspens, nulle part.');
  process.exit(0);
}
if (vieux === 0) {
  console.log(`✓ ${total} modification(s) en cours, aucune de plus de ${SEUIL_HEURES} h.`);
  process.exit(0);
}
console.error(
  `✗ ${vieux} chose(s) traînent depuis plus de ${SEUIL_HEURES} h (marquées ⚠️ ci-dessus).\n` +
  '  Soit ça se committe, soit ça s\'ignore explicitement — le troisième état,\n' +
  '  « présent mais invisible pour les autres sessions », est le seul mauvais.'
);
process.exit(1);
