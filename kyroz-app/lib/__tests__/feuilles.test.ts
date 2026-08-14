import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Les deux feuilles modales (Sheet, ActionSheet) ──────────────────────────
//
// Ce fichier existe parce que les DEUX défauts qu'il verrouille ont vécu longtemps
// sans qu'aucun test ne puisse les voir — ils ne se manifestent qu'à l'exécution, en
// natif, et pour l'un des deux seulement dans une course entre deux gestes.
//
// ⚠️ CE QUE CES CAS NE FONT PAS : prouver que le geste marche. Ça, seul le simulateur
// le dit (CLAUDE.md §5). Ils ferment les deux CHEMINS par lesquels la panne est
// réellement arrivée, et qui se relisent dans le source sans rien exécuter.

const FEUILLES = ['Sheet.tsx', 'ActionSheet.tsx'];
const lire = (f: string) => readFileSync(join(__dirname, '..', '..', 'components', f), 'utf8');

describe('feuilles modales — les deux pannes qui ne se voyaient pas', () => {
  it('E12 — le glissement n’est jamais tué par un `false` constant au contact', () => {
    // Mesuré au simulateur le 2026-08-05 : `onStartShouldSetPanResponder: () => false`
    // était là DEPUIS LE COMMIT INITIAL, avec l'intention louable de « laisser passer
    // les taps ». En natif, une vue qui ne réclame pas le responder AU CONTACT ne se
    // voit plus proposer les phases « mouvement » — ni en bulle, ni en capture. Le
    // geste n'existait donc pas, et `react-native-web` l'a masqué tout ce temps en
    // faisant passer le glissement par des événements SOURIS.
    for (const f of FEUILLES) {
      const src = lire(f);
      const m = src.match(/onStartShouldSetPanResponder:\s*\(\)\s*=>\s*([^,\n]+)/);
      expect(m, `${f} : handler introuvable`).toBeTruthy();
      expect(m![1].trim(), `${f} : ${m![1]}`).not.toBe('false');
    }
  });

  it('E18 — le démontage de la feuille ne dépend PAS d’une animation qui va au bout', () => {
    // 🔴 Signalé par le fondateur le 2026-08-06 : une feuille du frigo devenue
    // impossible à fermer, ni au glissement ni au fond. Vu une seule fois — c'est une
    // course. Le mécanisme : `render` garde la feuille montée pendant la sortie, et sa
    // remise à zéro était conditionnée à `finished`. Un second geste pendant la sortie
    // touche `ty` (le pan fait `setValue`, puis son ressort de retour), l'animation est
    // INTERROMPUE, `finished` vaut `false` — et `render` reste `true` pour toujours,
    // car l'effet ne dépend que de `visible`, déjà `false`. Le ressort ramène la
    // feuille à 0, donc pleinement visible, et `onClose` ne peut plus rien : il remet
    // à `null` un état déjà `null`, React ne re-rend pas.
    //
    // ➡️ Un état qui doit CONVERGER ne se confie pas à un événement qui peut ne pas
    // arriver. On démonte dès que l'animation s'arrête, sauf réouverture entre-temps.
    for (const f of FEUILLES) {
      const src = lire(f);
      expect(src, `${f} : le démontage est de nouveau conditionné à \`finished\``)
        .not.toMatch(/if\s*\(\s*finished\s*\)\s*setRender\(false\)/);
      // Et le démontage doit rester CONDITIONNEL à la fermeture : le retirer tout à
      // fait démonterait une feuille rouverte pendant sa propre sortie.
      //
      // ⚠️ L'expression ne fige plus la LIGNE ENTIÈRE (2026-08-14). Elle exigeait
      // `if (!visibleRef.current) setRender(false)` au caractère près, donc elle a
      // rougi le jour où `Sheet` a ajouté `onClosed()` DANS la même garde — un
      // ajout qui respecte pourtant exactement ce que ce test protège. Un garde-fou
      // qui interdit d'ajouter quoi que ce soit à côté de ce qu'il surveille finit
      // par se faire contourner plutôt que corriger. On tient l'INVARIANT — la
      // garde lit `visibleRef`, pas `visible` — et rien de plus.
      expect(src, `${f} : le démontage ne relit pas l'état d'ouverture`)
        .toMatch(/if\s*\(\s*!visibleRef\.current\s*\)\s*\{?\s*setRender\(false\)/);
    }
  });

  // 🔴 Le troisième chemin, fermé le 2026-08-09 en préparant la refonte du Profil.
  //
  // Une `Modal` de react-native-web crée son conteneur DOM à son MONTAGE, pas quand
  // elle devient visible ; à `z-index` égal, l'ORDRE DU DOM tranche. Tant que
  // l'`ActionSheet` rendait sa `Modal` en permanence (`visible={render}`), deux
  // feuilles d'un même écran s'empilaient **dans l'ordre de leur déclaration JSX** —
  // un ordre que rien n'exprime. Les cinq écrans concernés étaient corrects par
  // ACCIDENT : `garde-manger.tsx` déclare sa confirmation après son éditeur, donc
  // elle passe dessus ; l'inverse l'aurait rendue invisible, en silence.
  //
  // ⚠️ C'est le défaut déjà payé sur `DialogProvider` (cf. `noAlert.test.ts`), mais
  // corrigé là-bas chez l'APPELANT. Le porter dans le composant règle les sept
  // appels d'un coup — dont ceux qui n'existent pas encore, et c'est le point : la
  // feuille « Réglages » à venir ouvrira une confirmation de suppression de compte
  // depuis l'intérieur d'une autre feuille.
  //
  // ⚠️ Invisible sous vitest (pas de DOM) et à la relecture. Ce test ne mesure pas
  // le symptôme — il empêche qu'on retire le correctif en croyant simplifier.
  it('E11-bis — l’ActionSheet ne monte RIEN tant qu’il n’a pas servi', () => {
    const src = lire('ActionSheet.tsx');
    // Le retour anticipé, et il doit porter sur `render` (pas sur `visible`) :
    // sinon la feuille se démonterait AVANT la fin de son animation de sortie.
    expect(src, 'le retour anticipé sur `render` a disparu')
      .toMatch(/if\s*\(\s*!render\s*\)\s*return null/);
    // Et la `Modal` ne se pilote plus par `visible={render}` : une fois montée, elle
    // est visible. Garder les deux laisserait croire que le montage est paresseux
    // alors qu'il ne le serait plus.
    expect(src, 'la Modal est de nouveau pilotée par `visible={render}`')
      .not.toMatch(/<Modal\s+visible=\{render\}/);
  });
});
