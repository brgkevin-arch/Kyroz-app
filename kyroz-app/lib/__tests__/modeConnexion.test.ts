import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { modeDArrivee } from '../modeConnexion';

// Décision fondateur du 2026-10-19 : la connexion en gros, l'inscription en petit en
// bas — sauf juste après le carrousel d'accueil, qui est le chemin du nouvel inscrit.
// Avant : l'écran s'ouvrait sur « Inscription » pour TOUT le monde, et qui revenait
// après une déconnexion se croyait reparti de zéro (signalé le 2026-10-09).

const LOGIN = readFileSync(join(__dirname, '..', '..', 'app', '(auth)', 'login.tsx'), 'utf-8');

describe("écran de connexion — le formulaire d'arrivée", () => {
  it("l'inscription seulement en sortie d'accueil, la connexion partout ailleurs", () => {
    expect(modeDArrivee(false)).toBe('signup');
    expect(modeDArrivee(true)).toBe('signin');
  });

  it("l'écran applique la règle au lieu d'un mode écrit en dur", () => {
    expect(LOGIN).toContain('setMode(modeDArrivee(vue))');
    // Le sélecteur à deux cases mettait les deux formulaires au même rang.
    expect(LOGIN).not.toMatch(/<Segmented\b/);
  });

  it("l'autre formulaire reste atteignable, dans les deux sens", () => {
    expect(LOGIN).toContain("'Créer un compte'");
    expect(LOGIN).toContain("'Se connecter'");
  });
});
