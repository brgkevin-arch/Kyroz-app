import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── VERROU : deux chantiers ne peuvent pas porter le même identifiant ────────
//
// POURQUOI CE FICHIER EXISTE — cinq collisions le 2026-08-08, dans la journée.
//
//   · E19 : le tutoriel et l'audit « fortes masses grasses », écrits le même jour ;
//   · A28 : la confirmation e-mail et l'échéance datée ;
//   · A29 : le mot de passe oublié — collision CRÉÉE en corrigeant la précédente,
//           parce que la renumérotation n'avait regardé que `main`, pas les PR
//           empilées au-dessus ;
//   · E17 : la passe émoji, contre « une case laissée vide voulait dire 7 j/7 » ;
//   · E16 : Katch-McArdle contre le volume concentré — celle-ci vivait sur `main`
//           depuis DEUX JOURS sans que personne ne la voie.
//
// La cause est structurelle, pas de la négligence : plusieurs sessions travaillent
// en parallèle, chacune choisit son numéro sur SA branche, et une réservation faite
// sur une branche n'est visible de personne. Le numéro se prend donc au moment de
// FUSIONNER — mais rien ne l'imposait, et « rien ne l'impose » est exactement ce qui
// fait dériver une règle écrite (cf. les passes DA : rayon, typo, espacement).
//
// 🔴 CE QUE COÛTE UN DOUBLON. `AGENTS.md` est la liste UNIQUE des chantiers, et son
// en-tête dit qu'une tâche y vit à un seul endroit. Deux entrées sous le même
// identifiant, ce sont deux chantiers dont l'un devient introuvable, et tous les
// renvois « cf. E16 » qui cessent de désigner quoi que ce soit. Le doublon E16 a
// rendu ambigu le renvoi de la ligne « Tests » sans que rien ne le signale.
//
// ⚠️ Ce test ne juge PAS le contenu des fiches. Il ferme le seul chemin par lequel
// la dérive arrive vraiment : deux fois le même numéro.

const RACINE = join(__dirname, '..', '..');
const AGENTS = 'AGENTS.md';

/**
 * Les identifiants de chantier, tels qu'ils sont DÉCLARÉS en tête d'entrée.
 *
 * Une entrée s'écrit `- **A12 · …**` ou `- ~~**E7 · …**~~` (barrée = livrée), avec
 * parfois un marqueur avant (`🔴`, `🧑`, `🤖`). On n'attrape QUE ce motif : les
 * renvois en pleine phrase (« cf. E16 », « depuis A15 ») ne déclarent rien et ne
 * doivent pas compter comme des doublons.
 */
function identifiantsDeclares(md: string): { id: string; ligne: number; titre: string }[] {
  const out: { id: string; ligne: number; titre: string }[] = [];
  md.split('\n').forEach((l, i) => {
    const m = l.match(/^-\s+(?:[^\w\s]*\s*)*(?:~~)?\*\*([A-Z]\d+)\s·\s*(.{0,60})/u);
    if (m) out.push({ id: m[1], ligne: i + 1, titre: m[2].replace(/\*+/g, '').trim() });
  });
  return out;
}

const MD = readFileSync(join(RACINE, AGENTS), 'utf8');
const DECLARES = identifiantsDeclares(MD);

describe('AGENTS.md — la liste unique n\'a pas deux chantiers sous le même numéro', () => {
  it('trouve bien les entrées (sinon le test ne prouve rien)', () => {
    // Un test qui ne trouve AUCUNE entrée passerait tous les autres sans rien
    // vérifier. C'est le défaut « prouver d'abord que la sonde sait dire OUI ».
    expect(DECLARES.length).toBeGreaterThan(40);
  });

  it('aucun identifiant n\'est déclaré deux fois', () => {
    const parId = new Map<string, { ligne: number; titre: string }[]>();
    for (const d of DECLARES) {
      if (!parId.has(d.id)) parId.set(d.id, []);
      parId.get(d.id)!.push({ ligne: d.ligne, titre: d.titre });
    }
    const doublons = [...parId.entries()]
      .filter(([, v]) => v.length > 1)
      .map(([id, v]) => `${id} → ${v.map((x) => `ligne ${x.ligne} « ${x.titre} »`).join('  ET  ')}`);

    expect(
      doublons,
      'Deux chantiers portent le même identifiant : l\'un devient introuvable, et tout renvoi vers ce numéro cesse de désigner quoi que ce soit.\n'
      + 'Renuméroter celui qui est le MOINS référencé (le critère est le coût de la correction, pas l\'ancienneté), et corriger ses renvois.\n'
      + 'Prendre le prochain numéro libre en regardant `main` ET les branches en aval — une réservation faite sur une branche n\'est visible de personne.\n',
    ).toEqual([]);
  });

  it('chaque préfixe de section reste continu — un TROU signale un numéro perdu', () => {
    // Pas une exigence esthétique : un trou vient presque toujours d'une entrée
    // renumérotée dont on a oublié de reprendre les renvois, ou d'une fiche
    // supprimée dont le numéro reste cité ailleurs. On le SIGNALE sans faire
    // échouer — les séries légitimement discontinues existent (chantiers annulés).
    const parPrefixe = new Map<string, number[]>();
    for (const d of DECLARES) {
      const p = d.id[0];
      if (!parPrefixe.has(p)) parPrefixe.set(p, []);
      parPrefixe.get(p)!.push(Number(d.id.slice(1)));
    }
    for (const [p, nums] of parPrefixe) {
      const tries = [...nums].sort((a, b) => a - b);
      const trous = [];
      for (let n = tries[0]; n < tries[tries.length - 1]; n++) {
        if (!tries.includes(n)) trous.push(`${p}${n}`);
      }
      if (trous.length) console.warn(`[AGENTS.md] série ${p} — numéros absents : ${trous.join(', ')}`);
    }
    expect(parPrefixe.size).toBeGreaterThan(0);
  });
});
