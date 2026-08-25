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

/**
 * ⚠️ LES COMMENTAIRES DE CES FICHIERS CITENT LE CODE FAUTIF, y compris en fin de
 * ligne. Sans les écarter, un test s'accuse lui-même — c'est arrivé trois fois
 * dans cette famille de garde-fous.
 */
const sansCommentaires = (src: string) =>
  src
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .map((l) => l.replace(/\s\/\/.*$/, ''))
    .join('\n');

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

/** Toutes les sources d'interface, chemin RELATIF + contenu. Le chemin compte :
 *  le test « chaque cible est posée dans l'écran qui lance son tour » en dépend. */
const FICHIERS = DOSSIERS
  .flatMap((d) => fichiersSource(join(RACINE, d)))
  .map((f) => ({ chemin: f.slice(RACINE.length + 1), src: readFileSync(f, 'utf8') }));

/** Toutes les sources d'interface, concaténées une fois. */
const SOURCES = FICHIERS.map((f) => f.src).join('\n');

/**
 * Les identifiants de cible réellement POSÉS dans l'interface. Trois formes :
 *   useTourTarget('plan-serie')      — ref créée sur place
 *   tourId="plan-actions"            — passée à un composant en littéral JSX
 *   cookTourId={i === premierCuisinable ? 'plan-cook' : undefined}  — conditionnelle
 * La dernière est la plus courue (une carte d'une liste), et c'est celle qu'une
 * expression trop stricte raterait.
 */
function idsPosesDans(src: string): Set<string> {
  const ids = new Set<string>();
  for (const m of src.matchAll(/useTourTarget\(\s*['"]([\w-]+)['"]/g)) ids.add(m[1]);
  // ⚠️ TOUTE prop en `*TourId`, jamais une LISTE de noms. La version d'avant
  // énumérait `tourId|cookTourId|actionsTourId` : le jour où `statutTourId` est né
  // (l'auto-coche, 2026-08-24), le test a déclaré la cible « posée nulle part » —
  // alarmant et faux. Un garde-fou nommé d'après les implémentations qu'il connaît
  // meurt à la suivante (CLAUDE.md §8, `espacementDA` après la migration `Presse`).
  for (const m of src.matchAll(/\b\w*[Tt]ourId\s*=\s*"([\w-]+)"/g)) ids.add(m[1]);
  for (const m of src.matchAll(/\b\w*[Tt]ourId\s*=\s*\{[^}]*?['"]([\w-]+)['"]/g)) ids.add(m[1]);
  return ids;
}

function ciblesPosees(): Set<string> {
  return idsPosesDans(SOURCES);
}

/**
 * Quel FICHIER lance quel tour — `useScreenTour('profil')` dans `profil.tsx`.
 * C'est l'écran propriétaire du tour, et donc le seul dont les éléments sont
 * garantis montés au moment où le tour se joue.
 */
function lanceurDeTour(): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of FICHIERS) {
    for (const t of f.src.matchAll(/useScreenTour\(\s*['"]([\w-]+)['"]/g)) m.set(t[1], f.chemin);
  }
  return m;
}

/** Un contexte qui ACTIVE toutes les branches : le test doit voir chaque étape. */
const CTX_COMPLET = { days: 7, moduleParVolume: true, objectifDateDisponible: true, repasAuto: true };
/** Le contexte inverse, pour vérifier que les variantes tiennent aussi. */
const CTX_MINIMAL = { days: 1, moduleParVolume: false, objectifDateDisponible: false, repasAuto: false };

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

  // ⚠️ LE TEST CI-DESSUS A UN TROU, ET C'EST UNE REFONTE DU PROFIL QUI L'A MONTRÉ
  // (2026-08-09). Il cherche l'id dans TOUTES les sources concaténées : déplacer un
  // bloc de l'écran vers une feuille modale — « range le TDEE et les données du
  // compte derrière une roue dentée » — laisse l'id bien présent quelque part, donc
  // le test VERT, pendant que `startTour` écarte l'étape parce que sa cible n'est
  // pas montée. Le tour se joue à 4 bulles au lieu de 6 en ayant l'air complet.
  //
  // ➡️ L'invariant qui ferme le trou : **une cible vit dans l'écran qui LANCE son
  // tour.** Mesuré avant de l'écrire — il est vrai des 21 cibles des 5 tours, sans
  // une exception, donc il décrit le code au lieu de le contraindre. Un élément qui
  // quitte son écran quitte la portée de son tour : c'est ça, le fait.
  //
  // ⚠️ Ce qu'il ne sait PAS faire : dire qu'un élément est monté au MOMENT du tour.
  // Une cible posée dans une branche conditionnelle du bon écran lui échappe encore
  // (le bloc frigo quand le stock est vide, absence LÉGITIME). Il ferme le chemin
  // par lequel la dérive arrive vraiment — le déménagement — pas tous les chemins.
  it('chaque cible est posée DANS l\'écran qui lance son tour', () => {
    const lanceurs = lanceurDeTour();
    const parFichier = new Map(FICHIERS.map((f) => [f.chemin, idsPosesDans(f.src)]));

    const exilees = TOUTES_LES_ETAPES.flatMap((e) => {
      const ecran = lanceurs.get(e.tour);
      if (!ecran) return [`${e.tour} → aucun écran n'appelle useScreenTour('${e.tour}')`];
      if (parFichier.get(ecran)?.has(e.targetId)) return [];
      const ailleurs = FICHIERS.filter((f) => parFichier.get(f.chemin)?.has(e.targetId)).map((f) => f.chemin);
      return [`${e.tour} → « ${e.targetId} » attendu dans ${ecran}, trouvé dans ${ailleurs.join(', ') || 'nulle part'}`];
    });

    expect(
      exilees,
      'ces cibles ont quitté l\'écran qui lance leur tour — l\'étape sera écartée EN SILENCE :\n' +
        `${exilees.join('\n')}\n\n` +
        'Deux issues : ramener la cible dans l\'écran, ou scinder le tour et déclarer ' +
        'le nouveau dans TOURS (un tour lancé sans être déclaré est un autre défaut, ' +
        'compté plus bas).',
    ).toEqual([]);
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

describe('Visite guidée — un tour affiché compte comme VU', () => {
  // ── Le défaut mesuré, le 2026-08-10 ───────────────────────────────────────
  //
  // Signalé par le fondateur : « le tuto s'ouvre encore alors que je l'ai fait
  // 18 fois », et sur les CINQ tours. Le marquage ne vivait que dans `end`
  // (« Passer ») et `next` (dernière étape) : toute autre fin de session
  // n'écrivait RIEN. Reproduit dans le navigateur — tour affiché, page
  // rechargée sans répondre, tour de retour à 1/3.
  //
  // Ce qui rendait le défaut inéluctable plutôt que rare : il n'existe AUCUNE
  // autre porte de sortie. Les quatre panneaux sombres avalent le tap, y
  // compris sur la barre d'onglets — mesuré. Donc sur iPhone, où le système
  // termine l'app régulièrement, les cinq tours se relançaient à chaque
  // ouverture.
  //
  // ⚠️ Et c'est pour ça que le marquage est à l'OUVERTURE et nulle part
  // ailleurs : tout ce qui dépend d'une sortie propre (démontage, perte de
  // focus, `onRequestClose`) n'est pas déclenché quand iOS tue le processus.
  const SRC = readFileSync(join(RACINE, 'components', 'GuidedTour.tsx'), 'utf8');

  /** Le corps de `startTour`, du `const startTour` jusqu'à la déclaration suivante.
   *  ⚠️ La borne de fin était `'\n  }, []);'` — la LISTE DE DÉPENDANCES du
   *  `useCallback`, c'est-à-dire un détail que n'importe quel correctif conforme
   *  déplace. Elle a cassé le 2026-08-15 en ajoutant une dépendance, et elle
   *  aurait cassé en SILENCE (la recherche serait tombée sur le `}, []);` du
   *  `useCallback` suivant, donc sur un extrait trop long mais contenant quand
   *  même `markSeen`). C'est la troisième fois que cette famille de tests fige la
   *  FORME du code au lieu de son invariant — on borne désormais sur « la
   *  déclaration d'après », qui existe quelles que soient les dépendances. */
  const corpsStartTour = (() => {
    const debut = SRC.indexOf('const startTour');
    expect(debut, 'startTour introuvable dans GuidedTour.tsx').toBeGreaterThan(-1);
    const suivant = SRC.indexOf('\n  const ', debut + 1);
    const fin = suivant > debut ? suivant : SRC.length;
    return SRC.slice(debut, fin);
  })();

  it('le tour est marqué vu à son OUVERTURE', () => {
    expect(
      /markSeen\(\s*tourId\s*\)/.test(corpsStartTour),
      'startTour n’appelle plus markSeen : un tour interrompu par une app tuée reviendra à chaque lancement',
    ).toBe(true);
  });

  it('le marquage n’a qu’UNE source', () => {
    // Un second `markSeen` ailleurs serait un endroit de plus à tenir d'accord,
    // pour un cas que celui de `startTour` couvre déjà. Et surtout il ferait
    // croire que la sortie compte, alors que c'est justement ce qui a manqué.
    // `(?<!function )` écarte la DÉCLARATION `async function markSeen(tourId)`,
    // qui n'est pas un appel — sans ça le compte vaut 2 pour un seul appel.
    const appels = [...SRC.matchAll(/(?<!function )markSeen\(/g)].length;
    expect(appels, 'markSeen doit être appelé exactement une fois, dans startTour').toBe(1);
  });

  it('la sonde sait dire NON', () => {
    // Un compteur qu'on n'a jamais vu rougir ne prouve rien (CLAUDE.md §8).
    // On rejoue ici la version FAUTIVE — le startTour d'avant le correctif,
    // qui posait l'état sans rien marquer.
    const avantCorrectif = `const startTour = useCallback((tourId, steps, opts) => {
      const avail = steps.filter((s) => refs.current.has(s.targetId));
      if (avail.length === 0) return;
      setActive({ tourId, steps: avail, index: 0 });`;
    expect(/markSeen\(\s*tourId\s*\)/.test(avantCorrectif)).toBe(false);
  });
});

describe('Visite guidée — l’anneau épouse la forme de sa cible', () => {
  // 🔴 LE DÉFAUT QUE CE BLOC FERME, mesuré le 2026-08-14 sur capture iPhone :
  // le champ existait (`rayon?: number`), il n'était renseigné par AUCUNE des 21
  // étapes, donc toutes retombaient sur le rayon de CARTE. L'anneau dessinait une
  // lozange autour d'un bouton et une carte autour d'un cœur.
  //
  // C'est le défaut « un réglage qui ne pilote rien » : rien ne cassait, rien ne
  // rougissait, et la seule façon de s'en apercevoir était de regarder l'écran.
  // Le champ est devenu OBLIGATOIRE — un défaut optionnel se re-oublie.
  const FORMES = ['carte', 'bouton', 'pastille'];

  it('chaque étape DÉCLARE sa forme — un défaut implicite se re-oublie', () => {
    for (const { id, steps } of TOUS_LES_TOURS) {
      for (const e of steps) {
        expect(e.forme, `${id} / ${e.targetId} : forme absente`).toBeDefined();
        expect(FORMES, `${id} / ${e.targetId} : forme inconnue`).toContain(e.forme);
      }
    }
  });

  it('chaque forme déclarée SERT au moins une fois — sinon c’est un token sans rôle', () => {
    const servies = new Set(TOUS_LES_TOURS.flatMap(({ steps }) => steps.map((e) => e.forme)));
    for (const f of FORMES) expect(servies, `forme « ${f} » jamais employée`).toContain(f);
  });

  it('le moteur traduit les trois formes — aucune ne retombe sur un angle droit', () => {
    // `GuidedTour.tsx` tire react-native : il se lit COMME DU TEXTE, même procédé
    // que `accentColor.test.ts` et `designSystem.test.ts`.
    const moteur = readFileSync(join(RACINE, 'components', 'GuidedTour.tsx'), 'utf8');
    const table = moteur.match(/RAYON_CIBLE: Record<FormeCible, number> = \{([^}]*)\}/);
    expect(table, 'la table de rayons du moteur est introuvable').not.toBeNull();
    for (const f of FORMES) expect(table![1]).toContain(`${f}:`);
  });

  it('le TROU et l’ANNEAU partagent leur rayon — deux valeurs divergeraient', () => {
    // Le trou était fait de QUATRE panneaux rectangulaires : il ne pouvait donc
    // pas être arrondi, et ses coins restaient éclairés hors de l'anneau. Un seul
    // panneau bordé les remplace, et les deux formes lisent la MÊME valeur.
    //
    // ⚠️ CE TEST A ÉTÉ REBASÉ LE 2026-08-15, POUR LA RAISON HABITUELLE — la
    // QUATRIÈME fois dans cette famille. Il exigeait littéralement
    // `const rayonAnneau =` et trois occurrences de ce nom : rendre l'anneau
    // ANIMÉ (le rayon voyage désormais avec la position) est un correctif
    // parfaitement conforme, et il l'a fait rougir. Un test qui nomme une
    // VARIABLE fige la forme du code ; l'invariant, lui, est qu'il n'existe
    // qu'UNE source de rayon et que les deux formes la lisent.
    // ➡️ Et il a servi : en rebasant, on a trouvé que l'ancien calcul survivait
    // en double, devenu inerte. Une copie inerte est ce qui redevient fausse.
    const moteur = readFileSync(join(RACINE, 'components', 'GuidedTour.tsx'), 'utf8');
    const code = sansCommentaires(moteur);

    // 1. UNE seule source : la table de formes n'est consultée qu'une fois.
    const sources = [...code.matchAll(/RAYON_CIBLE\[/g)].length;
    expect(sources, 'le rayon se calcule à plus d’un endroit — les deux copies divergeront').toBe(1);

    // 2. Les DEUX géométries lisent une valeur issue de cette source. On ne
    //    nomme pas la variable : on exige que le même symbole serve aux deux.
    const rayons = [...code.matchAll(/borderRadius:\s*([^,\n]+)/g)]
      .map((m) => m[1].trim())
      .filter((v) => !/^Radius\./.test(v));   // les rayons de la bulle, hors sujet
    expect(rayons.length, 'le trou et l’anneau doivent porter un rayon chacun').toBe(2);
    const symbole = (v: string) => v.match(/\b(\w+(?:\.\w+)*)\b(?![\w.]*\()/g)?.slice(-1)[0];
    const [trou, anneau] = rayons;
    expect(
      trou.includes(symbole(anneau) ?? ' '),
      `le trou (${trou}) et l’anneau (${anneau}) ne partagent aucune valeur`,
    ).toBe(true);

    // 3. Et plus aucun panneau rectangulaire : c'était la géométrie fautive.
    expect(code).not.toMatch(/style=\{\[s\.dim,/);
  });
});

describe('Visite guidée — l’anneau ne désigne jamais l’objet d’une autre bulle', () => {
  // ── Les trois défauts que ce bloc ferme, mesurés le 2026-08-15 ─────────────
  //
  // Signalés par le fondateur sur DEUX captures de l'onglet Plan, et c'est la
  // capture qui les a montrés — aucun ne se voit en relisant le moteur.
  //
  //  1. bulle « Marque-le comme cuisiné » (5/6), anneau autour de « Ma
  //     répartition (%) » : le texte d'une étape désignant l'objet d'une autre.
  //     Cause — `useTourTarget` enregistre son id depuis le CORPS du composant,
  //     donc `plan-cook` était « disponible » alors que le bouton « J'ai
  //     cuisiné » n'était pas rendu (repas déjà mangé). La mesure échouait, et
  //     `rect` n'étant jamais remis à zéro, l'anneau de l'étape d'avant restait.
  //  2. bulle « Mangé hors plan ? » (3/6), anneau à la bonne taille 72 pt trop
  //     bas : la mesure tombait EN PLEIN VOL d'un `scrollTo` animé, parce qu'un
  //     délai de 260 ms était supposé suffire.
  //  3. et le pire, qui n'était pas sur les captures : une cible introuvable
  //     donnait un écran assombri SANS bulle et SANS « Passer ». Le panneau
  //     avale les taps, barre d'onglets comprise : plus aucune sortie, il faut
  //     tuer l'app. Comme `startTour` marque le tour vu à l'ouverture, ça
  //     n'arrive qu'UNE fois — donc c'est irreproductible par construction.
  //
  // ⚠️ CE SONT DES LECTURES DE SOURCE, et il faut le dire : `GuidedTour.tsx`
  // tire react-native, donc il ne se rend pas sous vitest. Les DÉCISIONS, elles,
  // vivent dans `lib/visee.ts` et sont testées pour de vrai (`visee.test.ts`) —
  // même découpage que `tours.ts` pour le contenu. Ce qui reste ici, c'est le
  // câblage : que le moteur appelle bien ces décisions, et qu'il garde sa porte.
  const SRC = readFileSync(join(RACINE, 'components', 'GuidedTour.tsx'), 'utf8');

  const CODE = sansCommentaires(SRC);

  it('une cible « enregistrée » ne suffit pas — c’est `.current` qui décide', () => {
    // `refs.current.has(id)` rend `true` dès que le composant vit, que l'élément
    // visé soit rendu ou non. C'était la porte d'entrée du défaut 1.
    expect(
      CODE,
      'la disponibilité d’une cible se juge sur sa ref MONTÉE, pas sur la présence de sa clé',
    ).not.toContain('refs.current.has(');
    expect(CODE).toMatch(/refs\.current\.get\([^)]*\)\?\.current/);
  });

  it('aucun délai deviné ne décide qu’un défilement est fini', () => {
    // Le moteur attendait 260 ms puis mesurait, quoi qu'il arrive. On exige les
    // deux décisions pures : ne défiler que si besoin, ne croire une mesure
    // qu'une fois stable.
    expect(CODE, 'le moteur ne consulte plus `memeCadre` — la mesure peut retomber en plein vol').toContain('memeCadre(');
    expect(CODE, 'le moteur ne consulte plus `dejaVisible` — il défile même pour une cible sous les yeux').toContain('dejaVisible(');
  });

  it('renoncer RETIRE l’anneau — il ne laisse pas celui d’avant', () => {
    expect(CODE).toMatch(/setRect\(null\)[\s\S]{0,60}setSansCible\(true\)/);
  });

  it('🔴 sans cible, la bulle s’affiche quand même — un tuto se quitte TOUJOURS', () => {
    // L'invariant vital de ce fichier : il ne doit exister aucun état où
    // l'utilisateur voit le voile sombre sans le bouton « Passer ».
    expect(CODE, 'Spotlight doit accepter une mesure absente').toMatch(/rect: Rect \| null/);
    expect(
      CODE,
      'le rendu ne consulte plus `sansCible` : une cible introuvable redevient un écran sans sortie',
    ).toMatch(/rect \|\| sansCible/);
  });

  it('la sonde sait dire NON — on rejoue les deux versions fautives', () => {
    // Un compteur qu'on n'a jamais vu rougir ne prouve rien (CLAUDE.md §8).
    const avant = `
      const avail = steps.filter((s) => refs.current.has(s.targetId));
      scrollIntoView(node, () => { if (!cancelled) measure(); });
      {step && (rect ? <Spotlight rect={rect} /> : <View style={dim} />)}`;
    expect(avant).toContain('refs.current.has(');
    expect(avant).not.toContain('memeCadre(');
    expect(/rect \|\| sansCible/.test(avant)).toBe(false);
  });

  it('les cibles d’une CARTE de repas suivent l’état du repas, pas son rang', () => {
    // Défaut 1, côté écran : `plan-cook` était accroché au repas d'indice 0.
    // `MealCard` ne rend ses boutons que sur un repas encore à faire — donc la
    // cible disparaissait dès le petit-déjeuner coché, même quand le dîner juste
    // en dessous les affichait toujours.
    const plan = sansCommentaires(readFileSync(join(RACINE, 'app', '(tabs)', 'plan.tsx'), 'utf8'));
    for (const prop of ['cookTourId', 'actionsTourId']) {
      expect(plan, `${prop} est accroché à un RANG fixe`).not.toMatch(
        new RegExp(`${prop}=\\{\\s*i\\s*===\\s*\\d`),
      );
    }
    expect(plan, 'le repas ciblé doit se DÉDUIRE de l’état des repas').toContain('premierCuisinable');
  });
});

// ── Le DÉCOMPTE des bulles, verrouillé contre la spec ───────────────────────
//
// 🔴 POURQUOI CE BLOC EXISTE. Le nombre de bulles était écrit à QUATRE endroits —
// CLAUDE.md §8, la fiche de référence d'AGENTS.md, un commentaire de
// `GuidedTour.tsx` et un autre de `tours.ts`. Aucun n'était calculé, tous se
// citaient l'un l'autre, et le commentaire du moteur annonçait « 22 bulles »
// quand il y en avait 21. Le 2026-08-14, en retirant la 3ᵉ du Frigo (décision
// fondateur), il aurait fallu penser aux quatre.
//
// ⚠️ C'est exactement « un inventaire recopié trois fois se confirme tout seul »
// (CLAUDE.md §8, le compteur d'émojis). La réponse est la même : UN endroit qui
// fait foi, et un test qui le compare au code. Les commentaires ne citent plus
// de nombre — ils renvoient ici.
//
// ⚠️ CE QUE CE TEST NE FAIT PAS : figer un total. Il ne dit pas « il doit y avoir
// 20 bulles » — retirer ou ajouter une bulle est une décision de produit, pas une
// régression. Il exige que la SPEC dise ce que le CODE fait. Ajouter une bulle
// sans toucher CLAUDE.md rougit ; ajouter les deux passe.

describe('Le décompte des bulles ne se recopie pas — il se mesure', () => {
  const SPEC = readFileSync(join(RACINE, 'CLAUDE.md'), 'utf8');
  const LIGNE = SPEC.match(
    /(\d+) bulles au total \(plan (\d+) · profil (\d+) · recettes (\d+) · courses (\d+) · réserve (\d+)\)/,
  );

  it('la sonde trouve bien la phrase de CLAUDE.md — sinon elle passerait à vide', () => {
    // Sans ce cas, reformuler la phrase rendrait le test vert en ne mesurant plus
    // rien : le défaut d'`espacementDA` après la migration vers `Presse`.
    expect(LIGNE, 'la phrase de décompte de CLAUDE.md §8 est introuvable ou reformulée').not.toBeNull();
  });

  it('🔴 la spec annonce EXACTEMENT ce que le code sert', () => {
    const [, total, plan, profil, recettes, courses, reserve] = LIGNE!.map(Number);
    // Contexte COMPLET : c'est le décompte maximal, celui que la spec décrit.
    const reel = {
      plan: tourSteps('plan', CTX_COMPLET).length,
      profil: tourSteps('profil', CTX_COMPLET).length,
      recettes: tourSteps('recettes', CTX_COMPLET).length,
      courses: tourSteps('courses', CTX_COMPLET).length,
      reserve: tourSteps('reserve', CTX_COMPLET).length,
    };
    expect({ ...reel, total: Object.values(reel).reduce((a, b) => a + b, 0) })
      .toEqual({ plan, profil, recettes, courses, reserve, total });
  });

  it('aucun commentaire ne recite un nombre de bulles — il périmerait en silence', () => {
    // `GuidedTour.tsx` en a porté un faux pendant des semaines. Un nombre dans un
    // commentaire n'a aucun lecteur qui le vérifie.
    for (const f of ['components/GuidedTour.tsx', 'lib/tours.ts']) {
      const src = readFileSync(join(RACINE, f), 'utf8');
      const lignes = src.split('\n').filter((l) => /^\s*(\/\/|\*|\/\*)/.test(l));
      for (const l of lignes) {
        expect(l, `${f} : un décompte de bulles recopié en commentaire`)
          .not.toMatch(/\b\d+\s+bulles\s+(au total|servies|sur)/i);
      }
    }
  });
});
