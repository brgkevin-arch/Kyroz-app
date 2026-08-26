// ── VERROU : une saisie ne peut pas finir sous le clavier ────────────────────
//
// POURQUOI CE FICHIER EXISTE
//
// Signalé par le fondateur le 2026-08-25, capture à l'appui : Profil →
// Informations, champ « masse grasse ». « ça ne remonte pas la page donc je vois
// pas ce que j'écris. » Le champ est bas dans la feuille, sous une grille de six
// silhouettes ; le clavier numérique le recouvrait entièrement.
//
// Ce n'était pas un oubli isolé : `EditorShell` enveloppe les SIX éditeurs du
// Profil et n'avait AUCUNE gestion du clavier — ni marge en bas, ni tolérance aux
// taps. Deux autres feuilles (`WeightCheckin`, `RecipeEditor`) et l'inscription
// n'avaient que la moitié. Le défaut se recopie tout seul : chaque nouvelle
// feuille repart d'une voisine.
//
// Ce test lit les fichiers du dépôt et applique UNE règle : un écran qui fait
// défiler ET qui saisit doit porter `clavierScrollProps` (ou un
// `KeyboardAvoidingView`, la réponse des écrans pleine page). Il ne lance ni
// simulateur ni navigateur — et c'est justement ce qu'il ne sait pas faire : un
// navigateur n'a pas le clavier d'iOS, la preuve visuelle reste le simulateur.
// Ce qu'il ferme, c'est le chemin par lequel le défaut est arrivé : une surface
// écrite sans y penser.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

/** Tous les .tsx d'écran et de composant, récursivement. */
function ecrans(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(join(RACINE, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) ecrans(rel, acc);
    else if (e.name.endsWith('.tsx')) acc.push(rel);
  }
  return acc;
}

/**
 * Surfaces DISPENSÉES, avec la raison — et la raison est vérifiée juste après :
 * une dispense dont la cause a disparu est une dispense qui ne garde plus rien.
 */
const DISPENSES: Record<string, string> = {
  'app/(tabs)/recettes.tsx':
    "la recherche est dans l'EN-TÊTE, hors du défilement ; le seul ScrollView de l'écran est horizontal (les filtres)",
  'app/(tabs)/reserve.tsx':
    "les champs vivent dans des ActionSheet ancrées en bas, pas dans le ScrollView de l'écran — autre mécanisme, à traiter à part",
};

// ⚠️ On exige le SPREAD, pas le nom. Première version : /clavierScrollProps/ —
// vérifiée par mutation, elle restait VERTE après avoir retiré `{...clavierScrollProps}`
// du ScrollView, parce que la ligne d'`import` suffisait à la satisfaire. Un garde-fou
// qui se contente de l'import mesure qu'on y a pensé, pas qu'on l'a branché.
const AVEC_CLAVIER = /\{\.\.\.clavierScrollProps\}|<KeyboardAvoidingView/;

describe('toute surface qui défile ET qui saisit gère le clavier', () => {
  const candidats = [...ecrans('app'), ...ecrans('components')]
    .filter((f) => {
      const src = lire(f);
      return /<ScrollView/.test(src) && /<TextInput|<Field\b/.test(src);
    });

  it('il y a bien des surfaces à surveiller (le filtre ne rend pas 0)', () => {
    expect(candidats.length).toBeGreaterThan(4);
  });

  it.each(candidats)('%s', (f) => {
    if (DISPENSES[f]) return;   // dispense justifiée, vérifiée par le test suivant
    expect(AVEC_CLAVIER.test(lire(f)), `${f} : ni clavierScrollProps ni KeyboardAvoidingView`).toBe(true);
  });

  // ⚠️ Une dispense qui survit à sa cause redevient un trou silencieux : si le
  // fichier cesse d'être un candidat (plus de saisie, plus de défilement), sa ligne
  // ici ne garde plus rien et doit partir.
  it('aucune dispense ne survit à sa cause', () => {
    for (const f of Object.keys(DISPENSES)) {
      expect(candidats, `${f} n'est plus un candidat — retirer sa dispense`).toContain(f);
    }
  });

  // Le cas SIGNALÉ, nommé pour lui-même : c'est l'enveloppe des six éditeurs du
  // Profil, donc celle du champ « masse grasse » de la capture du 2026-08-25.
  it("EditorShell (Profil) porte les deux propriétés, pas une seule", () => {
    const src = lire('app/(tabs)/profil.tsx');
    expect(src).toContain('{...clavierScrollProps}');
    const ui = lire('components/ui.tsx');
    expect(ui).toContain('automaticallyAdjustKeyboardInsets: true');
    expect(ui).toContain("keyboardShouldPersistTaps: 'handled'");
  });

  // Une surface qui écrit la propriété À LA MAIN retombe hors de la règle commune :
  // c'est comme ça que `EditorShell` a pu n'en avoir aucune pendant que ses voisines
  // en avaient une.
  it('plus personne ne réécrit keyboardShouldPersistTaps à la main', () => {
    for (const f of candidats) {
      if (/KeyboardAvoidingView/.test(lire(f))) continue;   // écrans pleine page, patron à part
      expect(lire(f), f).not.toContain('keyboardShouldPersistTaps=');
    }
  });
});
