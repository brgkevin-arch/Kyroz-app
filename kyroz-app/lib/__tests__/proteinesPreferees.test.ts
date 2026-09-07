import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── LA QUESTION DES PROTÉINES EST POSÉE, ET « PEU IMPORTE » EST UNE RÉPONSE ──
//
// 🔴 CE QUE CE FICHIER FERME, mesuré le 2026-09-07. Le mécanisme de goût du moteur est
// PUISSANT — `planEngine::preferredRecipeIds` place les protéines déclarées en priorité
// ABSOLUE et filtre le panier dessus. Mesuré sur un homme de 80 kg en sèche : déclarer
// « Poulet » fait passer la semaine de **3 à 7 plats animaux sur 14**, et met du poulet
// aux deux premiers repas.
//
// Il n'était simplement JAMAIS renseigné : l'étape 6 se passait d'un tap sans rien
// cocher, donc `preferred_proteins` restait vide pour la quasi-totalité des comptes, et
// le catalogue décidait seul. C'est le défaut « un réglage qui ne pilote rien » — sauf
// qu'ici le réglage marche très bien, c'est la QUESTION qui n'était pas posée.
//
// ⚠️ ET CE N'EST PAS LA MÊME HISTOIRE AU PETIT-DÉJEUNER. Mesuré le même jour : les deux
// options carnées de l'écran trouvent **0 recette** au petit-déjeuner et **0** à la
// collation (contre 36 et 24 aux plats). Rendre la question obligatoire ne corrige donc
// QUE la moitié « plats » du problème ; l'autre moitié est un trou de catalogue, qui se
// comble en écrivant des recettes. Ne pas conclure de ce test que le sujet est clos.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const onboarding = sansCommentaires(lire('app/(auth)/onboarding.tsx'));
const moteur = sansCommentaires(lire('lib/planEngine.ts'));
const brouillon = sansCommentaires(lire('lib/onboardingDraft.ts'));
const harnais = sansCommentaires(lire('test/_harness.mjs'));

/** Les clés d'un objet littéral, guillemets compris ou non. */
const clesDe = (src: string): string[] =>
  [...src.matchAll(/^\s*'?([^\s:'"]+)'?\s*:/gm)].map((m) => m[1].toLowerCase());

/** Les libellés d'un tableau de chaînes. */
const motsDe = (src: string): string[] =>
  src.split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '').toLowerCase()).filter(Boolean);

describe('l\'étape 6 exige une réponse', () => {
  it('on ne peut plus la passer sans rien cocher', () => {
    expect(onboarding).toMatch(/const preferencesValid = proteinesEgales \|\| proteins\.length >= 1/);
    expect(onboarding).toMatch(/step === 6 && preferencesValid/);
    // …et l'étape doit ENTRER dans la liste des étapes gardées : l'oublier ici
    // laisserait `canProceed` retomber sur son `!includes` fourre-tout, donc passer.
    expect(onboarding).toMatch(/!\[1, 2, 3, 4, 5, 6, 7\]\.includes\(step\)/);
  });

  it('l\'étape dit ce qui manque, et nomme la porte de sortie', () => {
    expect(onboarding).toContain('Choisis tes protéines préférées, ou « Peu importe ».');
  });
});

describe('« Peu importe » ne s\'enregistre pas comme une protéine', () => {
  it('la réponse « aucune préférence » écrit une liste VIDE', () => {
    // 🔴 La faute évidente serait d'enregistrer « peu importe » dans la liste. Le moteur
    // chercherait alors `PROTEIN_KEYWORDS['peu importe']`, ne trouverait rien, et
    // rendrait un ensemble vide — un réglage qui a l'air posé et ne pilote rien, soit
    // exactement le défaut que ce chantier ferme.
    expect(onboarding).toMatch(/preferred_proteins: proteinesEgales \? \[\] : proteins\.map/);
  });

  it('les options de l\'écran sont EXACTEMENT les clés du moteur', () => {
    // Sans ça, un libellé peut être coché sans que le moteur le reconnaisse — mesuré en
    // testant « viande », qui n'est pas une clé : la préférence était silencieusement
    // sans effet. L'écran propose Poulet / Bœuf, le moteur connaît poulet / bœuf.
    const options = motsDe(onboarding.match(/const PROTEINS = \[([^\]]+)\]/)?.[1] ?? '');
    const cles = clesDe(moteur.match(/const PROTEIN_KEYWORDS[^=]*= \{([\s\S]*?)\n\};/)?.[1] ?? '');
    expect(options.length, 'liste de l\'écran introuvable').toBeGreaterThan(0);
    expect(cles.length, 'table du moteur introuvable').toBeGreaterThan(0);
    for (const label of options) {
      expect(cles, `« ${label} » n'est pas une clé du moteur`).toContain(label);
    }
  });

  it('…et la sonde sait dire OUI puis NON', () => {
    // ⚠️ Elle a échoué au premier jet en cherchant `bœuf:` alors que le moteur écrit
    // `'bœuf':` — les clés accentuées y sont entre guillemets. Une sonde qui accuse le
    // code alors qu'elle lit mal est le défaut que ce dépôt paie le plus souvent.
    expect(clesDe("  poulet: ['poulet'],\n  'bœuf': ['boeuf'],")).toEqual(['poulet', 'bœuf']);
    expect(motsDe("'Poulet', 'Bœuf', 'Whey'")).toEqual(['poulet', 'bœuf', 'whey']);
    expect(clesDe("  poulet: ['poulet'],")).not.toContain('bœuf');
  });
});

describe('la réponse survit à ce qui l\'entoure', () => {
  it('le brouillon la porte — sinon elle se perd à la fermeture de l\'app', () => {
    expect(brouillon).toMatch(/proteinesEgales: boolean/);
    expect(brouillon).toMatch(/proteinesEgales: lire\('proteinesEgales'/);
    expect(onboarding).toMatch(/setProteinesEgales\(d\.proteinesEgales\)/);
  });

  it('le harnais QA sait répondre — sinon tous les scripts meurent à l\'étape 6', () => {
    // `npm test` resterait VERT : ce harnais n'en fait pas partie. C'est exactement ce
    // qui s'est produit avec le sexe (#214), découvert deux jours plus tard.
    expect(harnais).toContain("tap(page, 'Peu importe'");
  });
});
