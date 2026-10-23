import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── « QUE L'APP TOURNE EN SILENCE » (point 4 avant la 62ᵉ OTA, 2026-10-22) ──────────────
//
// Demande du fondateur : *« la phrase est inutile pour un user… j'aimerais enlever ces
// phrases et l'app tourne en silence… vérifie s'il y a d'autres choses similaires. »*
// L'inventaire (docs/2026-10-22-point-4-phrases.md) a recensé, écran par écran, les phrases
// qui racontent ce que Kyroz fait en coulisses ou annoncent après coup ce que l'écran montre
// déjà ; il a validé les retraits un par un. Ce fichier empêche leur retour.
//
// ⚠️ Les commentaires sont écartés avant la recherche : le code CITE ces phrases pour dire
// pourquoi elles sont parties, et ces citations ne s'affichent pas.

const lire = (...chemin: string[]) =>
  readFileSync(join(__dirname, '..', '..', ...chemin), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const RETIREES: [string[], string][] = [
  [['app', '(tabs)', 'courses.tsx'], 'il t’en faut'],
  [['app', '(tabs)', 'courses.tsx'], 'Formats courants en magasin'],
  [['app', '(tabs)', 'courses.tsx'], 'Depuis tes dernières courses'],
  [['app', '(tabs)', 'courses.tsx'], 'range le tout dans ta réserve'],
  [['app', '(tabs)', 'courses.tsx'], 'ne rejoindra pas ta réserve'],
  [['app', '(tabs)', 'courses.tsx'], 'Appui long pour retirer'],
  [['app', '(tabs)', 'courses.tsx'], 'La liste réapparaîtra'],
  [['app', '(tabs)', 'courses.tsx'], 'Ton plan de repas, lui, n'],
  [['lib', 'coursesDepuis.ts'], 'le jour où tu commences'],
  [['lib', 'coursesDepuis.ts'], 'ton plan avait déjà commencé'],
  [['app', '(tabs)', 'reserve.tsx'], 'Tout ce que tu as est rangé'],
  // n° 8, parti avec le glissement pour supprimer (2026-10-23).
  [['app', '(tabs)', 'reserve.tsx'], 'Descends à 0'],
  [['app', '(tabs)', 'plan.tsx'], 'son heure était passée'],
  [['app', '(tabs)', 'plan.tsx'], 'leur heure était passée'],
  [['app', '(tabs)', 'plan.tsx'], 'journée recalée'],
  [['app', '(tabs)', 'plan.tsx'], 'Journée réadaptée'],
  [['app', '(tabs)', 'plan.tsx'], 'avant ton début ne sont pas comptés'],
  [['app', '(tabs)', 'plan.tsx'], 'on réajuste tes macros'],
  [['app', '(tabs)', 'plan.tsx'], 'Elles suivent maintenant ton régime'],
  [['components', 'MealCard.tsx'], 'compté dans ton total'],
  [['components', 'RecipeDetail.tsx'], 'journée recalée'],
  [['components', 'RecipeDetail.tsx'], 'retirer de ma réserve'],
  [['components', 'RecipeDetail.tsx'], 'un peu au-dessus de ta cible'],
  [['components', 'RecipeDetail.tsx'], 'un peu en dessous de ta cible'],
  [['components', 'RecipeDetail.tsx'], 'un peu pauvre en protéines'],
];

describe('l’app tourne en silence (point 4, 2026-10-22)', () => {
  it('aucune des phrases retirées ne revient à l’écran', () => {
    const revenues = RETIREES.filter(([f, phrase]) => lire(...f).includes(phrase))
      .map(([f, phrase]) => `${f.join('/')} : « ${phrase} »`);
    expect(revenues).toEqual([]);
  });

  it('le seul bandeau du Plan est celui qui dit où revenir', () => {
    // « ✓ Mangé », « C'est noté, on te change ça », « Recette changée », « Parfait, on
    // continue »… : le changement se voit déjà à l'écran. Reste « Réactivable dans Profil »,
    // qui dit où retrouver ce qu'on vient d'éteindre.
    const toasts = [...lire('app', '(tabs)', 'plan.tsx').matchAll(/\btoast\(([^)]*)\)/g)].map((m) => m[1].trim());
    expect(toasts).toEqual(["'Ok. Réactivable dans Profil.'"]);
  });

  it('la fiche recette garde la seule note qui demande un geste', () => {
    const fiche = lire('components', 'RecipeDetail.tsx');
    expect(fiche).toContain('de protéines sous ta cible\\u00A0: ajoute un side protéiné.');
  });

  it('la sonde sait dire OUI : une phrase retirée remise dans le code est trouvée', () => {
    const sonde = "toast('Repas sauté, journée recalée');".replace(/^\s*\/\/.*$/gm, '');
    expect(sonde.includes('journée recalée')).toBe(true);
    expect([...sonde.matchAll(/\btoast\(([^)]*)\)/g)].length).toBe(1);
  });
});
