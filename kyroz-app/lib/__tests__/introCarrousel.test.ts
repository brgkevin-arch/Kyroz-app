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
    expect(carrousel).toMatch(/<PrimaryButton[^>]*label="Commencer"[^>]*onPress=\{partir\}/s);
    expect(carrousel).not.toMatch(/disabled=\{[^}]*index/);
  });

  it('une animation de sortie INTERROMPUE passe quand même la main', () => {
    // 🔴 LE RISQUE QUE L'ANIMATION A INTRODUIT (2026-09-07). Le bouton ne rend plus
    // la main directement : il joue une sortie, puis appelle `onTermine` dans le
    // rappel de fin. Or `finished` est FAUX quand la vue se démonte ou que
    // l'animation est coupée — n'appeler `onTermine` que sur `finished === true`
    // laisserait quelqu'un sur un accueil à demi effacé, sans bouton pour en sortir.
    // C'est la panne de l'écran « Avant de commencer » (2026-08-12) sous une autre
    // forme : un portail qui ne s'ouvre pas.
    const rappel = carrousel.match(/\.start\(\(\{ finished \}\) => \{[\s\S]*?\}\);/)?.[0] ?? '';
    expect(rappel, 'le rappel de fin doit exister').not.toBe('');
    expect(rappel).toContain('onTermine()');
    // …et il ne doit PAS être gardé par `finished`.
    expect(rappel).not.toMatch(/if \(\s*finished\s*\)/);
    expect(rappel).not.toMatch(/finished\s*&&/);
  });

  it('le formulaire n\'est animé QUE depuis l\'accueil', () => {
    // Cet écran est revu à chaque connexion, chaque déconnexion, chaque mot de passe
    // refusé. L'animer à chaque visite transformerait un écran ordinaire en attente
    // — c'est le premier filtre de toute décision d'animation : la fréquence.
    expect(login).toMatch(/if \(!vientDeLIntro\) return;/);
    expect(login).toMatch(/useRef\(new Animated\.Value\(1\)\)/);
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
    const script = sansCommentaires(lire('test/intro-captures.mjs'));
    expect(script).toContain('assets');

    // 🔴 CHAQUE DIAPO PROUVE SON ÉCRAN AVANT D'ÊTRE PHOTOGRAPHIÉE. Les captures
    // montrent la page entière depuis le 2026-09-07 : il n'y a plus de cadrage à
    // vérifier, mais la vérification qui compte reste celle-ci. Un onglet qui ne
    // bascule pas ne lève AUCUNE erreur — la page reste celle d'avant et la capture
    // l'immortalise sous un autre nom. C'est la panne exacte de `store-assets.mjs`
    // le 2026-09-02 : quatre visuels de fiche App Store identiques, code de sortie 0.
    expect(script).toMatch(/ancre[\s\S]{0,400}isVisible/);
    expect(script).toMatch(/l'écran n'est pas celui attendu/);

    // …et une diapo manquante fait ÉCHOUER le script, elle ne le laisse pas finir
    // en silence sur un jeu d'images incomplet.
    expect(script).toMatch(/manques\+\+/);
    expect(script).toMatch(/process\.exit\(1\)/);
  });
});
