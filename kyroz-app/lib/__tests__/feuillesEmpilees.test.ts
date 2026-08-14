import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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
