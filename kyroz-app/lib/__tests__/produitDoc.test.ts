import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES } from '../recipeMap';
import { goalLabel } from '../tdee';
import { PARCOURS_HORS_PLAN_ACTIF, RYTHME_HEBDOMADAIRE_ACTIF } from '../featureFlags';
import { getFridgeTracking } from '../fridgeTracking';

// ── PRODUIT.md EST UNE AFFIRMATION SUR LE PRODUIT — ce test en compte la part
//    vérifiable ────────────────────────────────────────────────────────────────
//
// 🔴 POURQUOI CE FICHIER EXISTE. Son prédécesseur — `docs/2026-08-15-synthese-…`,
// aujourd'hui archivé — est devenu faux sur **six de ses neuf sections en cinq
// jours** : deux parcours éteints le 18/08, l'offre passée de trois à deux piliers,
// la north star redéfinie le 20/08. Pendant tout ce temps il continuait d'être collé
// dans des briefs et de servir de contexte. Aucun signal, nulle part.
//
// C'est la maladie que le dépôt connaît déjà (bulles de tuto fausses, chiffres NEAT
// contradictoires, « aucun outil d'analyse tiers » resté vrai à la relecture) : une
// page qui décrit le code vieillit **dans le sens rassurant**, parce qu'elle a l'air
// juste tant qu'on ne va pas voir.
//
// ⚠️ CE QU'IL NE SAIT PAS FAIRE, et c'est écrit pour qu'on ne s'y trompe pas : juger
// qu'une PHRASE est vraie. « Le suivi rassure » ne se teste pas. Il ferme les chemins
// MÉCANIQUES — un compte, un interrupteur, un libellé, un nombre d'étapes — c'est-à-
// dire ceux par lesquels la dérive est réellement arrivée les trois fois précédentes.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const produit = lire('PRODUIT.md');

describe('PRODUIT.md — les nombres qu’il cite', () => {
  it('le catalogue annoncé est celui qui est servi', () => {
    // Le chiffre bouge à chaque vague de recettes, et il est écrit en toutes lettres
    // dans une phrase destinée à une fiche store. Il ne peut pas prendre du retard.
    expect(produit).toContain(`**${RECIPES.length} recettes**`);
  });

  it('les sept étapes de l’inscription sont bien sept', () => {
    const onboarding = lire('app/(auth)/onboarding.tsx');
    expect(onboarding).toMatch(/const TOTAL_STEPS = 7;/);
    expect(produit).toContain('sept étapes');
    // Le tableau du §1 les liste une par une : 7 lignes numérotées + la ligne du
    // consentement, qui n'en est pas une.
    const lignes = [...produit.matchAll(/^\| [1-7] \| /gm)];
    expect(lignes.length, 'lignes numérotées du tableau des étapes').toBe(7);
  });
});

describe('PRODUIT.md — ce qu’il annonce comme ÉTEINT l’est vraiment', () => {
  it('les deux parcours en suspens sont bien à l’arrêt', () => {
    // Si l'un des deux est rallumé sans que cette page bouge, elle décrit comme
    // injoignable une fonction que l'utilisateur a sous les yeux.
    expect(PARCOURS_HORS_PLAN_ACTIF).toBe(false);
    expect(RYTHME_HEBDOMADAIRE_ACTIF).toBe(false);
    expect(produit).toContain('Deux fonctions ÉTEINTES');
  });

  it('Kyroz+ compte DEUX piliers, et la page le dit', () => {
    // C'est l'erreur exacte du document précédent : il en annonçait trois, dont un
    // retiré de l'offre. Le compte est écrit noir sur blanc, donc vérifiable.
    expect(produit).toMatch(/ajoute \*\*deux\*\* choses/);
    expect(produit).toContain('Il y en avait TROIS');
  });
});

describe('PRODUIT.md — les DÉFAUTS qu’il décrit', () => {
  it('ce qu’il dit de la liste de courses suit le défaut réel du frigo', () => {
    // 🔴 CE CAS EST NÉ SIX HEURES APRÈS L'ÉCRITURE DE LA PAGE. Elle annonçait « le plan
    // moins ce qu'il y a déjà dans le frigo » — vrai le matin, faux l'après-midi quand
    // la soustraction est devenue optionnelle et ÉTEINTE par défaut. Le test d'alors ne
    // regardait pas ce paragraphe : il vérifiait des comptes et des interrupteurs, pas
    // les DÉFAUTS décrits en prose.
    // ➡️ Un doc produit ne rote pas en semaines, il rote en heures. Ce qui le tient,
    // c'est d'attacher chaque affirmation de comportement à la valeur qui la décide.
    expect(getFridgeTracking()).toBe(false);
    // ⚠️ Le motif ne contient PAS les `**` : ils entourent la phrase entière, pas le
    // mot. Une première version les plaçait autour de « PAS » et rougissait sur un
    // texte juste — le balisage n'est pas le sens.
    expect(produit).toMatch(/frigo n['’]est PAS déduit par défaut/i);
    expect(produit).toContain('Tenir compte du frigo');
  });
});

describe('PRODUIT.md — les libellés qu’il montre à l’utilisateur', () => {
  it('les quatre objectifs sont nommés comme l’app les nomme', () => {
    for (const g of ['cut', 'recomp', 'maintain', 'lean_bulk'] as const) {
      expect(produit, g).toContain(goalLabel(g));
    }
  });

  it('les deux gestes du suivi sont ceux des boutons', () => {
    expect(produit).toContain("« J'ai cuisiné »");
    expect(produit).toContain("« Je l'ai sauté »");
    const carte = lire('components/MealCard.tsx');
    const fiche = lire('components/RecipeDetail.tsx');
    expect(carte).toContain("J'ai cuisiné");
    expect(fiche).toContain("Je l'ai sauté");
  });
});

describe('PRODUIT.md — sa north star est celle de METRICS.md', () => {
  it('même définition, et le piège de vocabulaire est répété', () => {
    // Deux pages qui définissent le même indicateur sont deux vérités en puissance.
    // Celle-ci RENVOIE à METRICS.md, et doit en reprendre les deux mises en garde.
    expect(produit).toContain('METRICS.md');
    for (const p of [produit, lire('METRICS.md')]) {
      expect(p).toMatch(/7 jours actifs/i);
      // ⚠️ « pas CONSÉCUTIFS » était la formulation attendue ; les deux pages écrivent
      // « pas 7 jours d'affilée ». Le test rougissait donc sur une rédaction juste —
      // la première hypothèse devant un test rouge est que l'ASSERTION se trompe.
      // Et la classe d'apostrophes accepte les deux formes : une apostrophe
      // typographique glissée à la relecture ne doit pas casser un garde-fou.
      expect(p).toMatch(/pas.{0,30}d['’]affil/i);
    }
    // …et elle doit dire que la SÉRIE affichée n'est pas elle (METRICS.md §2).
    expect(produit).toMatch(/n['’]est \*\*pas\*\* la série affichée/);
  });
});
