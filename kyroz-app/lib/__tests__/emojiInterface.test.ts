import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ── Aucun émoji dans l'interface — LE COMPTEUR ───────────────────────────────
//
// La règle est posée depuis le 2026-08-06 (CLAUDE.md §8). Ce fichier est ce qui
// lui manquait, et son absence a coûté exactement ce qu'elle devait coûter :
//
//   • la passe du 2026-08-06 a compté sur `app/` + `components/`, y a retiré ses
//     55 émojis, et s'est déclarée TERMINÉE ;
//   • la conclusion a été recopiée à trois endroits — le message de commit, un
//     commentaire d'`Icons.tsx`, et CLAUDE.md §8 — où les trois copies se
//     confirmaient l'une l'autre ;
//   • il en restait 13 AFFICHÉS, dans `lib/` et `constants/`. Des fichiers qui
//     n'ont pas l'air d'interface, et qui remontent à l'écran via des composants
//     qui, eux, n'en contiennent aucun.
//
// ➡️ LA LEÇON, et c'est elle que ce test fige : **un inventaire d'interface se
// compte sur ce qui est AFFICHÉ, pas sur les fichiers qui ressemblent à de
// l'interface.** D'où les cinq dossiers ci-dessous, et pas deux.
//
// ⚠️ Et une règle qu'aucun compteur n'exige se déclare tenue toute seule. C'est
// le même motif que `typoDA` / `rayonsDA` / `espacementDA` : ce n'est pas la
// relecture qui a trouvé les dérives, c'est le comptage.

const RACINE = join(__dirname, '..', '..');

// Cinq dossiers, PAS deux. `lib/` et `constants/` sont précisément ceux que la
// passe d'origine avait oubliés parce qu'ils « ne ressemblent pas à de l'UI ».
const DOSSIERS = ['app', 'components', 'lib', 'constants', 'hooks'];

// `®`, `©` et `™` sont Extended_Pictographic pour Unicode, mais ce ne sont pas
// des émojis : ce sont des signes TYPOGRAPHIQUES, ils n'ont pas de couleur
// propre, ils suivent la fonte et donc le thème. C'est exactement le critère qui
// condamne les autres. `lib/foods.ts` en porte un légitime — « Table Ciqual® 2025
// (ANSES) », une mention de source qu'on n'a pas le droit de réécrire.
const SIGNES_TYPOGRAPHIQUES = new Set(['®', '©', '™']);

const PICTO = /\p{Extended_Pictographic}/gu;

/**
 * Retire les commentaires avant de compter.
 *
 * ⚠️ Volontairement plus strict que la commande citée dans CLAUDE.md §8, qui ne
 * filtrait que les lignes COMMENÇANT par `//`, `*` ou `/*`. Mesuré en écrivant ce
 * test : cette version-là rend **58** occurrences sur ce dépôt contre **11** ici —
 * l'écart est fait de `⚠️` et de `🔴` posés en fin de ligne, après du code. Un
 * compteur qui crie au loup sur 47 commentaires ne sera pas lu longtemps.
 *
 * Le `(?<!:)` protège les URL : sans lui, `https://…` serait pris pour un
 * commentaire et la moitié d'une ligne disparaîtrait du comptage.
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
    // Les tests ne sont pas de l'interface — et celui-ci se compterait lui-même.
    if (e === '__tests__' || e === 'node_modules') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersSource(p));
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

describe('Aucun émoji dans l’interface (CLAUDE.md §8)', () => {
  const trouves: string[] = [];

  for (const d of DOSSIERS) {
    for (const f of fichiersSource(join(RACINE, d))) {
      sansCommentaires(readFileSync(f, 'utf8'))
        .split('\n')
        .forEach((ligne, i) => {
          const m = ligne.match(PICTO);
          if (!m) return;
          const fautifs = m.filter((c) => !SIGNES_TYPOGRAPHIQUES.has(c));
          if (fautifs.length === 0) return;
          trouves.push(
            `${f.slice(RACINE.length + 1)}:${i + 1} — ${fautifs.join(' ')}  ${ligne.trim().slice(0, 90)}`,
          );
        });
    }
  }

  it('zéro émoji dans le code affiché, les cinq dossiers confondus', () => {
    expect(
      trouves,
      `Émoji(s) dans du code affiché :\n${trouves.join('\n')}\n\n` +
        `Deux natures, deux gestes (CLAUDE.md §8) : s'il tient la place d'une ICÔNE, ` +
        `c'est un tracé de components/Icons.tsx ; s'il n'est qu'un TON DE VOIX, il se ` +
        `retire et la phrase se reformule sans lui — elle doit tenir seule.`,
    ).toEqual([]);
  });

  // Vérification de l'INSTRUMENT, pas du produit. Un compteur qu'on n'a jamais vu
  // rougir ne prouve rien : celui-ci a déjà eu deux versions fausses (l'une
  // aveugle aux commentaires de fin de ligne, l'autre qui condamnait le `®` de
  // Ciqual). Les deux rendaient un résultat parfaitement plausible.
  it('l’instrument sait dire OUI — il voit un émoji, et il ignore ce qu’il doit ignorer', () => {
    expect('Bravo 🎉'.match(PICTO)).toHaveLength(1);
    expect(sansCommentaires('const x = 1; // 🔥 note').match(PICTO)).toBeNull();
    expect(sansCommentaires('const u = "https://kyroz.app"; // 🔥').match(PICTO)).toBeNull();
    expect(sansCommentaires('const u = "https://kyroz.app/🔥";').match(PICTO)).toHaveLength(1);
    expect('Ciqual®'.match(PICTO)!.every((c) => SIGNES_TYPOGRAPHIQUES.has(c))).toBe(true);
  });
});
