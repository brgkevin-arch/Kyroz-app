/**
 * LA DURÉE DE VIE DE CHAQUE ALIMENT, SOURCÉE (2026-10-24 : « je veux une table sourcée et plus
 * précise pour les DLC »).
 *
 * Écrit `docs/2026-10-24-duree-de-vie.md` DEPUIS LE CODE (`lib/dureeDeVie.ts`) : ce que l'app
 * retient pour chaque aliment périssable du catalogue, avec ses sources. Ne pas éditer la fiche
 * à la main : corriger la table, puis relancer.
 *
 * Lancer : `npx tsx scripts/gen-duree-de-vie.ts` (pas de ligne `npm run`, cf. CLAUDE.md §2).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS } from '../lib/recipeData';
import { categorize } from '../lib/pantry';
import { DUREE_DE_VIE, FERME_PAR_DEFAUT, SOURCES_DUREE, SURGELES, tientJusquau, type Jours } from '../lib/dureeDeVie';

const RAYON: Record<string, string> = {
  viandes: 'Viandes, poissons et similis', laitiers: 'Œufs et produits laitiers', autres: 'Tofu, tempeh, seitan et traiteur',
  'légumes': 'Fruits et légumes', 'féculents': 'Féculents',
};
const ORDRE = ['viandes', 'laitiers', 'autres', 'légumes', 'féculents'];

const jours = (d: Jours | null | undefined, vide: string) => {
  if (!d) return vide;
  const [a, b] = d;
  const u = (n: number) => (n === 0 ? 'le jour même' : n === 1 ? '1 jour' : `${n} jours`);
  if (a === b) return u(a);
  return a === 0 ? `le jour même à ${u(b)}` : `${a} à ${b} jours`;
};
const mois = (d?: Jours) => (!d ? '' : d[0] === d[1] ? `${d[0]} mois` : `${d[0]} à ${d[1]} mois`);
const nom = (ref: string) => RECIPE_INGREDIENTS[ref]?.name ?? ref;

const lignes: string[] = [];
const par = new Map<string, string[]>();
for (const [ref, d] of Object.entries(DUREE_DE_VIE)) {
  const rayon = categorize(nom(ref));
  // Ce que le moteur applique (`tientJusquau`), dit comme une règle : jours après les courses.
  const ferme = tientJusquau(d, Infinity);
  const apres = (n: number) => (n === 0 ? 'le jour des courses' : `${n} j après les courses`);
  const retenu = !d.entame ? apres(ferme)
    : d.entame[0] >= ferme ? `${apres(ferme)}, entamé ou non`
    : `${apres(ferme)}${d.ferme ? '' : ' (défaut non sourcé)'} ; entamé, ${d.entame[0] === 0 ? 'le jour même' : `${d.entame[0]} j`}`;
  const congel = d.congeler === true ? `oui, ${mois(d.mois)}` : d.congeler === false ? 'non' : 'non documenté';
  const ligne = `| ${nom(ref)} | ${jours(d.ferme, 'l\'étiquette')} | ${jours(d.entame, '—')} | **${retenu}** | ${congel} | ${d.sources.map((n) => `[${n}]`).join('')} | ${d.note ?? ''} |`;
  par.set(rayon, [...(par.get(rayon) ?? []), ligne]);
}

lignes.push(
  '# La durée de vie de chaque aliment, sourcée (2026-10-24)',
  '',
  '> Demande du fondateur : *« je veux que l\'user ne jette rien »*, avec *« une table sourcée et plus',
  '> précise pour les DLC »*, et sa part : *« il congèle ce qu\'il peut, on ne pourra pas tout sauver »*.',
  '> ⚠️ **Généré depuis le code** par `npx tsx scripts/gen-duree-de-vie.ts` (`lib/dureeDeVie.ts`).',
  '> Ne pas éditer à la main. **En attente de validation par le fondateur.**',
  '',
  '## Les règles',
  '',
  '- 🔴 **La DLC imprimée fait toujours foi.** Elle est fixée par le fabricant : par exemple 10 jours de',
  '  vie au total pour un filet de poulet sous atmosphère [12]. Mais l\'app ne sait pas ce qu\'il en',
  '  reste le jour de l\'achat : elle ne lit pas l\'étiquette.',
  '- L\'app retient donc la **borne basse** des guides de conservation. Elle compte en jours depuis',
  '  les courses, emballage fermé, et depuis le premier repas qui entame l\'aliment. Elle ne doit jamais',
  '  compter sur un aliment qui a pu tourner.',
  `- Quand aucune source publique ne donne la durée d'un emballage fermé (similis, tempeh, seitan,`,
  `  betterave sous vide, falafels), c'est l'étiquette qui le dit. L'app applique alors **${FERME_PAR_DEFAUT} jours**, une`,
  '  prudence **non sourcée**, signalée « défaut » dans le tableau.',
  '- La congélation : ce que les sources disent possible à la maison, et pour combien de mois de qualité',
  '  (à −18 °C, la sécurité ne s\'arrête pas [2]). « Non documenté » = aucune source trouvée : l\'app ne',
  '  le compte pas comme congelable.',
  `- Vendus **surgelés**, donc jamais un reste à sauver : ${SURGELES.map(nom).join(', ')}.`,
  '',
);
for (const r of ORDRE) {
  const l = par.get(r);
  if (!l) continue;
  lignes.push(`## ${RAYON[r]} (${l.length})`, '', '| Aliment | Au frigo, fermé | Entamé | Kyroz retient | Congélation | Sources | Note |', '|---|---|---|---|---|---|---|', ...l.sort(), '');
}
lignes.push('## Sources', '', ...Object.entries(SOURCES_DUREE).map(([n, t]) => `- [${n}] ${t}`), '');

writeFileSync(join(__dirname, '..', 'docs', '2026-10-24-duree-de-vie.md'), lignes.join('\n'));
console.log(`docs/2026-10-24-duree-de-vie.md — ${Object.keys(DUREE_DE_VIE).length} aliments, ${Object.keys(SOURCES_DUREE).length} sources`);
