import { describe, it, expect } from 'vitest';
import raw from '../../Recette/recettes-kyroz.json';
import { norm } from '../../scripts/check-doublons';

// ── UN NOM DE RECETTE NE PROMET PAS UN ALIMENT QU'IL NE SERT PAS ─────────────
//
// 🔴 LE DÉFAUT MESURÉ (audit du 2026-09-09). Neuf recettes portaient dans leur TITRE
// un aliment absent de leur liste d'ingrédients : « Riz – poulet – ananas – cajou »
// sans cajou, « Saumon – riz complet – brocoli – sésame » dont le gras était des
// graines de courge, « Shake yaourt soja – banane – cacao » sans cacao. L'utilisateur
// choisit la recette SUR SON NOM, fait ses courses sur la liste, et l'aliment qui l'a
// décidé n'y est pas. C'est la même règle que partout ailleurs dans Kyroz : ce qui est
// affiché est ce qui sera servi.
//
// ⚠️ SANS COMPTEUR, LA RÈGLE NE TIENT PAS UNE VAGUE. Ces neuf noms viennent de trois
// vagues différentes, aucune ne voyait les autres. La prochaine s'écrira de la même
// façon et personne ne relira 512 titres.
//
// ⚠️ CE QUI EST VOLONTAIREMENT HORS PÉRIMÈTRE, et pourquoi — un filet trop large
// rendrait 37 signalements dont 28 justes, donc illisible, donc désarmé :
//   • les ASSAISONNEMENTS LIBRES (citron, ail, épices, herbes) : le catalogue n'a
//     aucun `ref` pour eux, ils ne portent pas de macros et ne pèsent pas dans les
//     courses. « courgettes – citron » ne promet pas un aliment, il décrit un goût.
//   • les NOMS DE PRÉPARATION (« curry de pois chiches », « ricotta de tofu »,
//     « œufs cocotte ») : ils nomment un plat, pas un ingrédient.
// Ne restent ici que les aliments MATÉRIELS — ceux qui portent des macros, entrent
// dans la liste de courses, et dont l'absence se voit dans l'assiette.
//
// ⚠️ LA LEÇON DES DEUX FAUX POSITIFS. L'audit avait signalé col76 et rep213 (« sauce
// fromage blanc au sésame », « haricots verts et sésame ») : toutes deux contiennent
// du `tahini`, dont le libellé EST « Purée de sésame (tahini) ». Chercher le mot du
// titre dans les `ref` seuls accuse une recette honnête. On cherche donc aussi dans
// le LIBELLÉ servi à l'utilisateur, et c'est ce que dit `PROMESSES` ci-dessous.

/** Mot du titre → fragments qui, dans un `ref` ou son libellé, honorent la promesse. */
const PROMESSES: Record<string, string[]> = {
  sesame: ['sesame', 'tahini'],
  cajou: ['cajou'],
  capre: ['capre'],
  cacao: ['cacao', 'chocolat'],
  chia: ['chia'],
  coco: ['coco'],
  noisette: ['noisette'],
  amande: ['amande'],
  pistache: ['pistache'],
  miel: ['miel'],
  feta: ['feta'],
  parmesan: ['parmesan'],
  mozzarella: ['mozzarella'],
  avocat: ['avocat'],
  olive: ['olive'],

  // ── ÉLARGISSEMENT DU 2026-09-11 : les FÉCULENTS et les PROTÉINES ──────────
  // La première version ne couvrait que les aliments « remarquables » (sésame,
  // cajou, cacao), en supposant qu'un titre ne pouvait pas se tromper sur sa base.
  // ⚠️ Faux, et c'est le contraire : trois titres promettaient une base absente,
  // et personne ne les avait vus parce que personne ne cherchait là. « Curry pois
  // chiches – patate – riz » sans riz, « Shake récup riz » sans riz, « Semoule au
  // bœuf, carottes et pois chiches grillés » qui sert des PETITS POIS.
  // Une limite qu'on déclare n'est pas une limite qu'on garde : celle-ci a tenu
  // deux jours.
  riz: ['riz'],
  pates: ['pates'],
  quinoa: ['quinoa'],
  boulgour: ['boulgour'],
  // `polenta` s'appelle aussi « semoule de maïs » dans trois titres (col17, pd110,
  // col96) : le mot « semoule » y est honoré par la polenta, pas par le couscous.
  semoule: ['semoule', 'polenta'],
  millet: ['millet'],
  sarrasin: ['sarrasin'],
  lentille: ['lentille'],
  'pois chiche': ['pois_chiche'],
  'patate douce': ['patate_douce'],
  'pomme de terre': ['pomme_de_terre'],
  nouille: ['nouille'],
  tofu: ['tofu'],
  tempeh: ['tempeh'],
  seitan: ['seitan'],
  poulet: ['poulet'],
  boeuf: ['boeuf'],
  dinde: ['dinde'],
  saumon: ['saumon'],
  thon: ['thon'],
  cabillaud: ['cabillaud'],
  crevette: ['crevette'],
};

interface Recette {
  id: string;
  name: string;
  ingredients: { ref: string }[];
}
const catalogue = raw.recipes as unknown as Recette[];
const libelles = raw.ingredients_reference as unknown as Record<string, { name: string }>;

/** Ce que la recette SERT, tel que l'utilisateur peut le lire : refs + libellés. */
const servi = (r: Recette) =>
  norm(r.ingredients.map((i) => `${i.ref} ${libelles[i.ref]?.name ?? ''}`).join(' '));

/** Les aliments que le TITRE promet sans que la recette les serve. */
export const promessesNonTenues = (r: Recette): string[] => {
  const titre = norm(r.name);
  const assiette = servi(r);
  return Object.entries(PROMESSES)
    .filter(([mot, frs]) => new RegExp(`\\b${mot.replace(/ /g, '\\s+')}`).test(titre)
      && !frs.some((f) => assiette.includes(norm(f))))
    .map(([mot]) => mot);
};

// « Œufs cocotte » contient « coco » : c'est le nom de la préparation, pas une noix
// de coco absente. Nommée une par une plutôt qu'écartée par un motif, sinon la
// prochaine recette vraiment fautive du même mot passerait sous l'exception.
const TOLERE: Record<string, string> = {
  rep136: '« Œufs cocotte » — nom de préparation, le « coco » n’est pas un aliment promis',
  rep36: '« Tortilla pommes de terre » — la tortilla espagnole EST une omelette (œuf + pomme de terre), pas une galette de blé',
};

describe('le nom d’une recette ne promet pas un aliment absent', () => {
  it('la sonde voit le catalogue et exerce vraiment son lexique', () => {
    // Témoin : sans lui, un lexique vidé ou une regex cassée rendrait « aucune
    // promesse non tenue » et le test passerait au vert en ne mesurant plus rien.
    expect(catalogue.length).toBeGreaterThan(500);
    expect(catalogue.filter((r) => /sésame|cacao|avocat/i.test(r.name)).length).toBeGreaterThan(3);
  });

  it('le tahini honore une promesse de sésame', () => {
    // C'est ce qui distingue une recette honnête d'une fautive : col76 et rep213
    // servent du sésame sous le nom « tahini ». Les accuser serait le faux positif
    // qui pousse à débrancher le test.
    const tahinees = catalogue.filter((r) => r.ingredients.some((i) => i.ref === 'tahini'));
    expect(tahinees.length).toBeGreaterThan(0);
    for (const r of tahinees) expect(promessesNonTenues(r)).not.toContain('sesame');
  });

  it('une promesse fausse EST attrapée', () => {
    // Mutation : un garde-fou qu'on n'a jamais vu rougir ne garde rien.
    const faux: Recette = {
      id: 'test',
      name: 'Riz – poulet – ananas – cajou',
      ingredients: [{ ref: 'riz_basmati' }, { ref: 'poulet_filet' }],
    };
    expect(promessesNonTenues(faux)).toEqual(['cajou']);
  });

  it('aucune recette du catalogue n’en porte', () => {
    const fautives = catalogue
      .filter((r) => !TOLERE[r.id])
      .map((r) => ({ r, mots: promessesNonTenues(r) }))
      .filter(({ mots }) => mots.length > 0)
      .map(({ r, mots }) => `${r.id} — « ${r.name} » promet ${mots.join(', ')} sans le servir`);
    expect(fautives, `\n  ${fautives.join('\n  ')}\n`).toEqual([]);
  });
});
