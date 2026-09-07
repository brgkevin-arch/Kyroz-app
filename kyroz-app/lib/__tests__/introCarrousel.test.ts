import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLE_INTRO_VUE } from '../introVu';
import { CLES_CONSERVEES } from '../sessionLocale';

// ── L'ACCUEIL SE MONTRE, ET IL NE RETIENT PERSONNE ───────────────────────────
//
// 🔴 CE QU'IL FERME : le tout premier écran d'un utilisateur réel était e-mail +
// mot de passe, à froid. « Continuer en invité » est encadré `__DEV__` — invisible
// en production — et le plan n'apparaissait qu'après le compte créé ET les sept
// étapes d'inscription.
//
// 🔴 ET CE QU'IL EMPÊCHE DE REVENIR. Il y a eu ici un écran « Avant de commencer »
// qui ne rendait son bouton qu'une fois ses questions répondues : il est devenu
// INFRANCHISSABLE, tous les scripts ont conclu « écran introuvable », et il a été
// retiré le 2026-08-12 (note `passScreening`, `test/_harness.mjs`). Un écran
// d'accueil qui peut retenir quelqu'un n'accueille pas, il barre.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const carrousel = sansCommentaires(lire('components/IntroCarousel.tsx'));
const login = sansCommentaires(lire('app/(auth)/login.tsx'));
const harnais = sansCommentaires(lire('test/_harness.mjs'));

describe('l\'accueil ne barre pas la route', () => {
  it('le bouton de sortie n\'est JAMAIS conditionné à la diapo courante', () => {
    // La forme fautive serait `disabled={index < DIAPOS.length - 1}` ou un rendu
    // conditionnel du bouton. On vérifie que le bouton existe sans condition, et
    // qu'aucun `disabled` ne s'appuie sur l'index.
    expect(carrousel).toMatch(/<PrimaryButton[^>]*label="Commencer"[^>]*onPress=\{onTermine\}/s);
    expect(carrousel).not.toMatch(/disabled=\{[^}]*index/);
  });

  it('un tap sur la sortie fait AVANCER l\'écran sans attendre l\'écriture disque', () => {
    // `setIntroVue(true)` avant le `await` : si le drapeau tardait ou échouait,
    // l'utilisateur resterait bloqué sur l'accueil pour une écriture de confort.
    expect(login).toMatch(/setIntroVue\(true\);\s*void marquerIntroVue\(\)/);
  });
});

describe('les scripts QA ne buttent pas dessus', () => {
  it('le harnais neutralise l\'accueil, avec la MÊME clé que l\'app', () => {
    // Sans ça, tous les scripts Playwright s'arrêteraient sur un écran qu'ils ne
    // connaissent pas — et le diagnostic serait « champ e-mail introuvable »,
    // c'est-à-dire une accusation portée contre le formulaire.
    expect(harnais).toContain(CLE_INTRO_VUE);
  });

  it('la clé est PURGÉE à la déconnexion — elle ne rejoint pas la liste blanche', () => {
    expect(CLES_CONSERVEES).not.toContain(CLE_INTRO_VUE);
  });
});

describe('les images existent, dans les DEUX thèmes', () => {
  // Une image manquante ne casse pas la compilation : Metro résout `require` au
  // build, et l'erreur ne se voit qu'à l'exécution — sur le premier écran de l'app.
  const DIAPOS = ['1-plan', '2-poids', '3-courses', '4-recettes'];
  const THEMES = ['sombre', 'clair'];

  it.each(THEMES)('thème %s : les quatre captures sont là', (theme) => {
    for (const d of DIAPOS) {
      const chemin = join(RACINE, 'assets', 'intro', theme, `${d}.png`);
      expect(existsSync(chemin), `manquante : assets/intro/${theme}/${d}.png`).toBe(true);
    }
  });

  it('le composant charge bien un jeu par thème, et choisit selon le thème actif', () => {
    // 🔴 Une image est un pixel figé : elle ne suit pas le thème du lecteur. Servir
    // la version sombre sur un écran clair poserait un rectangle noir au milieu de
    // la page — le défaut de contraste que la palette vient de fermer, en image.
    for (const theme of THEMES) {
      for (const d of DIAPOS) {
        expect(carrousel).toContain(`../assets/intro/${theme}/${d}.png`);
      }
    }
    expect(carrousel).toMatch(/t\.scheme === 'dark' \? d\.images\.sombre : d\.images\.clair/);
  });

  it('elles se REGÉNÈRENT par script — une capture faite à la main ne se refait jamais', () => {
    const script = lire('test/intro-captures.mjs');
    expect(script).toContain('assets');
    // Le cadrage vise des TEXTES de l'écran, pas des pixels en dur : des coordonnées
    // figées périmeraient au premier ajustement de mise en page, en silence.
    expect(script).toContain('boundingBox');
    expect(sansCommentaires(script)).not.toMatch(/clip:\s*\{\s*x:\s*\d+\s*,\s*y:\s*\d+/);
  });
});
