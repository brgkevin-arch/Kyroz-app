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

/** Les propositions (avis du 2026-10-23), à valider par le fondateur. */
const PROPOSE: Record<string, { rangement?: Conservation; rayon?: string; pourquoi: string }> = {
  tofu_ferme: { rangement: 'frais', pourquoi: 'vendu au rayon frais' },
  tofu_fume: { rangement: 'frais', pourquoi: 'vendu au rayon frais' },
  tofu_soyeux: { rangement: 'frais', pourquoi: 'vendu au rayon frais' },
  tempeh: { rangement: 'frais', pourquoi: 'vendu au rayon frais' },
  seitan: { rangement: 'frais', pourquoi: 'vendu au rayon frais' },
  boulette_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis' },
  galette_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis' },
  lardons_vegetaux: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis' },
  merguez_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis' },
  nuggets_vegetal: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis' },
  saucisse_vegetale: { rangement: 'frais', pourquoi: 'rayon frais, comme les autres similis' },
  chorizo_vegetal: { rangement: 'frais', rayon: 'viandes', pourquoi: 'rayon frais ; et « chorizo » contient « riz », d\'où le rayon Féculents' },
  falafel: { rangement: 'frais', pourquoi: 'prêts à consommer : rayon traiteur frais' },
  pomme_de_terre: { rangement: 'sec', pourquoi: 'se garde des semaines au placard, pas au frigo' },
  patate_douce: { rangement: 'sec', pourquoi: 'se garde des semaines au placard, pas au frigo' },
  oignon: { rangement: 'sec', pourquoi: 'se garde des semaines au placard, pas au frigo' },
  lentilles_corail: { rangement: 'sec', rayon: 'féculents', pourquoi: 'lentilles sèches ; et « corail » contient « ail », d\'où le rayon Légumes' },
  lait_demi_ecreme: { rangement: 'sec', pourquoi: 'brique UHT, au placard tant qu\'elle est fermée — comme le lait d\'amande et le lait de coco' },
  creme_soja: { rangement: 'sec', pourquoi: 'brique UHT, au placard tant qu\'elle est fermée — comme le lait d\'amande et le lait de coco' },
};

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

## La règle proposée

- **Au frais** : ce qui va au frigo ou au congélateur, et les fruits et légumes qui se
  mangent dans la semaine (la corbeille compte avec le frais).
- **Au sec** : le placard — ce qui tient des semaines, paquet fermé. La Réserve reçoit des
  paquets entiers et fermés à « Courses terminées » : c'est leur place À CE MOMENT-LÀ.
- Toujours corrigeable d'une touche dans la Réserve, et la correction l'emporte.

${table('frais')}

${table('sec')}

### Jamais en Réserve

Fonds de placard, supposés toujours là (\`isStaple\`) : ${placard.join(', ')}.
`;

writeFileSync(join(__dirname, '..', 'docs', '2026-10-23-rangement-reserve.md'), doc);
console.log(`${lignes.length} aliments, ${nbPropose} corrections proposées`);
