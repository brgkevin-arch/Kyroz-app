import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── LA QUESTION DU NEAT EST POSÉE À L'INSCRIPTION — ET NE PEUT PAS ÊTRE SAUTÉE ─
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, mesuré le 2026-08-19 : `neat_level` ne
// s'écrivait QUE depuis Profil → *Sport & activité*. L'inscription ne posait pas la
// question, donc `neatPal(undefined)` servait `desk` (1,30) à quiconque n'allait pas
// chercher le réglage à deux touchers de profondeur — c'est-à-dire à presque tout le
// monde. Or c'est le réglage le plus lourd de l'app : un cran vaut ~78 kcal/j de
// dépense (médiane, 1 000 gabarits, 2026-08-18), `desk` → `physical` 234. Le défaut
// n'était pas faux — il est le cran le plus prudent, à dessein — il était SERVI SANS
// AVOIR ÉTÉ CHOISI, ce qui n'est pas la même chose.
//
// ⚠️ CE TEST VÉRIFIE UNE PRÉSENCE ATTENDUE, PAS L'ABSENCE D'UNE FORME REDOUTÉE
// (leçon A38) : « l'écran rend `NeatPicker` » attrape toutes les manières de retirer
// la question, là où « l'écran ne contient pas X » n'en attrape qu'une.
//
// ⚠️ ET IL LIT LA SOURCE SANS SES COMMENTAIRES. Les deux écrans PARLENT de
// `NeatPicker` dans une note ; sans ce filtre, une note se porterait garante du code
// qu'elle décrit — le défaut qu'`emailConfirmation.test.ts` avait déjà payé.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const ONBOARDING = 'app/(auth)/onboarding.tsx';
const PROFIL = 'app/(tabs)/profil.tsx';
const PICKER = 'components/NeatPicker.tsx';

const onboarding = sansCommentaires(lire(ONBOARDING));
const profil = sansCommentaires(lire(PROFIL));

describe('la question est posée à l\'inscription', () => {
  it('l\'étape 4 rend le sélecteur de NEAT', () => {
    expect(onboarding).toContain('<NeatPicker');
    expect(onboarding).toContain("from '../../components/NeatPicker'");
  });

  it('la réponse part dans le profil enregistré', () => {
    expect(onboarding).toMatch(/neat_level:\s*neat/);
  });

  it('rien n\'est présélectionné — sinon le défaut passerait pour une réponse', () => {
    // C'est LE point du chantier : `useState(DEFAULT_NEAT_LEVEL)` rendrait l'écran
    // identique à l'œil et laisserait « journées assises » être servi à qui ne
    // touche à rien — soit exactement l'état d'avant, avec une question en plus.
    expect(onboarding).toMatch(/useState<NeatLevel \| null>\(null\)/);
  });

  it('on ne peut pas passer l\'étape 4 sans avoir répondu', () => {
    const validation = onboarding.match(/const trainingValid = .*/)?.[0] ?? '';
    expect(validation).toContain('neat !== null');
    // …et la garde doit RESTER branchée sur le bouton : `canProceed` lit `trainingValid`.
    expect(onboarding).toMatch(/step === 4 && trainingValid/);
  });

  it('l\'étape dit pourquoi elle bloque, sans accuser', () => {
    expect(onboarding).toContain('Choisis à quoi ressemblent tes journées, hors sport.');
  });
});

describe('un seul composant pour les deux écrans', () => {
  it('l\'inscription et le Profil posent la question par le MÊME composant', () => {
    expect(profil).toContain('<NeatPicker');
    expect(profil).toContain("from '../../components/NeatPicker'");
  });

  it('aucun écran ne redéploie la liste des crans dans son coin', () => {
    // Une seconde liste `NEAT_ORDER.map(...)` serait une copie qui dérive : les
    // libellés sont un garde-fou anti-inflation (neat-libelles.test.ts), et un
    // garde-fou qui ne couvre qu'un écran sur deux ne couvre rien.
    for (const [nom, src] of [[ONBOARDING, onboarding], [PROFIL, profil]] as const) {
      expect(src, nom).not.toContain('NEAT_ORDER.map');
      expect(src, nom).not.toContain('NEAT_LABEL[');
    }
    expect(sansCommentaires(lire(PICKER))).toContain('NEAT_ORDER.map');
  });

  it('le NEAT est demandé AVANT les séances, dans les deux écrans', () => {
    // L'ordre est une règle, pas une mise en page : le texte du composant dit
    // « elles sont comptées juste en dessous » en parlant des séances, et l'ordre
    // inverse inviterait à répondre « je suis actif » en pensant à son sport —
    // le double-comptage que la table NEAT existe pour éviter.
    for (const [nom, src] of [[ONBOARDING, onboarding], [PROFIL, profil]] as const) {
      const neat = src.indexOf('<NeatPicker');
      const sport = src.indexOf('<SportsEditor');
      expect(neat, nom).toBeGreaterThan(-1);
      expect(sport, nom).toBeGreaterThan(-1);
      expect(neat, nom).toBeLessThan(sport);
    }
  });
});
