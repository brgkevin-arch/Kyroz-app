import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { methodologie } from '../methodologie';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 LE CORPUS QUE L'ÉTAPE 6b A JUGÉ CONTENAIT DES MORCEAUX DE PHRASES.
// L'extraction coupait chaque chaîne sur l'apostrophe ÉCHAPPÉE (`\'`), et
// `lib/methodologie.ts` est le seul fichier du corpus à en employer — les écrans
// utilisent l'apostrophe typographique, qui n'a pas besoin d'échappement. Résultat
// mesuré sur le dump d'origine : **14 entrées finissant par `\`** et **7 fragments
// orphelins** (une queue de phrase sans sa tête).
//
// « Ce que Kyroz calcule — et ce qu'il n'est pas » devenait DEUX entrées :
// « Ce que Kyroz calcule — et ce qu\ » puis « est pas ». Et la phrase la plus lourde
// juridiquement de l'app — « Kyroz n'est pas un dispositif médical… » — n'apparaissait
// NULLE PART : `grep "dispositif médical" 06-textes-dump.md` rendait **0**.
//
// ⚠️ C'est précisément la matière que le §5 de la synthèse cite comme modèle
// (« methodologie.ts:159-164 … pas vu d'équivalent dans une app grand public »), et
// c'est celle que l'étape 6b a jugée en morceaux.
//
// ⚠️ ET LA RÉPARATION PRÉCÉDENTE AVAIT CASSÉ ÇA. Le seuil de 12 caractères qui perdait
// 30 chaînes a bien été corrigé le 2026-08-26 — mais l'extracteur régénéré a introduit
// cette coupure-ci, et personne n'a re-mesuré : seul l'en-tête du dump a été réécrit de
// « 728 » à « 753 ». **Une réparation d'instrument se re-mesure comme un correctif de
// code.**
//
// ➡️ Le bloc `lib/methodologie.ts` du dump n'est plus extrait par regex : il est RENDU
// par `methodologie()`. Ce fichier vérifie que la correspondance tient.

const DUMP = join(__dirname, '..', '..', 'docs', 'audit-v1', '06-textes-dump.md');
const dump = readFileSync(DUMP, 'utf8');
const lignes = dump.split('\n');
const entrees = lignes.filter((l) => /^\|\s*\d+\s*\|/.test(l));
/** La 4ᵉ colonne d'une ligne de tableau : le texte. */
const texteDe = (l: string) => {
  const c = l.split('|').map((x) => x.trim());
  return c.length > 5 ? c[4] : '';
};
const norm = (t: string) => t.replace(/\s+/g, ' ').trim();

describe('corpus des textes — aucune phrase coupée en morceaux', () => {
  it('le dump n’est pas vide — sinon les invariants ne prouvent rien', () => {
    expect(entrees.length).toBeGreaterThan(500);
  });

  it('🔴 aucune entrée ne se termine par « \\ » — la signature de la coupure sur `\\\'`', () => {
    const coupees = entrees.map(texteDe).filter((t) => t.endsWith('\\'));
    expect(
      coupees,
      `${coupees.length} entrée(s) coupées net sur une apostrophe échappée. Le corpus contient `
      + 'des morceaux de phrases, et tout jugement porté dessus est porté sur autre chose.',
    ).toEqual([]);
  });

  it('🔴 aucun fragment orphelin — une queue de phrase sans sa tête', () => {
    // « est pas », « un médecin ou… », « il est déjà compté… » : ce qui reste après la
    // coupure. Aucune phrase française ne commence par ces mots-là.
    const orphelins = entrees.map(texteDe)
      .filter((t) => /^(est |ai |ont |il |elle |une |un |on )/.test(t));
    expect(orphelins, `${orphelins.length} fragment(s) sans tête`).toEqual([]);
  });
});

// ── LA TAXONOMIE PROMET « TOUT » : ON LE COMPTE ─────────────────────────────
//
// 🔴 La section « Ce qui relève d'un choix de Kyroz » annonce ranger chaque valeur de
// la page d'un côté (littérature) ou de l'autre (choix maison). Elle en classait SIX
// sur DIX-HUIT (jugement 6b-bis, constat 01) — dont aucune des règles où Kyroz
// s'écarte le plus de la littérature : le glissement Mifflin↔Katch, la marge de
// ±5 points, les seuils de provenance.
//
// ⚠️ Une promesse d'exhaustivité non tenue est PIRE qu'une sélection annoncée : elle
// fait croire que ce qui manque n'existe pas. Et une promesse qu'aucun test ne compte
// se déclare tenue toute seule — c'est la règle du dépôt, appliquée ici.
describe('page Méthodologie — la taxonomie range VRAIMENT tout', () => {
  const src = readFileSync(join(__dirname, '..', 'methodologie.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const corps = src.slice(src.indexOf('export function methodologie'));
  const taxo = corps.slice(corps.indexOf('Ce qui rel'));
  /** Les CONSTANTES citées dans les interpolations d'un bloc de source. */
  const constantes = (t: string) => new Set(
    [...t.matchAll(/\$\{([^}]*)\}/g)]
      .flatMap((m) => [...m[1].matchAll(/\b([A-Z][A-Z0-9_]{2,}(?:\.\w+)?)\b/g)].map((x) => x[1])),
  );

  it('la sonde trouve bien des constantes — sinon elle ne mesure rien', () => {
    expect(constantes(corps).size).toBeGreaterThan(10);
    expect(taxo.length, 'section taxonomie introuvable').toBeGreaterThan(200);
  });

  it('🔴 CHAQUE constante citée sur la page est classée dans la taxonomie', () => {
    const absentes = [...constantes(corps)].filter((c) => !constantes(taxo).has(c)).sort();
    expect(
      absentes,
      `${absentes.length} valeur(s) citées sur la page et rangées dans aucune des deux listes. `
      + 'La section promet « chaque valeur citée sur cette page » : soit on les classe, soit '
      + 'la promesse doit être retirée.',
    ).toEqual([]);
  });
});

describe('corpus des textes — le bloc `methodologie` correspond au module', () => {
  const rendus = (methodologie() as { titre: string; paragraphes?: string[]; paragraphs?: string[] }[])
    .flatMap((s) => [s.titre, ...(s.paragraphes ?? s.paragraphs ?? [])])
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

  it('le module rend bien quelque chose — témoin de la sonde', () => {
    expect(rendus.length).toBeGreaterThan(20);
  });

  it('🔴 CHAQUE texte rendu par `methodologie()` est dans le dump, VERBATIM', () => {
    // Comparaison exacte, pas de fragment : le bloc est généré depuis ce module, donc
    // il n'y a aucune raison d'accepter une correspondance approximative. Trois sondes
    // floues ont été écrites et jetées avant celle-ci — un seuil de 25 caractères
    // laissait passer une queue de phrase partagée avec le `DISCLAIMER`, un seuil de
    // 60 accusait des textes présents mais tronqués. La bonne réponse n'était pas de
    // régler le seuil, c'était de rendre la comparaison EXACTE.
    const corps = norm(dump);
    const absents = rendus.filter((t) => !corps.includes(norm(t).replace(/\|/g, '\\|')));
    expect(
      absents.map((t) => norm(t).slice(0, 70)),
      'texte(s) rendus par le module et absents du corpus → régénérer le bloc du dump',
    ).toEqual([]);
  });

  it('🔴 aucune entrée n’est ancrée à la ligne `:0`', () => {
    // Recommandation du jugement 6b-bis (constat 06b-bis-05). `:0` veut dire que le
    // rendu n'a pas su rattacher un texte à une ligne — et trois des quatre concernés
    // décrivaient des garde-fous de sécurité, la catégorie où l'écart entre texte
    // affiché et code servi coûte le plus cher.
    // ⚠️ La résolution a demandé QUATRE versions : un préfixe du texte rendu ne matche
    // pas un gabarit commençant par une interpolation · une regex sur les guillemets
    // casse sur les apostrophes échappées (les `:0` passaient de 4 à 8) · un seuil de
    // 15 caractères laisse tomber « Après ${…} ». La bonne réponse n'était aucun seuil :
    // tous les littéraux de la ligne, dans l'ordre. Et le dernier `:0` n'était pas un
    // défaut d'ancrage mais de FICHIER — l'attribution Ciqual vit dans `lib/foods.ts`.
    const zero = entrees.filter((l) => /`[^`]*:0`/.test(l)).map((l) => texteDe(l).slice(0, 60));
    expect(zero, `${zero.length} texte(s) sans ligne source`).toEqual([]);
  });

  it('🔴 les témoins que la coupure avait fait disparaître sont là', () => {
    // Deux phrases nommées, parce qu'elles sont celles dont l'absence coûtait le plus.
    expect(dump, 'l’avertissement « dispositif médical » a de nouveau disparu du corpus')
      .toContain('Kyroz n’est pas un dispositif médical'.replace('’', "'"));
    expect(dump, 'la phrase sur la non-validation diététique a disparu du corpus')
      .toContain('n’ont pas été validées par un diététicien-nutritionniste'.replace('’', "'"));
  });
});
