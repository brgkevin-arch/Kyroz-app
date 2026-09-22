import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Les pages de l'inscription, par leur NOM ─────────────────────────────────
//
// Depuis le 2026-09-22 (refonte en dix pages, une par PR), l'onboarding décrit ses
// pages dans un tableau `ETAPES` et chaque condition lit `etape === '…'`. Trois
// oublis possibles en ajoutant une page, et aucun ne se voit en relisant un diff :
//  · la page n'entre pas dans `canProceed` → « Continuer » ne passe JAMAIS, la
//    personne reste coincée (il n'y a plus de fourre-tout qui laissait passer) ;
//  · la page n'a pas de rendu → un écran vide avec un bouton ;
//  · la garde de la page « repos » part → des jours de repos demandés à qui ne fait
//    pas de sport, pour un réglage qui ne changerait rien à son plan (A23).
//
// Lu SANS les commentaires : une note qui cite `etape === 'repos'` ne doit pas se
// porter garante du code qu'elle décrit.

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const onboarding = sansCommentaires(readFileSync(join(RACINE, 'app/(auth)/onboarding.tsx'), 'utf8'));

const etapes = (/const ETAPES = \[([\s\S]*?)\] as const/.exec(onboarding)?.[1] ?? '')
  .split(',').map((e) => e.trim().replace(/^'|'$/g, '')).filter(Boolean);

describe('les pages de l’inscription', () => {
  it('le tableau des pages se lit', () => {
    expect(etapes.length, 'ETAPES introuvable').toBeGreaterThan(5);
    const total = Number(/const TOTAL_STEPS(?::[^=]+)? = (\d+);/.exec(onboarding)?.[1]);
    expect(total).toBe(etapes.length);
  });

  it('chaque page a sa condition pour avancer — sinon « Continuer » ne passe jamais', () => {
    const garde = /const canProceed =[\s\S]*?;/.exec(onboarding)?.[0] ?? '';
    for (const e of etapes) expect(garde, `« ${e} » absente de canProceed`).toContain(`etape === '${e}'`);
  });

  it('chaque page a son rendu — sinon un écran vide avec un bouton', () => {
    for (const e of etapes) {
      expect(onboarding, `« ${e} » n'a pas de rendu`).toMatch(new RegExp(`\\{etape === '${e}' &&`));
    }
  });

  it('🔴 les jours de repos sautent sans sport déclaré', () => {
    expect(onboarding).toContain("const etapeServie = (e: Etape) => e !== 'repos' || !noSport;");
    // …et la navigation passe par les pages SERVIES, pas par le numéro suivant.
    expect(onboarding).toContain('const suivante = servies[rang];');
    expect(onboarding).toContain('const precedente = servies[rang - 2];');
    expect(onboarding).not.toMatch(/setStep\(step [+-] 1\)/);
  });
});
