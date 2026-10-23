/**
 * LE RANGEMENT DE LA RÉSERVE, ALIMENT PAR ALIMENT (point 5 avant la 62ᵉ OTA, 2026-10-23 :
 * « vérifier aliment par aliment le rangement frais / sec »).
 *
 * Écrit `docs/2026-10-23-rangement-reserve.md` DEPUIS LE CODE : pour chaque aliment du
 * catalogue servi par au moins une recette, le rayon (`categorize`) et le rangement
 * (`conservationDe`) que l'app lui donne vraiment quand il arrive des courses. Les
 * propositions de correction sont écrites ci-dessous, à la main, avec leur raison : elles
 * s'affichent en face de l'état du code tant qu'il ne les applique pas.
 *
 * Lancer : `npx tsx scripts/gen-rangement-reserve.ts` (pas de ligne `npm run`, cf. CLAUDE.md §2).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS, RAW_RECIPES } from '../lib/recipeData';
import { categorize, conservationDe, isStaple, type Conservation } from '../lib/pantry';

const RAYON: Record<string, string> = {
  viandes: 'Viandes & poissons', légumes: 'Légumes & fruits', féculents: 'Féculents',
  laitiers: 'Produits laitiers & œufs', autres: 'Autres',
};

/**
 * Les propositions, à valider par le fondateur. RÈGLE (fondateur, 2026-10-23 : « tu ne mets
 * pas une banane au frigo ») : **au frais = au frigo** ; **au sec = tout le reste** (placard,
 * corbeille, à l'abri de la lumière). Chaque ligne dit sa source (cf. SOURCES plus bas).
 * Dans le doute (marques qui vendent l'un ou l'autre), le frigo : un produit du rayon frais
 * oublié au placard est un risque, l'inverse non — sauf pour ce que le froid abîme.
 */
const PROPOSE: Record<string, { rangement?: Conservation; rayon?: string; pourquoi: string }> = {
  // Ce que le froid abîme : corbeille ou placard (Interfel, Aprifel).
  banane: { rangement: 'sec', pourquoi: 'corbeille : au frigo elle noircit et perd son goût [1]' },
  tomate: { rangement: 'sec', pourquoi: 'température ambiante : le froid la rend farineuse [1][2]' },
  avocat: { rangement: 'sec', pourquoi: 'température ambiante tant qu\'il est entier [1]' },
  ananas: { rangement: 'sec', pourquoi: 'air ambiant, il craint le froid (< 7 °C) [1]' },
  mangue: { rangement: 'sec', pourquoi: 'mûrit à l\'air libre, en corbeille [1]' },
  pomme: { rangement: 'sec', pourquoi: 'corbeille, 7 à 8 jours à l\'air ambiant [1]' },
  pomme_de_terre: { rangement: 'sec', pourquoi: 'endroit frais et sec, à l\'abri de la lumière [1]' },
  patate_douce: { rangement: 'sec', pourquoi: 'au sec, comme la pomme de terre [1]' },
  oignon: { rangement: 'sec', pourquoi: 'endroit sombre et aéré [1]' },
  lentilles_corail: { rangement: 'sec', rayon: 'féculents', pourquoi: 'lentilles sèches ; et « corail » contient « ail », d\'où le rayon Légumes' },
  // Vendus au rayon frais : le frigo.
  tofu_ferme: { rangement: 'frais', pourquoi: 'rayon frais [4]' },
  tofu_fume: { rangement: 'frais', pourquoi: 'rayon frais [4]' },
  tempeh: { rangement: 'frais', pourquoi: 'frigo (certaines marques bio le vendent pasteurisé, au frigo une fois ouvert) [4]' },
  seitan: { rangement: 'frais', pourquoi: 'frigo (même remarque que le tempeh) [4]' },
  boulette_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis déjà au frais' },
  galette_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis déjà au frais' },
  lardons_vegetaux: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis déjà au frais' },
  merguez_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis déjà au frais' },
  nuggets_vegetal: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis déjà au frais' },
  saucisse_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis déjà au frais' },
  chorizo_vegetal: { rangement: 'frais', rayon: 'viandes', pourquoi: 'rayon frais ; et « chorizo » contient « riz », d\'où le rayon Féculents' },
  falafel: { rangement: 'frais', pourquoi: 'prêts à consommer : rayon traiteur frais' },
  // Briques UHT : au placard tant qu'elles sont fermées (À TRANCHER, cf. la question du doc).
  lait_demi_ecreme: { rangement: 'sec', pourquoi: 'brique UHT fermée : placard (frigo une fois ouverte) — comme le lait d\'amande et le lait de coco' },
  creme_soja: { rangement: 'sec', pourquoi: 'brique UHT fermée : placard (frigo une fois ouverte) — comme le lait d\'amande et le lait de coco' },
};

/** Les sources citées par les propositions et le tableau. */
const SOURCES = [
  '[1] Interfel, lesfruitsetlegumesfrais.com — fiches « choisir et conserver » (banane, avocat, ananas, mangue, pomme, kiwi, raisin, framboise, myrtille, concombre, poivron, carotte, brocoli, chou-fleur, épinard, asperge, champignon, pomme de terre, patate douce, oignon, betterave).',
  '[2] Ministère de l\'Agriculture, « Comment bien conserver ses légumes ? » (agriculture.gouv.fr) — la tomate garde mieux son goût à l\'air libre ; la plupart des légumes au bac à légumes.',
  '[3] ANSES (rapporté par Allodocteurs) — des œufs vendus à température ambiante n\'ont pas besoin du frigo ; choisir l\'un ou l\'autre et s\'y tenir.',
  '[4] Fiches produit Celnat (Greenweez) — tempeh et seitan : « une fois ouvert, à conserver au réfrigérateur entre 0 °C et 4 °C ».',
  '[5] Mori-Nu — tofu soyeux en brique aseptique : pas de frigo avant ouverture.',
];

const usage = new Map<string, number>();
for (const r of RAW_RECIPES as { ingredients?: { ref: string }[] }[]) {
  for (const ref of new Set((r.ingredients ?? []).map((i) => i.ref))) usage.set(ref, (usage.get(ref) ?? 0) + 1);
}

const lignes = Object.entries(RECIPE_INGREDIENTS)
  .filter(([ref, d]) => (usage.get(ref) ?? 0) > 0 && !isStaple(d.name))
  .map(([ref, d]) => {
    const rayon = categorize(d.name);
    return { ref, nom: d.name, rayon, rangement: conservationDe({ name: d.name, quantity: 1, unit: d.unit, category: rayon }) };
  });

const enAttente = (l: (typeof lignes)[number]) => {
  const p = PROPOSE[l.ref];
  return p && ((p.rangement && p.rangement !== l.rangement) || (p.rayon && p.rayon !== l.rayon)) ? p : null;
};

const table = (c: Conservation) => {
  const l = lignes.filter((x) => x.rangement === c)
    .sort((a, b) => RAYON[a.rayon].localeCompare(RAYON[b.rayon]) || a.nom.localeCompare(b.nom));
  return [
    `### ${c === 'frais' ? 'Au frais' : 'Au sec'} aujourd'hui (${l.length})`, '',
    '| Aliment | Rayon | Proposé |', '|---|---|---|',
    ...l.map((x) => {
      const p = enAttente(x);
      const propose = p
        ? `**${[p.rangement && p.rangement !== x.rangement ? (p.rangement === 'frais' ? 'au frais' : 'au sec') : '', p.rayon && p.rayon !== x.rayon ? `rayon ${RAYON[p.rayon]}` : ''].filter(Boolean).join(', ')}** — ${p.pourquoi}`
        : '';
      return `| ${x.nom} | ${RAYON[x.rayon]} | ${propose} |`;
    }),
  ].join('\n');
};

const nbPropose = lignes.filter(enAttente).length;
const placard = Object.values(RECIPE_INGREDIENTS).filter((d) => isStaple(d.name)).map((d) => d.name);

const doc = `# Le rangement de la Réserve, aliment par aliment (point 5, 2026-10-23)

> Demande du fondateur (point 5 avant la 62ᵉ OTA) : *« vérifier aliment par aliment le
> rangement frais / sec »*. ⚠️ **Généré depuis le code** par \`npx tsx scripts/gen-rangement-reserve.ts\` :
> le rayon et le rangement sont ceux que l'app donne VRAIMENT à un aliment qui arrive des
> courses (\`pantry.ts::categorize\`, \`conservationDe\`). Ne pas l'éditer à la main.
>
> **${lignes.length} aliments** (servis par au moins une recette, hors fonds de placard) ·
> **${nbPropose} corrections proposées**, en attente du fondateur.

## La règle (fondateur, 2026-10-23)

- **Au frais = au frigo.** *« Tu ne mets pas une banane au frigo. Rares sont les fruits qui y
  vont. »* Chaque aliment est rangé là où les sources ci-dessous le mettent.
- **Au sec = tout le reste** : placard, corbeille à fruits, endroit sombre et aéré.
- Les **surgelés** (edamame, fruits rouges, mélange wok, petits pois, vendus en sachet
  surgelé) restent au frais : le congélateur n'a pas de case à lui, le froid va avec le froid.
- Dans le doute (une marque le vend au frais, une autre non), le frigo : un produit du rayon
  frais oublié au placard est un risque, l'inverse non.
- Toujours corrigeable d'une touche dans la Réserve, et la correction l'emporte.

### À trancher : les briques UHT et les pots fermés

Lait demi-écrémé, crème de soja, lait d'amande, lait de coco, tofu soyeux en brique [5],
pesto, sirop d'érable : **placard tant que c'est fermé, frigo une fois ouvert**. La Réserve
reçoit des paquets fermés à « Courses terminées ». Proposé : **au sec pour tous** (aujourd'hui
le lait et la crème de soja sont au frais, les cinq autres au sec — deux rangements pour le
même cas).

${table('frais')}

${table('sec')}

### Jamais en Réserve

Fonds de placard, supposés toujours là (\`isStaple\`) : ${placard.join(', ')}.

## Sources

${SOURCES.map((x) => `- ${x}`).join('\n')}

Œufs : laissés au frais. Vendus à température ambiante en France, ils n'ont pas besoin du
frigo, mais ils peuvent y aller tant qu'on ne les en sort pas [3] — c'est l'usage le plus
courant. Kiwi et raisin restent au frais : au bac à légumes selon Interfel [1] (le kiwi mûrit
en corbeille, il se garde ensuite au frigo). Courgette : les fiches d'Interfel divergent
(« endroit frais et sec », « moins d'une semaine au frais ») ; laissée au frais, comme le
concombre et le poivron (bac à légumes) [1].
`;

writeFileSync(join(__dirname, '..', 'docs', '2026-10-23-rangement-reserve.md'), doc);
console.log(`${lignes.length} aliments, ${nbPropose} corrections proposées`);
