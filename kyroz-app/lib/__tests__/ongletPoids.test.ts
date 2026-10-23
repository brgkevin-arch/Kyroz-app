import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── L'onglet Poids, retouches du fondateur du 2026-10-23 ─────────────────────
//
// Cinq demandes, tranchées en une fois : la vue Semaine (avec Mois par défaut), le
// sélecteur qui défile comme sur sa vidéo, les chiffres de l'axe sans bulles,
// l'historique en haut à droite, et l'objectif daté à sa place — cadenas sans Kyroz+.
// Les règles de la COURBE (fenêtres, repères) sont tenues par `courbePoids.test.ts` ;
// ici, ce que l'écran en fait. Lu dans le code, commentaires retirés : les notes de
// ces fichiers citent l'avant.

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');
const lire = (...p: string[]) => sansCommentaires(readFileSync(join(RACINE, ...p), 'utf8'));

const ONGLET = lire('app', '(tabs)', 'poids.tsx');
const HISTORIQUE = lire('components', 'HistoriquePesees.tsx');
const COURBE = lire('components', 'CourbePoids.tsx');
const APERCU = lire('components', 'ApercuObjectif.tsx');

describe('L’onglet Poids (2026-10-23)', () => {
  it('s’ouvre sur la période par défaut de `courbePoids.ts`, jamais sur une valeur écrite ici', () => {
    expect(ONGLET).toMatch(/useState<Periode>\(PERIODE_PAR_DEFAUT\)/);
  });

  it('le sélecteur est une rangée qui défile, nourrie par PERIODES (plus de cases égales)', () => {
    expect(ONGLET).not.toMatch(/<Segmented\b/);
    expect(ONGLET).toMatch(/<ScrollView\s+horizontal[\s\S]{0,300}?PERIODES\.map/);
  });

  it('l’historique a quitté le bas de l’onglet pour sa feuille', () => {
    expect(ONGLET).not.toMatch(/historiquePesees\(/);
    expect(HISTORIQUE).toMatch(/historiquePesees\(entries, entries\.length\)/);
  });

  it('🔴 l’écart de l’historique est NEUTRE, comme celui de la courbe', () => {
    // Avant : vert à la baisse, orange à la hausse — une alerte pour qui prend du muscle.
    expect(HISTORIQUE).not.toMatch(/t\.(success|warning|danger|error)/);
  });

  it('l’objectif daté est toujours là : Kyroz+ le règle, sans Kyroz+ un aperçu flouté et un cadenas', () => {
    // La carte n'est plus réservée aux comptes qui ont DÉJÀ un objectif et Kyroz+.
    expect(ONGLET).not.toMatch(/\{profile\.goal_target && objectifOk && \(/);
    const bloc = ONGLET.match(/\{objectifOk && profile\.goal_target \? \([\s\S]*?\n        \)\}/)?.[0] ?? '';
    expect(bloc, 'la carte de l’objectif daté a disparu').not.toBe('');
    const [, kyrozPlus, gratuit] = bloc.split(/\) : (?:objectifOk \? )?\(/);
    expect(kyrozPlus, 'Kyroz+ sans objectif : la carte ouvre l’éditeur').toMatch(/onPress=\{ouvrirObjectif\}/);
    expect(gratuit, 'sans Kyroz+ : la page Kyroz+, jamais l’éditeur').toMatch(/router\.push\('\/kyroz-plus'\)/);
    expect(gratuit).not.toMatch(/ouvrirObjectif/);
    expect(gratuit, 'sans Kyroz+ : le vrai aperçu, flouté').toMatch(/<ApercuObjectif\b/);
    // Le texte vendu vient de LA liste vendue, pas d'une copie.
    expect(ONGLET).toMatch(/FONCTIONS_KYROZ_PLUS\.find\(\(f\) => f\.feature === 'dated_goal'\)/);
  });

  it('l’aperçu est flouté par un filtre SVG, et porte son cadenas', () => {
    // Un filtre SVG, pas `expo-blur` : une dépendance native couperait la ligne OTA.
    expect(APERCU).toMatch(/<G filter="url\(#flouObjectif\)">/);
    expect(APERCU).toMatch(/<FeGaussianBlur stdDeviation=\{FLOU\} \/>/);
    expect(APERCU).toMatch(/const FLOU = [1-9]/);
    expect(APERCU).toMatch(/name="lock-closed"/);
    expect(APERCU).not.toMatch(/expo-blur/);
  });

  it('les chiffres de l’axe sont nus : plus de pastille derrière', () => {
    expect(COURBE).not.toMatch(/pastille/);
    const graduation = COURBE.match(/graduation: \{[^}]*\}/)?.[0] ?? '';
    expect(graduation, 'le style des graduations a disparu').not.toBe('');
    expect(graduation).not.toMatch(/backgroundColor|borderRadius/);
    expect(COURBE).not.toMatch(/styles\.graduation, \{[^}]*backgroundColor/);
  });
});
