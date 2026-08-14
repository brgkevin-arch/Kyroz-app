import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// LE DÉFAUT MESURÉ, le 2026-08-14 (signalé par le fondateur : « le bouton
// modifier les recettes ne fonctionne pas »). La fiche recette et son éditeur
// vivaient dans DEUX `<Sheet>`, donc deux `<Modal>`. Taper le crayon ouvrait la
// seconde pendant que la première était encore présentée, et sur iOS ça ne
// donne RIEN — pas d'erreur, pas de trace, l'écran ne bouge simplement pas.
//
// 🔴 CE QUI REND CE DÉFAUT PARTICULIÈREMENT MÉCHANT : il est INVISIBLE sur le
// web. Mesuré dans le panneau navigateur AVANT correctif — l'éditeur s'ouvrait
// parfaitement, parce que `react-native-web` rend une `Modal` en `<div>` et que
// la seconde, montée plus tard, passe devant (le mécanisme est déjà consigné en
// CLAUDE.md §11, dans l'autre sens, pour les dialogues). C'est ce contraste qui
// a désigné la cause : composant sain, empilement fautif.
//
// ⚠️ CE QUE CE TEST NE SAIT PAS FAIRE : dire qu'une feuille s'ouvre bien. Aucun
// test sous vitest ne le peut, et le web ment sur ce point précis. Ce qu'il
// ferme, c'est le chemin par lequel la panne est arrivée — remettre l'éditeur,
// ou l'élicitation, dans une feuille À EUX, ouverte depuis la fiche.

const RACINE = join(__dirname, '..', '..');
const lire = (...p: string[]) => readFileSync(join(RACINE, ...p), 'utf8');

/** Les `visible={…}` de chaque `<Sheet>` d'un fichier, dans l'ordre. */
function conditionsDeFeuille(src: string): string[] {
  return [...src.matchAll(/<Sheet[\s\S]{0,200}?visible=\{([^}]*)\}/g)].map((m) => m[1].trim());
}

describe('Aucune feuille ne s’ouvre par-dessus une feuille ouverte', () => {
  const ECRANS = [
    { nom: 'app/(tabs)/plan.tsx', src: lire('app', '(tabs)', 'plan.tsx') },
    { nom: 'app/(tabs)/recettes.tsx', src: lire('app', '(tabs)', 'recettes.tsx') },
  ];

  it('l’éditeur de recette n’a PAS de feuille à lui — il remplace la fiche', () => {
    for (const { nom, src } of ECRANS) {
      for (const cond of conditionsDeFeuille(src)) {
        expect(cond, `${nom} : une feuille s'ouvre sur l'éditeur`).not.toMatch(/editing/i);
      }
    }
  });

  it('« C’est quoi qui te gêne ? » n’ouvre pas une seconde feuille non plus', () => {
    // Elle est déclenchée depuis la fiche (`dislikeSelectedMeal`), donc elle
    // tombait dans le même piège — sur un chemin rare, jamais signalé.
    const src = lire('app', '(tabs)', 'plan.tsx');
    const seules = conditionsDeFeuille(src).filter((c) => /dislikeElicit/.test(c) && !/selectedMeal/.test(c));
    expect(seules, 'l\'élicitation a retrouvé une feuille à elle').toEqual([]);
  });

  it('la fiche, son éditeur et l’élicitation partagent UNE feuille', () => {
    const src = lire('app', '(tabs)', 'plan.tsx');
    const bloc = src.slice(src.indexOf('<Sheet\n'), src.indexOf('<RecipeDetail'));
    expect(bloc).toContain('RecipeEditor');
    expect(bloc).toContain('DislikeSheet');
  });

  it('sait dire OUI : les feuilles ouvertes DEPUIS L’ÉCRAN restent séparées', () => {
    // Le test ne doit pas condamner tout empilement de déclarations : l'écart
    // hors plan, la pesée et le check-in s'ouvrent depuis l'écran, pas depuis une
    // feuille, donc ils gardent chacun la leur. S'ils disparaissaient, la sonde
    // ci-dessus deviendrait vraie pour une mauvaise raison.
    const conds = conditionsDeFeuille(lire('app', '(tabs)', 'plan.tsx'));
    expect(conds.length).toBeGreaterThanOrEqual(4);
    expect(conds.some((c) => /offPlanOpen/.test(c))).toBe(true);
    expect(conds.some((c) => /weighIn/.test(c))).toBe(true);
  });
});

// ── Le même défaut, vu depuis les BOÎTES DE DIALOGUE ────────────────────────
//
// `useDialog()` monte sa propre `Modal`. Appelé depuis un composant qui vit DÉJÀ
// dans une feuille, c'est encore une modale par-dessus une modale : sur iOS le
// bouton s'exécute et l'écran ne bouge pas. Signalé le 2026-08-14 sur
// « Retirer de l'historique ».
//
// 🔴 CETTE LISTE NE PEUT QUE RÉTRÉCIR. Ce n'est pas une liste d'exceptions
// tolérées — c'est un CHANTIER, mesuré le 2026-08-14, écrit ici pour qu'il ne se
// perde pas dans une note. Chacun de ces trois appels est mort sur iPhone
// aujourd'hui. Les corriger demande une vérification AU SIMULATEUR (le web ne
// montre pas ce défaut, il empile sans se plaindre), donc ils attendent un build.
// ➡️ Ne JAMAIS ajouter un nom ici pour faire passer le test.
const CHANTIER_DIALOGUES_EN_FEUILLE = [
  'OffPlanHistory',   // « Retirer cette ligne ? » — journal des écarts
  'ReglagesSheet',    // 2 `notify` : pas d'app e-mail, rappel refusé
  'WeightCheckin',    // « Supprimer cette pesée ? »
];

/**
 * ⚠️ LES COMMENTAIRES SONT ÉCARTÉS AVANT TOUTE RECHERCHE. Première version sans
 * ce filtre : elle accusait `ShoppingHistory.tsx` — dont la note explique
 * justement POURQUOI il n'appelle plus `useDialog()`. La leçon est déjà écrite
 * dans le compteur d'émojis (CLAUDE.md §8) ; elle se rejoue à chaque sonde qui
 * lit du code comme du texte.
 */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

function fichiersSource(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '__tests__') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiersSource(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

describe('Aucune boîte de dialogue ne s’ouvre depuis une feuille', () => {
  const RACINE_APP = join(__dirname, '..', '..');
  const FICHIERS = ['app', 'components']
    .flatMap((d) => fichiersSource(join(RACINE_APP, d)))
    .map((f) => {
      const src = readFileSync(f, 'utf8');
      return { nom: f.slice(RACINE_APP.length + 1), src, code: sansCommentaires(src) };
    });

  /** Les composants rendus À L'INTÉRIEUR d'un `<Sheet>` ou d'un `<ActionSheet>`. */
  const dansUneFeuille = new Set<string>();
  for (const { code } of FICHIERS) {
    for (const bloc of code.matchAll(/<(Sheet|ActionSheet)\b[\s\S]*?<\/\1>/g)) {
      for (const c of bloc[0].matchAll(/<([A-Z][A-Za-z]+)/g)) dansUneFeuille.add(c[1]);
    }
  }

  /** Les composants qui APPELLENT une boîte de dialogue. */
  const appelants = FICHIERS
    .filter(({ code }) => /\buseDialog\(/.test(code))
    .map(({ nom }) => nom.split('/').pop()!.replace(/\.tsx?$/, ''));

  it('la sonde voit bien les deux ensembles — sinon elle passerait à vide', () => {
    expect(dansUneFeuille.size).toBeGreaterThan(10);
    expect(appelants.length).toBeGreaterThan(3);
  });

  it('aucun NOUVEAU composant de feuille n’ouvre de dialogue', () => {
    const fautifs = appelants
      .filter((c) => dansUneFeuille.has(c))
      .filter((c) => !CHANTIER_DIALOGUES_EN_FEUILLE.includes(c));
    expect(fautifs, 'ces composants vivent dans une feuille ET ouvrent une modale').toEqual([]);
  });

  it('le chantier ne GRANDIT pas — et « Mes courses passées » en est sorti', () => {
    expect(CHANTIER_DIALOGUES_EN_FEUILLE.length).toBeLessThanOrEqual(3);
    expect(CHANTIER_DIALOGUES_EN_FEUILLE).not.toContain('ShoppingHistory');
    // Corrigé le 2026-08-14 : la question se pose désormais DANS la feuille.
    const histo = FICHIERS.find((f) => f.nom.endsWith('ShoppingHistory.tsx'))!;
    expect(histo.code).not.toMatch(/\buseDialog\(/);
    expect(histo.code).toContain('aConfirmer');
  });
});
