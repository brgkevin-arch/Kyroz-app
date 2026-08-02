import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL, PRIVACY_POLICY, TERMS_OF_USE } from '../../constants/legal';

/**
 * Le texte légal existe en DEUX exemplaires, et c'est voulu :
 *   • `constants/legal.ts` → l'écran in-app `/legal` ;
 *   • `public/legal.html` → une URL publique servie en HTTP 200, exigée par les
 *     stores (le web est exporté en SPA, donc `/legal` y renverrait un 404).
 *
 * ⚠️ Les deux fichiers se recopient À LA MAIN. Leur en-tête le dit depuis toujours
 * (« mets à jour LES DEUX ») — mais rien ne l'attrapait, et une politique de
 * confidentialité qui dit deux choses différentes selon l'endroit où on la lit
 * est exactement le mensonge que `CLAUDE.md` §10 interdit. Ce fichier est le
 * garde-fou : le miroir HTML doit contenir CHAQUE paragraphe de la source.
 *
 * Écrit le 2026-08-02, en ajoutant RevenueCat aux sous-traitants — c'est-à-dire au
 * moment précis où les deux copies pouvaient diverger pour de bon.
 */

const HTML = readFileSync(join(__dirname, '../../public/legal.html'), 'utf8');

/** Apostrophes, guillemets et espaces insécables varient d'une copie à l'autre. */
const norm = (s: string) =>
  s.replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const htmlNorm = norm(HTML);

describe('le miroir HTML ne peut pas diverger de la source', () => {
  it('contient chaque paragraphe de la politique de confidentialité', () => {
    for (const sec of PRIVACY_POLICY) {
      expect(htmlNorm, `titre manquant : ${sec.title}`).toContain(norm(sec.title));
      for (const p of sec.paragraphs) {
        expect(htmlNorm, `§${sec.title} — paragraphe absent du miroir`).toContain(norm(p));
      }
    }
  });

  it('contient chaque paragraphe des CGU', () => {
    for (const sec of TERMS_OF_USE) {
      expect(htmlNorm, `titre manquant : ${sec.title}`).toContain(norm(sec.title));
      for (const p of sec.paragraphs) {
        expect(htmlNorm, `§${sec.title} — paragraphe absent du miroir`).toContain(norm(p));
      }
    }
  });

  it('porte la même date de dernière mise à jour', () => {
    // Modifier le texte sans bouger la date ferait mentir la page sur sa fraîcheur.
    expect(htmlNorm).toContain(norm(LEGAL.effectiveDate));
  });
});

describe("ce que le texte doit dire avant qu'un abonnement puisse être vendu", () => {
  // Ces phrases ne sont pas décoratives : deux d'entre elles sont contrôlées par
  // la revue Apple (Guideline 3.1.2), la troisième est une obligation RGPD.

  const tousLesParas = [...PRIVACY_POLICY, ...TERMS_OF_USE].flatMap((s) => s.paragraphs).join(' ');

  it('nomme RevenueCat comme sous-traitant', () => {
    // Sans ça, §5 promet « aucun tiers » alors qu'un tiers reçoit l'identifiant du
    // compte. La politique deviendrait fausse le jour du premier abonné.
    expect(tousLesParas).toContain('RevenueCat');
  });

  it('dit que le renouvellement est automatique ET comment y échapper', () => {
    expect(tousLesParas).toMatch(/renouvelle automatiquement/);
    expect(tousLesParas).toMatch(/24 heures/);
  });

  it('dit que supprimer son compte Kyroz n’annule PAS l’abonnement', () => {
    // Le piège coûte de l'argent réel à quelqu'un qui croit avoir tout arrêté.
    expect(tousLesParas).toMatch(/n’annule PAS un abonnement|n'annule PAS un abonnement/);
  });

  it('ne promet AUCUNE donnée bancaire chez Kyroz', () => {
    expect(tousLesParas).toMatch(/coordonnée bancaire/);
  });
});
