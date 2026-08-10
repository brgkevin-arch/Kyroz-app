import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { profilTour } from '../tours';

// ── L'écran Profil après la roue dentée (E25) ───────────────────────────────
//
// Ce fichier existe parce que la refonte du 2026-08-10 a laissé derrière elle
// trois défauts qui se relisent tous dans le source, et qu'AUCUN test ne voyait :
//
//  1. le mot « Réglages » désignait DEUX destinations sur le même écran — la roue
//     dentée (feuille : notifications, affichage, confidentialité, compte) et un
//     titre de section au milieu de l'écran (ce qui pilote le moteur). Depuis
//     E25 les deux ensembles sont disjoints, donc « va dans les réglages » ne
//     désignait plus rien ;
//  2. « Donner mon avis » et « Aide & contact » poussaient la MÊME route, la
//     seconde en affichant une adresse e-mail qu'elle n'ouvrait pas ;
//  3. le bloc TDEE vivait à ~900 px sous les cibles qu'il explique.
//
// Les trois sont des défauts d'ASSEMBLAGE : chaque morceau était juste isolément.
// C'est exactement le genre qu'une passe suivante réintroduit sans le voir — d'où
// des règles qui comptent, sur le patron de `tags.test.ts` et `feuilles.test.ts`.
//
// Le quatrième cas, lui, ferme un défaut qui N'A JAMAIS ÉTÉ LIVRÉ mais que la
// correction du (3) a failli créer : l'ordre des étapes de la visite guidée suit
// l'écran de haut en bas, et remonter le bloc TDEE sans remonter l'étape qui le
// vise aurait fait descendre l'écran jusqu'en bas, puis remonter, puis redescendre.
// Mesuré après correction (panneau web, défilement à chaque bulle) :
// 0 → 365 → 556 → 702 → 1045 px, puis retour à 0 pour la roue, qui est en haut.
//
// ⚠️ Ce que ces cas NE FONT PAS : juger qu'un écran est beau ou lisible. Ils
// ferment les trois chemins par lesquels la confusion est réellement arrivée.

const RACINE = join(__dirname, '..', '..');
const SRC_PROFIL = readFileSync(join(RACINE, 'app', '(tabs)', 'profil.tsx'), 'utf8');
const SRC_REGLAGES = readFileSync(join(RACINE, 'components', 'ReglagesSheet.tsx'), 'utf8');

/** Casse et accents écartés : « Réglages », « RÉGLAGES » et « réglages » sont le
 *  même mot pour un utilisateur, et c'est lui qu'on protège, pas le littéral. */
const norm = (s: string) => s.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** Le titre que porte la feuille ouverte par la roue (son `Type.h2` de tête). */
function titreDeLaFeuille(): string {
  const m = SRC_REGLAGES.match(/\.\.\.Type\.h2\s*}}>\s*([^<{]+?)\s*<\/Text>/);
  expect(m, 'ReglagesSheet : titre de feuille introuvable').toBeTruthy();
  return m![1];
}

/** Tous les titres de section rendus par l'écran Profil lui-même.
 *  ⚠️ `[^>]*` : `SectionLabel` porte désormais un `sub`. Une expression collée à
 *  `t={t}>` rendait 0 titre — donc un test VERT qui ne regardait plus rien. */
function titresDeSection(src: string): string[] {
  return [...src.matchAll(/<Section(?:Title|Label) t=\{t\}[^>]*>\s*([^<{]+?)\s*<\/Section(?:Title|Label)>/g)]
    .map((m) => m[1]);
}

/** Les trois chapitres de réglage du Profil, dans l'ordre attendu à l'écran. */
const CHAPITRES = ['TOI', 'TON OBJECTIF', 'TES REPAS'];

describe('Profil — le mot « Réglages » ne désigne qu’un seul endroit', () => {
  it('aucun titre de section de l’écran ne porte le nom de la feuille qu’ouvre la roue', () => {
    const feuille = norm(titreDeLaFeuille());
    for (const titre of titresDeSection(SRC_PROFIL)) {
      expect(
        norm(titre),
        `« ${titre} » titre une section du Profil ET la feuille de la roue dentée : deux destinations, un seul mot`,
      ).not.toBe(feuille);
    }
  });

  it('la roue dentée est annoncée sous le nom de ce qu’elle ouvre', () => {
    // Sans ce cas, on pourrait « régler » le précédent en débaptisant le BOUTON,
    // ce qui rendrait la roue muette au lieu de lever la collision.
    const m = SRC_PROFIL.match(/accessibilityLabel="([^"]+)"[\s\S]{0,120}?style=\{s\.roue\}/);
    expect(m, 'profil.tsx : la roue n’a plus d’étiquette d’accessibilité').toBeTruthy();
    expect(norm(m![1])).toBe(norm(titreDeLaFeuille()));
  });

  it('les blocs de réglages du moteur sont étiquetés au MÊME niveau', () => {
    // « Réglages » était un `SectionTitle` (« découpe l'écran ») et « TON PLAN »
    // un `SectionLabel` (« étiquette un bloc ») : le premier bloc n'avait donc
    // aucune étiquette à lui, il empruntait celle du chapitre.
    for (const attendu of CHAPITRES) {
      expect(
        SRC_PROFIL,
        `le bloc « ${attendu} » n'est plus étiqueté par un SectionLabel`,
      ).toMatch(new RegExp(`<SectionLabel t=\\{t\\}[^>]*>${attendu}</SectionLabel>`));
    }
  });

  it('chaque chapitre dit ce qu’il PILOTE, pas seulement de quoi il parle', () => {
    // C'est le sous-titre qui fait le travail de cette passe, pas le découpage :
    // sans lui, rien n'indique que « Sport & activité » décide de la dépense, donc
    // rien n'y envoie qui doute de son chiffre. Le NEAT (80 kcal/j le cran en
    // médiane, mesuré) n'est demandé nulle part ailleurs, pas même à l'inscription.
    for (const chap of CHAPITRES) {
      const m = SRC_PROFIL.match(new RegExp(`<SectionLabel t=\\{t\\}([^>]*)>${chap}</SectionLabel>`));
      expect(m, `le chapitre « ${chap} » a disparu`).toBeTruthy();
      const sub = m![1].match(/sub="([^"]+)"/);
      expect(sub, `le chapitre « ${chap} » n'a plus de sous-titre`).toBeTruthy();
      // ≤ 5 mots, pas de point final : c'est une adresse, pas une explication.
      expect(sub![1].trim().split(/\s+/).length, `sous-titre trop long : « ${sub![1]} »`).toBeLessThanOrEqual(5);
      expect(sub![1].trim().endsWith('.'), `sous-titre ponctué : « ${sub![1]} »`).toBe(false);
    }
  });
});

describe('Profil — la FORME d’une ligne dit sa nature', () => {
  it('« Régénérer » est un bouton, pas une ligne de réglage', () => {
    // Une action n'a pas de valeur à droite : la ranger dans une liste de réglages
    // lui fait porter un état (« Repartir de zéro ») qu'elle n'a pas.
    expect(SRC_PROFIL, '« Régénérer mon plan » est redevenu une ligne de menu')
      .not.toMatch(/<MenuRow[^>]*label="Régénérer/);
    expect(SRC_PROFIL, 'le bouton « Régénérer mon plan » a disparu')
      .toMatch(/<Text style=\{s\.actionTxt\}>Régénérer mon plan<\/Text>/);
  });

  it('le poids n’a qu’UNE porte d’entrée, et c’est celle qui tient l’historique', () => {
    // 🔴 Le seul défaut RÉEL de cette passe. « Me peser » ajoute un point à la série
    // ET recale le profil ; un champ de saisie dans « Informations » ne recalait que
    // le profil. Sur le même écran, la carte du haut affichait alors le poids du
    // PROFIL en grand, au-dessus d'une courbe et d'un écart tirés d'une SÉRIE qui
    // ignorait la correction. Le suivi de l'objectif daté lit la même série.
    expect(SRC_PROFIL, 'le poids est redevenu saisissable hors de la pesée')
      .not.toMatch(/<Field[^>]*label="Poids"/);
    // Et le renvoi doit exister : retirer le champ SANS porte de sortie enfermerait
    // qui veut corriger son poids depuis l'écran où il vient de lire son corps.
    expect(SRC_PROFIL, 'le renvoi vers la pesée a disparu d’« Informations »')
      .toMatch(/onPress=\{onWeighIn\}/);
  });
});

describe('Réglages — deux lignes ne mènent pas au même endroit', () => {
  it('aucune route n’est poussée par deux lignes de la feuille', () => {
    const routes = [...SRC_REGLAGES.matchAll(/versRoute\('([^']+)'\)/g)].map((m) => m[1]);
    expect(routes.length, 'la feuille ne pousse plus aucune route').toBeGreaterThan(0);
    const doublons = routes.filter((r, i) => routes.indexOf(r) !== i);
    expect(doublons, `route(s) atteinte(s) par deux lignes : ${doublons.join(', ')}`).toEqual([]);
  });

  it('l’adresse de support n’est pas recopiée dans la feuille', () => {
    // Une adresse en dur à côté de `lib/feedback.ts::SUPPORT_EMAIL`, c'est la
    // première des deux qui ment le jour où elle change.
    expect(SRC_REGLAGES).not.toMatch(/@kyroz\.app/);
    expect(SRC_PROFIL).not.toMatch(/@kyroz\.app/);
  });
});

describe('Profil — la visite guidée descend l’écran, elle ne fait pas d’aller-retour', () => {
  /** Où l'élément visé est-il RENDU dans le source ? (pas où sa ref est créée) */
  function positionRendu(id: string): number {
    const direct = SRC_PROFIL.indexOf(`tourId="${id}"`);
    if (direct >= 0) return direct;
    const decl = SRC_PROFIL.match(new RegExp(`const\\s+(\\w+)\\s*=\\s*useTourTarget\\(\\s*['"]${id}['"]`));
    return decl ? SRC_PROFIL.indexOf(`ref={${decl[1]}}`) : -1;
  }

  const etapes = profilTour({ objectifDateDisponible: true });

  it('chaque étape vise un élément réellement rendu par l’écran', () => {
    for (const e of etapes) {
      expect(positionRendu(e.targetId), `« ${e.targetId} » n'est attachée à aucun élément rendu`).toBeGreaterThanOrEqual(0);
    }
  });

  it('les étapes suivent l’écran de haut en bas — la dernière exceptée', () => {
    // Chaque étape fait DÉFILER jusqu'à sa cible : une étape mal placée fait
    // remonter puis redescendre, et ce va-et-vient se lit comme un bug. Seule la
    // dernière remonte volontairement (la roue est en haut, le tour s'y termine).
    const descente = etapes.slice(0, -1);
    const positions = descente.map((e) => positionRendu(e.targetId));
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i],
        `« ${descente[i].targetId} » est rendue AVANT « ${descente[i - 1].targetId} » : le tour remonte puis redescend`,
      ).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('la dépense estimée est présentée avec les cibles qu’elle explique', () => {
    // Elle vivait après les onze lignes de menu. Le repère : elle est rendue
    // AVANT le premier bloc de réglages, donc dans le même coup d'œil que les
    // quatre boîtes de macros.
    const tdee = positionRendu('profil-tdee');
    const premierBloc = SRC_PROFIL.search(/<SectionLabel t=\{t\}[^>]*>TOI<\/SectionLabel>/);
    expect(premierBloc, 'le bloc « TOI » a disparu').toBeGreaterThan(0);
    expect(tdee, 'la dépense estimée est repassée sous les lignes de menu').toBeLessThan(premierBloc);
  });
});
