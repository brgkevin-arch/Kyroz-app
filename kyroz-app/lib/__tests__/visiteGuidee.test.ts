import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  TOURS, TourId, TourStep, tourSteps,
  TITRE_MAX, TEXTE_MAX, ETAPES_MAX,
} from '../tours';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// LE DÉFAUT MESURÉ, le 2026-08-07 : la visite guidée du Plan comptait cinq
// bulles, et TROIS étaient fausses ou imprécises. La pire promettait « Kyroz
// recale automatiquement les repas restants » alors que le code demande d'abord
// (`logOffPlan` → `setAdaptPrompt`, et refuser ne recale rien). Elle avait été
// écrite quand c'était vrai, le comportement a changé, et rien ne l'a rattrapée
// — parce que rien ne comptait.
//
// C'est exactement le défaut de la passe émoji, consigné dans CLAUDE.md §8 :
// « une passe qui n'a pas de test se déclare terminée toute seule ». Un texte
// d'interface qui décrit un comportement est une affirmation sur le code ; sans
// un compteur, elle survit à ce qu'elle décrit.
//
// ⚠️ CE QUE CE TEST NE SAIT PAS FAIRE, et il faut le dire : il ne peut pas
// juger qu'une phrase est VRAIE. Aucun test ne le peut. Ce qu'il ferme, c'est le
// chemin par lequel la dérive est réellement arrivée — une étape qui vise une
// cible qui n'existe plus, un tour qui rétrécit en silence, un texte qui déborde
// de sa bulle. La vérité du contenu, elle, s'obtient en citant le code qui la
// prouve : `lib/tours.ts` porte cette preuve en commentaire au-dessus de chaque
// étape, et c'est cette discipline-là qu'on ne peut pas automatiser.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

function fichiersSource(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '__tests__') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiersSource(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

/** Toutes les sources d'interface, concaténées une fois. */
const SOURCES = DOSSIERS
  .flatMap((d) => fichiersSource(join(RACINE, d)))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/**
 * Les identifiants de cible réellement POSÉS dans l'interface. Trois formes :
 *   useTourTarget('plan-serie')      — ref créée sur place
 *   tourId="plan-actions"            — passée à un composant en littéral JSX
 *   tourId={i === 0 ? 'plan-cook' : undefined}  — posée conditionnellement
 * La dernière est la plus courue (première carte d'une liste), et c'est celle
 * qu'une expression trop stricte raterait.
 */
function ciblesPosees(): Set<string> {
  const ids = new Set<string>();
  for (const m of SOURCES.matchAll(/useTourTarget\(\s*['"]([\w-]+)['"]/g)) ids.add(m[1]);
  for (const m of SOURCES.matchAll(/\btourId\s*=\s*"([\w-]+)"/g)) ids.add(m[1]);
  for (const m of SOURCES.matchAll(/\b(?:tourId|cookTourId|actionsTourId)\s*=\s*\{[^}]*?['"]([\w-]+)['"]/g)) ids.add(m[1]);
  return ids;
}

/** Un contexte qui ACTIVE toutes les branches : le test doit voir chaque étape. */
const CTX_COMPLET = { days: 7, moduleParVolume: true, objectifDateDisponible: true };
/** Le contexte inverse, pour vérifier que les variantes tiennent aussi. */
const CTX_MINIMAL = { days: 1, moduleParVolume: false, objectifDateDisponible: false };

// ⚠️ `?? []` : un id absent du `switch` de `tourSteps` rend `undefined`, et sans
// ce repli l'erreur remontait à l'IMPORT du module — vitest affichait alors
// « no tests », ce qui se lit comme « rien à vérifier » et non comme un échec.
// Avec le repli, c'est le test « chaque tour rend au moins une étape » qui
// rougit, en nommant le tour fautif. Trouvé en vérifiant ce fichier par mutation.
const TOUS_LES_TOURS: { id: TourId; steps: TourStep[] }[] = TOURS.map((t) => ({
  id: t.id,
  steps: tourSteps(t.id, CTX_COMPLET) ?? [],
}));

const TOUTES_LES_ETAPES = TOUS_LES_TOURS.flatMap((t) => t.steps.map((s) => ({ tour: t.id, ...s })));

describe('Visite guidée — les tours existent et tiennent debout', () => {
  it('chaque tour déclaré rend au moins une étape', () => {
    for (const { id, steps } of TOUS_LES_TOURS) {
      expect(steps.length, `le tour « ${id} » est vide`).toBeGreaterThan(0);
    }
  });

  it('aucun tour ne dépasse la longueur au-delà de laquelle on décroche', () => {
    for (const { id, steps } of TOUS_LES_TOURS) {
      expect(steps.length, `le tour « ${id} » compte ${steps.length} étapes`).toBeLessThanOrEqual(ETAPES_MAX);
    }
  });

  it('les identifiants de cible sont uniques dans toute l\'app', () => {
    // Deux étapes qui partagent un id ne se départagent pas : la seconde
    // surlignerait la cible de la première, sans que rien ne le signale.
    const vus = new Map<string, string>();
    for (const e of TOUTES_LES_ETAPES) {
      const deja = vus.get(e.targetId);
      expect(deja, `« ${e.targetId} » est utilisé par « ${deja} » ET « ${e.tour} »`).toBeUndefined();
      vus.set(e.targetId, e.tour);
    }
  });

  it('chaque étape vise une cible RÉELLEMENT posée dans l\'interface', () => {
    // ⚠️ Le garde-fou principal. `startTour` écarte silencieusement les étapes
    // dont la cible n'est pas montée : un id mal orthographié, ou une ref retirée
    // en refactorant un écran, fait DISPARAÎTRE une bulle sans casser quoi que ce
    // soit. Le tour se joue plus court et paraît complet.
    const posees = ciblesPosees();
    const orphelines = TOUTES_LES_ETAPES
      .filter((e) => !posees.has(e.targetId))
      .map((e) => `${e.tour} → ${e.targetId}`);
    expect(orphelines, 'ces étapes visent une cible qu\'aucun écran ne pose').toEqual([]);
  });

  it('le tour du Plan et celui du Profil tiennent aussi dans leur variante minimale', () => {
    // Les deux seuls tours conditionnés. Une variante qui rendrait zéro étape, ou
    // qui déborderait, ne se verrait pas en ne testant que le cas complet.
    for (const id of ['plan', 'profil'] as TourId[]) {
      const steps = tourSteps(id, CTX_MINIMAL);
      expect(steps.length, `« ${id} » vide en contexte minimal`).toBeGreaterThan(0);
      expect(steps.length).toBeLessThanOrEqual(ETAPES_MAX);
    }
  });
});

describe('Visite guidée — la rédaction respecte ses bornes', () => {
  it('aucun titre ni texte vide', () => {
    for (const e of TOUTES_LES_ETAPES) {
      expect(e.title.trim().length, `titre vide sur ${e.targetId}`).toBeGreaterThan(0);
      expect(e.text.trim().length, `texte vide sur ${e.targetId}`).toBeGreaterThan(0);
    }
  });

  it('les titres et textes tiennent dans la bulle', () => {
    // La bulle fait au plus 360 pt de large. Au-delà de ces bornes, mesurées sur
    // le rendu, elle déborde ou pousse le bouton « Suivant » hors de l'écran sur
    // un petit téléphone.
    for (const e of TOUTES_LES_ETAPES) {
      expect(e.title.length, `titre trop long sur ${e.targetId} : « ${e.title} »`).toBeLessThanOrEqual(TITRE_MAX);
      expect(e.text.length, `texte trop long sur ${e.targetId} (${e.text.length} car.)`).toBeLessThanOrEqual(TEXTE_MAX);
    }
  });

  it('aucun émoji — la règle vaut aussi pour le tutoriel', () => {
    // CLAUDE.md §8 : pas d'émoji dans l'interface. Une bulle est de l'interface,
    // et un émoji dans une CHAÎNE ne peut pas devenir une icône : il se retire et
    // la phrase se reformule.
    const EMOJI = /\p{Extended_Pictographic}/u;
    for (const e of TOUTES_LES_ETAPES) {
      expect(EMOJI.test(e.title), `émoji dans le titre de ${e.targetId}`).toBe(false);
      expect(EMOJI.test(e.text), `émoji dans le texte de ${e.targetId}`).toBe(false);
    }
  });

  it('aucune bulle ne met la pression sur l\'utilisateur', () => {
    // Règle produit CLAUDE.md §10 : tout ce qui s'affiche à l'utilisateur doit
    // rassurer. Une liste de mots ne prouve pas qu'un texte est bienveillant —
    // elle ferme la porte au vocabulaire de la faute, qui est celui par lequel un
    // suivi devient anxiogène.
    const REPROCHE = /\b(tu dois|il faut que tu|attention à|retard|échec|raté|faute|interdit de)\b/i;
    for (const e of TOUTES_LES_ETAPES) {
      const trouve = e.text.match(REPROCHE) ?? e.title.match(REPROCHE);
      expect(trouve?.[0], `ton de reproche sur ${e.targetId}`).toBeUndefined();
    }
  });
});

describe('Visite guidée — la table des tours est la source unique', () => {
  it('chaque tour de la table a un libellé lisible pour « Revoir les tutos »', () => {
    for (const t of TOURS) {
      expect(t.label.trim().length, `libellé vide pour « ${t.id} »`).toBeGreaterThan(0);
    }
  });

  it('chaque tour de la table est réellement lancé par un écran', () => {
    // Un tour défini mais jamais déclenché apparaîtrait dans « Revoir les tutos »
    // sans que rien ne se passe — le défaut « un réglage qui ne pilote rien ».
    const lances = new Set<string>();
    for (const m of SOURCES.matchAll(/useScreenTour\(\s*['"]([\w-]+)['"]/g)) lances.add(m[1]);
    for (const t of TOURS) {
      expect(lances.has(t.id), `le tour « ${t.id} » n'est lancé par aucun écran`).toBe(true);
    }
  });

  it('aucun écran ne lance un tour absent de la table', () => {
    // Le sens inverse : un tour lancé mais hors table ne serait pas oublié par
    // « Revoir les tutos », donc impossible à rejouer une fois passé.
    const connus = new Set(TOURS.map((t) => t.id as string));
    const inconnus: string[] = [];
    for (const m of SOURCES.matchAll(/useScreenTour\(\s*['"]([\w-]+)['"]/g)) {
      if (!connus.has(m[1])) inconnus.push(m[1]);
    }
    expect(inconnus, 'ces tours sont lancés sans être déclarés dans TOURS').toEqual([]);
  });
});
