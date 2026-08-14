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
// tolérées — c'était un CHANTIER, mesuré le 2026-08-14, écrit ici pour qu'il ne
// se perde pas dans une note. Les quatre appels qu'elle portait étaient morts sur
// iPhone, et le web ne pouvait pas le montrer.
// ➡️ Ne JAMAIS ajouter un nom ici pour faire passer le test.
//
// ✅ **VIDE DEPUIS LE 2026-08-14** — plus aucun composant de feuille n'ouvre de
// boîte de dialogue. Dans l'ordre où ils sont tombés : ShoppingHistory,
// OffPlanHistory et WeightCheckin posent leur question DANS la feuille
// (`ConfirmationEnLigne`) ; « Supprimer mon compte » attend que la feuille
// Réglages soit DÉMONTÉE (`Sheet.onClosed`) ; et les deux derniers `notify` de
// `ReglagesSheet` — purement informatifs, donc gardés pour la fin — sont devenus
// des `MessageEnLigne` posés sous le réglage qui vient d'échouer.
// ⚠️ Un tableau vide rend ce test STRICT : le prochain `useDialog()` écrit dans un
// composant de feuille rougit le jour même. C'est le but, et c'est le seul état
// dans lequel cette liste ne se relit pas comme une permission.
const CHANTIER_DIALOGUES_EN_FEUILLE: string[] = [];

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

const RACINE_APP = join(__dirname, '..', '..');
/** Tout `app/` + `components/`, source brute ET source privée de commentaires. */
const FICHIERS = ['app', 'components']
  .flatMap((d) => fichiersSource(join(RACINE_APP, d)))
  .map((f) => {
    const src = readFileSync(f, 'utf8');
    return { nom: f.slice(RACINE_APP.length + 1), src, code: sansCommentaires(src) };
  });

describe('Aucune boîte de dialogue ne s’ouvre depuis une feuille', () => {
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

  it('le chantier est CLOS — les quatre en sont sortis', () => {
    expect(CHANTIER_DIALOGUES_EN_FEUILLE).toEqual([]);
    // Corrigé le 2026-08-14 : la question se pose désormais DANS la feuille.
    const histo = FICHIERS.find((f) => f.nom.endsWith('ShoppingHistory.tsx'))!;
    expect(histo.code).not.toMatch(/\buseDialog\(/);
    expect(histo.code).toContain('aConfirmer');
    // Et le dernier tombé : deux `notify` purement informatifs, devenus des
    // messages posés sous le réglage qui vient d'échouer.
    const reglages = FICHIERS.find((f) => f.nom.endsWith('ReglagesSheet.tsx'))!;
    expect(reglages.code).not.toMatch(/\buseDialog\(/);
    expect(reglages.code).toContain('MessageEnLigne');
  });

  it('le message en ligne se FERME — sinon il devient un morceau d’écran', () => {
    // Un `notify` a son bouton « OK ». Posé en ligne, un message sans sortie
    // resterait pour toujours, et le réglage d'à côté se lirait comme s'il était
    // en défaut. La fermeture n'est donc pas une option du composant.
    const src = readFileSync(join(RACINE_APP, 'components', 'MessageEnLigne.tsx'), 'utf8');
    expect(src, 'onFermer est devenu optionnel').toMatch(/onFermer:\s*\(\)\s*=>\s*void;/);
    expect(sansCommentaires(src)).toContain('onPress={onFermer}');
    // Et chaque appelant en fournit une : un `<MessageEnLigne` sans `onFermer`
    // ne compile pas, mais un `onFermer={() => {}}` compilerait très bien.
    for (const { nom, code } of FICHIERS) {
      for (const m of code.matchAll(/<MessageEnLigne[\s\S]{0,400}?\/>/g)) {
        expect(m[0], `${nom} : fermeture inerte`).not.toMatch(/onFermer=\{\(\)\s*=>\s*\{\s*\}\}/);
        expect(m[0], `${nom} : pas de fermeture`).toMatch(/onFermer=\{/);
      }
    }
  });
});

describe('Enchaîner une feuille et une modale passe par onClosed', () => {
  const RACINE2 = join(__dirname, '..', '..');
  // ⚠️ COMMENTAIRES ÉCARTÉS, et ce n'est pas de la précaution : la note qui
  // explique le correctif de « Me peser » CITE la ligne fautive mot pour mot, donc
  // la première version de ce cas s'est accusée elle-même. Troisième fois que
  // cette sonde-là se fait piéger par sa propre documentation (compteur d'émojis,
  // puis `ShoppingHistory`) — la règle est : on lit du CODE, jamais de la prose.
  const l = (...p: string[]) => sansCommentaires(readFileSync(join(RACINE2, ...p), 'utf8'));

  it('« Supprimer mon compte » n’ouvre pas sa confirmation dans le même lot d’état', () => {
    // 🔴 Le défaut, VU au simulateur le 2026-08-14 : `setReglages(false)` et
    // `setConfirmDelete(true)` partaient ensemble. La feuille gardait sa `Modal`
    // montée le temps de sa sortie, iOS refusait la seconde, et la confirmation
    // n'apparaissait JAMAIS — geste RGPD et point de revue App Store.
    const src = l('app', '(tabs)', 'profil.tsx');
    expect(src).not.toMatch(/setReglages\(false\);\s*setConfirmDelete\(true\)/);
    expect(src).toMatch(/onClosed=\{[^}]*setConfirmDelete\(true\)/);
  });

  it('« Me peser » attend le démontage de l’éditeur, lui aussi', () => {
    // 🔴 SEPTIÈME GESTE MORT, trouvé le 2026-08-14 en VÉRIFIANT les trois autres
    // correctifs au simulateur. `onWeighIn` faisait `setEditor(null);
    // setWeighIn(true);` — et son commentaire affirmait « on ferme l'éditeur AVANT
    // d'ouvrir la pesée ». Les setters étaient bien dans cet ordre ; ils partaient
    // dans le même LOT. Preuve : deux captures à cinq secondes d'intervalle,
    // identiques au bit près, aucune feuille ouverte.
    const src = l('app', '(tabs)', 'profil.tsx');
    expect(src).not.toMatch(/setEditor\(null\);\s*setWeighIn\(true\)/);
    expect(src).toMatch(/onClosed=\{[^}]*setWeighIn\(true\)/);
  });

  it('🔴 aucune feuille ne s’en ouvre une autre dans le même lot d’état', () => {
    // Le compteur, plutôt qu'un cas par cas : les deux occurrences connues ont été
    // écrites à des semaines d'écart, dans le même fichier, par le même
    // raisonnement — « je ferme, puis j'ouvre ». La troisième s'écrira pareil.
    //
    // Règle : dans un même corps de fonction, FERMER un état de feuille
    // (`false`/`null`) puis en toucher un autre avec une valeur ouvrante. Les
    // fermetures en série sont légitimes et ne sont pas comptées — `plan.tsx`
    // remet trois états à `null` pour refermer sa feuille unique.
    const fautifs: string[] = [];
    for (const { nom, src } of FICHIERS) {
      const code = sansCommentaires(src);
      const etats = new Set(
        [...code.matchAll(/<(?:Sheet|ActionSheet)\b[\s\S]{0,200}?visible=\{([^}]*)\}/g)]
          .flatMap((m) => [...m[1].matchAll(/[a-z][A-Za-z0-9]*/g)].map((x) => x[0])),
      );
      const setter = (n: string) => `set${n[0].toUpperCase()}${n.slice(1)}`;
      const ouvrants = new Set([...etats].map(setter));
      for (const m of code.matchAll(/\b(set[A-Z][A-Za-z0-9]*)\(\s*(?:false|null)\s*\)\s*;\s*(set[A-Z][A-Za-z0-9]*)\(\s*([^)]*)\)/g)) {
        const [, ferme, ouvre, arg] = m;
        if (!ouvrants.has(ferme) || !ouvrants.has(ouvre) || ferme === ouvre) continue;
        if (/^\s*(?:false|null)\s*$/.test(arg)) continue;      // deux fermetures : légitime
        fautifs.push(`${nom} — ${ferme}(…) puis ${ouvre}(${arg.trim()}) : passer par \`onClosed\``);
      }
    }
    expect(fautifs, fautifs.join('\n')).toEqual([]);
  });

  it('sait dire NON : la version d’avant correctif est bien vue comme fautive', () => {
    // Un compteur qu'on n'a jamais vu rougir ne prouve rien — et celui-ci a deux
    // clauses d'exemption (fermetures en série, état hors feuille) dont chacune
    // pourrait le rendre aveugle sans qu'on s'en aperçoive.
    const ETAT = /<(?:Sheet|ActionSheet)\b[\s\S]{0,200}?visible=\{([^}]*)\}/;
    const CHAINE = /\b(set[A-Z][A-Za-z0-9]*)\(\s*(?:false|null)\s*\)\s*;\s*(set[A-Z][A-Za-z0-9]*)\(\s*([^)]*)\)/;
    expect(ETAT.test('<Sheet visible={weighIn} onClose={…}>')).toBe(true);
    const avant = 'onWeighIn={() => { setEditor(null); setWeighIn(true); }}';
    expect(CHAINE.test(avant)).toBe(true);
    // …et la fermeture en série reste blanchie par la clause, pas par hasard.
    expect(CHAINE.exec('setSelectedMeal(null); setDislikeElicit(null)')![3].trim()).toBe('null');
  });

  it('`Sheet` prévient APRÈS l’animation, et seulement s’il reste fermé', () => {
    const src = l('components', 'Sheet.tsx');
    expect(src).toMatch(/if\s*\(\s*!visibleRef\.current\s*\)\s*\{\s*setRender\(false\);\s*onClosedRef\.current/);
    // Le rappel passe par une REF : l'effet ne dépend que de `visible`, donc il
    // figerait la version du premier rendu.
    expect(src).toContain('onClosedRef.current = onClosed');
  });
});
