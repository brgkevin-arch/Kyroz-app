import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { seuilRepli, paddingHautDecale, COMPACT_BAR_H, SEUIL_PAR_DEFAUT } from '../collapsingTitle';

// ── Le seuil de repli du grand titre ────────────────────────────────────────
//
// Pourquoi ce test existe : le MOUVEMENT est invérifiable dans le panneau
// navigateur — `requestAnimationFrame` n'y tourne pas (0 frame en 7,2 s,
// mesuré le 2026-08-04, cf. docs/comparer-maquette.md). Une animation y démarre,
// rend une frame, puis se fige à une valeur intermédiaire parfaitement
// plausible. On ne peut donc PAS conclure « le repli marche » depuis une
// capture. La décision — à partir de quel défilement le titre compact prend le
// relais — est donc une fonction pure, et c'est ELLE qu'on vérifie.

describe('Repli du grand titre — le seuil', () => {
  it("attend que le bas de l'en-tête soit passé sous la barre", () => {
    // En-tête de 90 pt posé en haut du contenu : il a disparu quand on a
    // défilé de 90 − 52 = 38 pt.
    expect(seuilRepli(0, 90, 0)).toBe(90 - COMPACT_BAR_H);
    // Un en-tête décalé dans le contenu décale le seuil d'autant.
    expect(seuilRepli(24, 90, 0)).toBe(24 + 90 - COMPACT_BAR_H);
  });

  it('ne peut JAMAIS renvoyer un seuil négatif — le cas qui casse tout', () => {
    // Un en-tête plus COURT que la barre donnerait un seuil négatif, donc un
    // titre compact affiché en permanence, POSÉ PAR-DESSUS le grand titre.
    // C'est le cas de l'écran Frigo quand le stock est vide : l'en-tête se
    // réduit à sa seule ligne.
    for (const h of [0, 10, 30, COMPACT_BAR_H, COMPACT_BAR_H + 10]) {
      expect(seuilRepli(0, h, 0), `hauteur ${h}`).toBeGreaterThan(0);
    }
    expect(seuilRepli(0, 0, 0)).toBe(24);
    expect(seuilRepli(62, 30, 62), 'en-tête court sous l’îlot').toBe(24);
  });

  it('croît avec la hauteur de l’en-tête — un titre plus haut se replie plus tard', () => {
    const seuils = [80, 100, 140, 200].map((h) => seuilRepli(0, h, 0));
    for (let i = 1; i < seuils.length; i++) {
      expect(seuils[i]).toBeGreaterThan(seuils[i - 1]);
    }
  });

  it('le repli par défaut est plus HAUT que tout seuil mesuré plausible', () => {
    // Avant la première mesure, on préfère un titre compact qui tarde à un titre
    // compact posé trop tôt. Le défaut doit donc dominer les en-têtes courants
    // (les cinq onglets tiennent entre 70 et 130 pt).
    for (const h of [70, 90, 110, 130]) {
      expect(SEUIL_PAR_DEFAUT).toBeGreaterThanOrEqual(seuilRepli(0, h, 0));
    }
  });

  it('🔴 sous l’îlot : le seuil ne bouge PAS d’un point quand le contenu descend de la barre d’état', () => {
    // 2026-10-19 : la zone défilante remonte sous l'heure et son contenu redescend
    // de `haut` (62 pt sur iPhone 17). L'en-tête est donc 62 pt plus bas dans le
    // contenu, et la barre compacte se termine 62 pt plus bas à l'écran : le
    // défilement auquel le grand titre disparaît est EXACTEMENT celui d'avant.
    for (const h of [70, 90, 130]) {
      expect(seuilRepli(20 + 62, h, 62), `hauteur ${h}`).toBe(seuilRepli(20, h, 0));
    }
  });
});

describe('Le contenu redescend de la barre d’état — au repos, rien ne bouge', () => {
  it('ajoute la barre d’état au rembourrage du haut, quel que soit son nom', () => {
    expect(paddingHautDecale({ padding: 20 }, 62)).toBe(82);
    expect(paddingHautDecale({ padding: 20, paddingTop: 12 }, 62)).toBe(74);
    expect(paddingHautDecale({ paddingVertical: 8, padding: 20 }, 62)).toBe(70);
    expect(paddingHautDecale({}, 62)).toBe(62);
  });

  it('sans barre d’état (web, iPad), le contenu garde exactement son rembourrage', () => {
    expect(paddingHautDecale({ padding: 20 }, 0)).toBe(20);
    expect(paddingHautDecale({ paddingTop: 4 }, 0)).toBe(4);
  });
});

// ── Les cinq onglets défilent SOUS la barre d'état (2026-10-19) ──────────────
//
// Une affirmation sur le CODE des écrans, pas sur l'arithmétique : la mécanique tient
// en trois pièces qui ne valent qu'ensemble, et chacune s'oublie seule.
//   1. la zone défilante remonte (`style={repli.zone}`) ;
//   2. son contenu redescend d'autant (`repli.contenu(`) — sans lui, le grand titre
//      partirait sous l'îlot dès l'ouverture ;
//   3. la barre d'onglets d'iOS n'ajoute PAS sa propre marge par-dessus
//      (`disableAutomaticContentInsets`) — sans lui, 62 pt de trop, sur certains
//      onglets seulement (mesuré au simulateur : Recettes et Profil, pas le Plan).
const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('Sous l’îlot — chaque onglet porte les trois pièces', () => {
  const dossier = join(RACINE, 'app', '(tabs)');
  const ecrans = readdirSync(dossier).filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx');

  it('🔴 les cinq écrans remontent leur zone défilante ET redescendent leur contenu', () => {
    // Le compte d'abord : un dossier vide passerait au vert sans rien mesurer.
    expect(ecrans.length, ecrans.join(', ')).toBe(5);
    const fautifs = ecrans.filter((f) => {
      const src = sansCommentaires(readFileSync(join(dossier, f), 'utf8'));
      return !src.includes('style={repli.zone}') || !src.includes('repli.contenu(');
    });
    expect(fautifs, `sans les deux pièces : ${fautifs.join(', ')}`).toEqual([]);
  });

  it('🔴 la barre d’onglets d’iOS n’ajoute pas sa propre marge par-dessus', () => {
    const layout = sansCommentaires(readFileSync(join(dossier, '_layout.tsx'), 'utf8'));
    expect(layout).toMatch(/<NativeTabs\.Trigger\b[^>]*\bdisableAutomaticContentInsets\b/);
  });

  it('le rafraîchissement tiré vers le bas sort SOUS l’îlot, pas derrière', () => {
    for (const f of ['plan.tsx', 'courses.tsx']) {
      const src = sansCommentaires(readFileSync(join(dossier, f), 'utf8'));
      expect(src, f).toMatch(/<RefreshControl\b[^>]*progressViewOffset=\{repli\.haut\}/);
    }
  });

  it('le titre compact est posé SOUS la barre d’état, jamais en haut de l’écran (l’îlot le cachait)', () => {
    const src = sansCommentaires(readFileSync(join(RACINE, 'components', 'CollapsingTitle.tsx'), 'utf8'));
    expect(src).toMatch(/style=\{\[styles\.centre, \{ top: haut \}\]\}/);
  });
});
