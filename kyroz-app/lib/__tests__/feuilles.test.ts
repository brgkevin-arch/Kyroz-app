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
const lireOnglet = (f: string) => readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', f), 'utf8');

// ⚠️ Même précaution que `materiauxDA.test.ts`, et elle a servi dès l'écriture : le
// commentaire de `courses.tsx` cite `<Ecran corps={…} />` pour dire de ne PAS l'écrire,
// donc un compteur naïf accuse la note qui met en garde. On mesure le code, pas ce qui
// en parle.
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

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
      // ⚠️ L'expression ne fige NI la ligne, NI sa forme — et elle a dû être
      // relâchée DEUX fois pour la même raison. D'abord le 2026-08-14 quand
      // `onClosed()` est entré dans la garde ; puis le même jour, quand le
      // démontage est devenu une fonction (`demonter`) appelée par le rappel
      // d'animation ET par un filet de sécurité. Les deux ajouts respectaient
      // pourtant exactement ce que ce test protège.
      // ➡️ Un garde-fou qui interdit d'ajouter quoi que ce soit à côté de ce
      // qu'il surveille finit par se faire contourner plutôt que corriger. On
      // tient l'INVARIANT et rien d'autre : le démontage relit `visibleRef`
      // (la valeur du MOMENT), jamais `visible` (celle capturée à la création).
      const bloc = src.slice(src.indexOf('const demonter'), src.indexOf('const demonter') + 300);
      expect(bloc, `${f} : \`demonter\` est introuvable`).toContain('setRender(false)');
      expect(bloc, `${f} : le démontage ne relit pas l'état d'ouverture`)
        .toContain('visibleRef.current');
      // Et il est IDEMPOTENT : deux sources l'appellent désormais (le rappel
      // d'animation et le filet). Sans verrou, `onClosed` partirait deux fois —
      // donc « Supprimer mon compte » ouvrirait sa confirmation en double.
      expect(bloc, `${f} : le démontage n'est plus idempotent`).toMatch(/if\s*\(\s*fait\b/);
    }
  });

  it('E45 — le démontage a un FILET, il ne dépend pas que du rappel d’animation', () => {
    // 🔴 E18 avait retiré la condition `finished` — « un état qui doit converger ne
    // se confie pas à un événement qui peut ne pas arriver ». Mais le rappel de
    // `Animated.parallel` EST encore un événement. S'il n'arrive jamais, la `Modal`
    // reste présentée, transparente, plein écran : elle avale TOUS les taps (barre
    // d'onglets comprise), et son fond appelle un `onClose` qui remet à `false` un
    // état déjà `false` — React ne re-rend pas. **L'app est figée jusqu'à ce qu'on
    // la tue.** Deux signalements du fondateur le 2026-08-14, tous deux en FERMANT
    // une feuille, aucun rejouable (cf. AGENTS.md E45).
    //
    // ⚠️ Ce filet n'est PAS un correctif : la cause reste inconnue. Il transforme un
    // gel définitif en accroc d'une seconde et demie. Le compter ici parce qu'un
    // garde-fou que rien n'exige se fait « simplifier » à la première relecture —
    // et celui-ci a l'air inutile, puisqu'il ne sert dans AUCUN chemin sain.
    for (const f of FEUILLES) {
      const src = lire(f);
      expect(src, `${f} : le filet de démontage a disparu`)
        .toMatch(/setTimeout\(demonter,\s*FILET_DEMONTAGE_MS\)/);
      // Et il se nettoie : un minuteur laissé courir rouvrirait la question à
      // chaque cycle d'ouverture/fermeture.
      expect(src, `${f} : le filet n'est pas nettoyé`).toMatch(/clearTimeout\(filet\)/);
    }
  });

  it('E45 — la feuille des Courses garde son INSTANCE entre les deux états de l’écran', () => {
    // 🔴 LA CAUSE, trouvée le 2026-08-23 — et le filet ci-dessus n'en était pas une.
    // `courses.tsx` a DEUX rendus (liste pleine / « Rien à acheter »), et il posait
    // sa feuille d'historique à des positions différentes sous le même parent :
    // dernier des DEUX enfants dans l'état vide, dernier des TROIS dans la liste
    // (`SectionList` + `CompactTitleBar` la précèdent). React réconcilie des enfants
    // sans `key` PAR INDEX : à chaque bascule, la `Sheet` de l'index 2 était
    // DÉTRUITE et une neuve montée à l'index 1 — donc sa `Modal`, celle d'UIKit,
    // détruite et recréée. Or la bascule arrive exactement quand « Courses
    // terminées » vide la liste, c'est-à-dire dans les millisecondes où la modale
    // de choix (« X articles ne sont pas cochés ») est encore en train de se
    // fermer : deux transitions modales dans la même frame, ce qu'iOS ne garantit
    // pas. Écran d'apparence normale, aucun tap qui répond, barre d'onglets
    // comprise — le symptôme exact des deux signalements.
    //
    // ⚠️ Balayage des 15 fichiers qui montent une feuille : `courses.tsx` était le
    // SEUL dans ce cas. `plan.tsx` a bien un retour anticipé (`loading`), mais ses
    // feuilles ne vivent que dans l'autre branche et `setLoading(false)` n'est
    // appelé qu'une fois, avant qu'aucune feuille ne puisse être ouverte.
    //
    // ⚠️ Le commentaire du fichier affirmait déjà l'invariant — « une seule
    // définition, montée par les DEUX rendus ». Une seule DÉFINITION ne fait pas
    // une seule INSTANCE, et rien ne comptait la différence. D'où ce cas.
    const src = sansCommentaires(lireOnglet('courses.tsx'));
    // Et la sonde sait dire OUI autant que NON — sinon elle serait verte par
    // aveuglement : `sansCommentaires` ne doit pas manger le code qu'elle traverse.
    expect(sansCommentaires('// on cite <Ecran corps={x} /> ici')).not.toContain('<Ecran');
    expect(sansCommentaires('const ecran = (c) => <SafeAreaView>{c}</SafeAreaView>')).toContain('<SafeAreaView');
    // UNE enveloppe, donc une seule position possible pour la feuille. C'est
    // l'invariant structurel : le reste en découle sans qu'on ait à le vérifier.
    const enveloppes = src.match(/<SafeAreaView/g) ?? [];
    expect(enveloppes.length, `courses.tsx : ${enveloppes.length} \`SafeAreaView\` — les deux rendus ne partagent plus leur enveloppe`)
      .toBe(1);
    // Et la feuille n'est rendue qu'à un seul endroit : dedans.
    const rendus = src.match(/\{feuilleHistorique\}/g) ?? [];
    expect(rendus.length, `courses.tsx : la feuille est rendue ${rendus.length} fois`).toBe(1);
    // 🔴 L'enveloppe est une FONCTION APPELÉE, jamais un composant. Un composant
    // défini dans le corps du rendu change d'identité à chaque rendu : React
    // remonterait tout l'écran à chaque frappe — le défaut qu'on vient de retirer,
    // réintroduit par la porte d'à côté et en pire.
    expect(src, 'courses.tsx : l’enveloppe `ecran` a disparu').toMatch(/const ecran = \(/);
    expect(src, 'courses.tsx : l’enveloppe est devenue un composant JSX').not.toMatch(/<Ecran\b/);
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
