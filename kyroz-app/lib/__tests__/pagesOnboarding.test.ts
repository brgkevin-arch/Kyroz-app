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

  it('🔴 les jours de repos ne s\'affichent pas sans sport déclaré', () => {
    // C'était une page SAUTÉE jusqu'au 2026-09-23 ; c'est désormais une rangée sur la
    // page des séances, gardée par le même prédicat. Sans séance, `dayExpenditures`
    // rend une cible plate : un jour de repos coché n'y déplacerait rien (A23).
    expect(onboarding).toMatch(/\{!noSport && \([\s\S]{0,200}?<RangeeJours t=\{t\} choisis=\{restWeekdays\}/);
    // …et plus aucun aiguillage de page : le mécanisme des « pages servies » est parti
    // avec la page qu'il sautait, au lieu de rester à vide.
    expect(onboarding).not.toContain('etapeServie');
    expect(onboarding).not.toContain('servies[rang]');
  });
});

describe('la dernière page renvoie vers un réglage qui EXISTE', () => {
  // « Tu pourras le régler dans Profil → Paramètres des repas » est une affirmation sur
  // le code (CLAUDE.md §10) : la section « Repas que tu gères toi-même » doit vivre dans
  // l'éditeur que la ligne « Paramètres des repas » du Profil ouvre.
  const profil = sansCommentaires(readFileSync(join(RACINE, 'app/(tabs)/profil.tsx'), 'utf8'));

  it('la phrase est à l’écran', () => {
    expect(onboarding).toContain('régler dans Profil → Paramètres des repas.');
  });

  it('le Profil a bien la ligne ET la section qu’elle promet', () => {
    expect(profil).toMatch(/<MenuRow[^>]*label="Paramètres des repas"/);
    expect(profil).toMatch(/title="Paramètres des repas"[\s\S]*Repas que tu gères toi-même/);
    expect(profil).toContain("'Je gère'");
  });
});

