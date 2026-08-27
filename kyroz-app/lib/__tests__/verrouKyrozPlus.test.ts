import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PREMIUM_FEATURES, PremiumFeature } from '../premium';

// ── Toute feature vendue est réellement VERROUILLÉE — le compteur ────────────
//
// 🔴 CE FICHIER EXISTE À CAUSE D'UN TROU RÉEL (audit paywall, 2026-08-25).
// `transformation` était déclarée dans `PREMIUM_FEATURES` depuis le 2026-07-27,
// annoncée sur l'écran de vente (`app/kyroz-plus.tsx::BRIQUES`), écrite dans les
// CGU §3 — et `can('transformation')` n'était appelé NULLE PART. Le jour où
// `PAYWALL_LAUNCH` reçoit une date, l'objectif daté se serait verrouillé et les
// photos seraient restées ouvertes : un paywall qui vend deux briques et n'en
// garde qu'une.
//
// ⚠️ POURQUOI LA RELECTURE NE POUVAIT PAS LE TROUVER, et c'est le motif à retenir :
// rien ne manquait à l'écran. Il n'y avait pas de bouton cassé, pas de test rouge,
// pas de type faux — `PREMIUM_FEATURES` était juste une LISTE que personne ne
// confrontait aux points de gate. Un manque ne se voit pas, il se COMPTE.
//
// ⚠️ CE TEST NE VÉRIFIE PAS QUE LE VERROU EST BIEN PLACÉ. Il vérifie qu'il EXISTE.
// Aucun test ne peut juger qu'un gate est au bon endroit ; c'est pour ça que
// chaque point de gate porte en commentaire ce qu'il garde et ce qu'il laisse
// libre (la pesée, la courbe, l'historique — jamais verrouillés).
//
// ⚠️ ET SA LIMITE EST MESURÉE, pas supposée : il ne distingue pas une interrogation
// qui VERROUILLE d'une qui se contente d'AFFICHER. `dated_goal` est lu à trois
// endroits de `profil.tsx`, dont deux qui ne font que choisir un libellé — vérifié
// par mutation : retirer le seul vrai verrou (la table `EDITEURS_PREMIUM`) laisse
// ce fichier VERT. Ce qu'il attrape, c'est la feature que PLUS PERSONNE n'interroge,
// et c'est exactement la panne qu'il a été écrit pour empêcher de revenir.
//
// ✅ Vérifié par 4 mutations (2026-08-25) : retirer `can('transformation')`, retirer
// les trois lectures de `dated_goal`, poser un verrou sur une feature absente de
// `PREMIUM_FEATURES`, et rendre la trajectoire inconditionnelle — chacune rougit.

const RACINE = join(__dirname, '..', '..');

// Les trois dossiers où un verrou peut vivre. `lib/` en est exclu à dessein :
// `lib/premium.ts` DÉCLARE les features, il ne les interroge pas — l'y chercher
// ferait passer le test sur sa propre déclaration, et il ne dirait plus rien.
const DOSSIERS = ['app', 'components', 'hooks'];

/**
 * Retire les commentaires avant de compter.
 *
 * 🔴 SANS ÇA, CE TEST EST DÉCORATIF, et il l'a été — vérifié par mutation en
 * l'écrivant : retirer `can('transformation')` du code laissait le test VERT,
 * parce qu'il trouvait la chaîne dans le commentaire d'en-tête de ce fichier-ci
 * et dans celui du composant. Un compteur qui lit la PROSE qui parle de la règle
 * au lieu du CODE qui l'applique se confirme tout seul.
 * (Même filtre que `emojiInterface.test.ts`, pour la même raison.)
 */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(?<!:)\/\/.*$/, ''))
    .join('\n');
}

function fichiersSource(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e === '__tests__' || e === 'node_modules') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersSource(p));
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

/**
 * Les deux façons dont l'app interroge le verrou, et il faut les deux :
 *  1. `can('feature')` — l'appel direct (photos, trajectoire) ;
 *  2. la table `EDITEURS_PREMIUM` de `profil.tsx`, qui associe un éditeur à une
 *     feature avant de la passer à `can()`. Chercher seulement `can(` raterait
 *     `dated_goal`, qui n'apparaît jamais littéralement dans un appel.
 *
 * ⚠️ On lit les VALEURS de la table, pas ses clés : les clés sont des `EditorKey`
 * et `dated_goal` est les deux. Compter les clés ferait passer le test même si le
 * mapping vers la feature avait disparu — un test vert sur un verrou absent.
 */
function featuresInterrogees(): { trouvees: Set<string>; ou: Map<string, string[]> } {
  const trouvees = new Set<string>();
  const ou = new Map<string, string[]>();
  const noter = (f: string, fichier: string) => {
    trouvees.add(f);
    ou.set(f, [...(ou.get(f) ?? []), fichier]);
  };

  for (const d of DOSSIERS) {
    for (const f of fichiersSource(join(RACINE, d))) {
      const src = sansCommentaires(readFileSync(f, 'utf8'));
      const nom = f.slice(RACINE.length + 1);

      for (const m of src.matchAll(/\bcan\(\s*'([a-z_]+)'\s*\)/g)) noter(m[1], nom);

      const table = src.match(/EDITEURS_PREMIUM[^=]*=\s*\{([\s\S]*?)\n\}/);
      if (table) for (const m of table[1].matchAll(/:\s*'([a-z_]+)'/g)) noter(m[1], nom);
    }
  }
  return { trouvees, ou };
}

describe('chaque feature de PREMIUM_FEATURES est réellement interrogée', () => {
  const { trouvees, ou } = featuresInterrogees();

  it.each(PREMIUM_FEATURES)('« %s » a au moins un point de gate dans l’app', (f: PremiumFeature) => {
    expect(
      trouvees.has(f),
      `« ${f} » est vendue (lib/premium.ts, app/kyroz-plus.tsx, CGU §3) mais AUCUN écran ` +
        `ne l'interroge : ni can('${f}'), ni la table EDITEURS_PREMIUM. Le jour où ` +
        `PAYWALL_LAUNCH reçoit une date, elle restera gratuite en silence.`,
    ).toBe(true);
  });

  // ── 01-07 · ce que voit une plateforme qui ne peut pas encaisser ──────────
  //
  // 🔴 UNE PHRASE DE CET ÉCRAN S'EST RETOURNÉE LE 2026-08-27, sans que personne n'y
  // touche : la pose de `PAYWALL_LAUNCH` l'a rendue fausse. Elle disait « tes deux
  // outils restent actifs en attendant » — vrai tant que rien n'était verrouillé, faux
  // dès que quelqu'un l'est. Or le bloc qui la porte ne se rend QUE pour un compte
  // verrouillé (`enVente = reason === 'locked'`), et sans clé de plateforme — donc, en
  // production, un compte Android créé après la date.
  // ⚠️ Ce test ne juge pas la rédaction. Il tient l'invariant : **cet écran ne promet
  // pas un accès à qui ne l'a pas.**
  it('🔴 la mention « pas d’achat ici » ne promet AUCUN accès', () => {
    const ecran = readFileSync(join(process.cwd(), 'app', 'kyroz-plus.tsx'), 'utf8')
      .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    const i = ecran.indexOf('{!encaissable && (');
    expect(i, 'le bloc « sans encaissement » a disparu de l’écran').toBeGreaterThan(-1);
    const bloc = ecran.slice(i, i + 600);
    for (const promesse of ['restent actifs', 'restent ouverts', 'restent accessibles']) {
      expect(
        bloc.includes(promesse),
        `« ${promesse} » est promis à un compte VERROUILLÉ : ce bloc ne se rend que si `
        + 'reason === "locked", donc la personne qui le lit n’a justement pas l’accès.',
      ).toBe(false);
    }
  });

  it('ne verrouille rien qui ne soit pas vendu', () => {
    // Le sens inverse, et il compte autant : un `can('x')` sur une feature absente de
    // `PREMIUM_FEATURES` renvoie toujours `true` (cf. `canUse`). Le code aurait l'air
    // de garder quelque chose, et ne garderait rien.
    const inconnues = [...trouvees].filter((f) => !PREMIUM_FEATURES.includes(f as PremiumFeature));
    expect(
      inconnues,
      `Verrou posé sur une feature qui n'est pas dans PREMIUM_FEATURES : ${inconnues.join(', ')}. ` +
        `canUse() la laisse passer — le gate est décoratif.`,
    ).toEqual([]);
  });

  it('le verrou des photos ne touche NI la pesée NI la courbe', () => {
    // La règle produit qui ne se négocie pas : sans pesée gratuite, le TDEE ne se
    // corrige jamais et la détection de perte trop rapide n'a plus de signal. Ce test
    // fige le fait que le verrou de la feuille de pesée ne s'applique qu'aux photos
    // et à la trajectoire — pas au bouton d'enregistrement, pas à l'historique.
    const src = sansCommentaires(readFileSync(join(RACINE, 'components', 'WeightCheckin.tsx'), 'utf8'));

    const boutonEnregistrer = src.match(/<PrimaryButton[^>]*label="Enregistrer"[^>]*>/);
    expect(boutonEnregistrer, 'le bouton « Enregistrer » de la pesée a disparu').not.toBeNull();
    expect(
      boutonEnregistrer![0],
      'le bouton « Enregistrer » de la pesée ne doit JAMAIS dépendre du verrou Kyroz+',
    ).not.toMatch(/transfoOk|premium/);

    // La courbe s'affiche toujours ; seule la trajectoire posée dessus est premium.
    expect(src, 'la courbe de poids doit rester inconditionnelle').toMatch(/<WeightChart\b/);
    expect(
      src.match(/<WeightChart[\s\S]{0,160}?\/>/)?.[0] ?? '',
      'la courbe reçoit `suiviAffiche` (trajectoire verrouillable), mais elle-même ne se cache jamais',
    ).toMatch(/goalTarget=\{suiviAffiche\}/);
  });
});
