import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { methodologie, nb, millier } from '../methodologie';
import {
  MIN_AGE, MIN_KCAL, EA_HARD_FLOOR, EA_OPTIMAL, LOW_EA_BUDGET_WEEKS,
  HIGH_ADIPOSITY_PCT, DIET_BREAK_AFTER_WEEKS, BF_CHART_MAX,
} from '../safety';
import { NEAT_PAL, FAT_MIN_PER_KG_BW, PROTEIN_MIN_PER_KG_FFM, PROTEIN_MAX_PER_KG_FFM } from '../tdee';
import { MAX_DEFICIT_TDEE_RATIO } from '../datedGoal';

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const TEXTE = methodologie().flatMap((s) => s.paragraphes).join('\n');

// Cet écran est une AFFIRMATION SUR LE CODE lue par le relecteur Apple (1.4.1). Le
// risque n'est pas qu'il soit mal écrit, c'est qu'il devienne FAUX sans que personne
// ne le rouvre — le dépôt a déjà mesuré ça sur les bulles de visite guidée (3 sur 5
// fausses, chacune vraie le jour de son écriture). Ces tests comparent donc chaque
// valeur citée à sa source, et interdisent le chiffre en dur.
describe('Méthodologie & sources — les chiffres viennent du moteur', () => {
  it('cite les planchers caloriques tels que le moteur les applique', () => {
    expect(TEXTE).toContain(millier(MIN_KCAL.male));
    expect(TEXTE).toContain(millier(MIN_KCAL.female));
    expect(TEXTE).toContain(`${EA_HARD_FLOOR} kcal par kg de masse maigre`);
    expect(TEXTE).toContain(`${EA_OPTIMAL} kcal par kg de masse maigre`);
    expect(TEXTE).toContain(`${LOW_EA_BUDGET_WEEKS} semaines cumulées`);
  });

  it('cite le cap de déficit et la pause à la maintenance', () => {
    expect(TEXTE).toContain(`${Math.round(MAX_DEFICIT_TDEE_RATIO * 100)} %`);
    expect(TEXTE).toContain(`${DIET_BREAK_AFTER_WEEKS} semaines de déficit`);
  });

  it('cite les bornes de macros et le seuil de provenance du %MG', () => {
    expect(TEXTE).toContain(nb(FAT_MIN_PER_KG_BW));
    expect(TEXTE).toContain(nb(PROTEIN_MIN_PER_KG_FFM));
    expect(TEXTE).toContain(nb(PROTEIN_MAX_PER_KG_FFM));
    expect(TEXTE).toContain(`${BF_CHART_MAX.male} %`);
    expect(TEXTE).toContain(`${BF_CHART_MAX.female} %`);
  });

  it('cite la table d\'activité et l\'âge minimum', () => {
    expect(TEXTE).toContain(nb(NEAT_PAL.desk));
    expect(TEXTE).toContain(nb(NEAT_PAL.physical));
    expect(TEXTE).toContain(`${MIN_AGE} ans`);
  });

  it('cite le seuil d\'adiposité qui retire les planchers dérivés', () => {
    expect(TEXTE).toContain(`${HIGH_ADIPOSITY_PCT.male} %`);
    expect(TEXTE).toContain(`${HIGH_ADIPOSITY_PCT.female} %`);
  });

  // 🔴 LE GARDE-FOU CENTRAL. Sans lui, la façon la plus naturelle d'ajouter une ligne
  // — taper le nombre — passerait, et la page périmerait au premier `ENGINE_REV` sans
  // qu'aucun test ne bouge.
  //
  // ⚠️ Il mesure le TEXTE RENDU, pas la syntaxe du fichier. Une première version
  // cherchait les littéraux chiffrés dans la source : elle accusait les ANNÉES des
  // références (« 1990;51(2):241-247 »), qu'une citation doit évidemment porter, et
  // se faisait piéger par les apostrophes françaises qui coupent ses chaînes. ➡️ On
  // retire du texte toute valeur qui VIENT d'une constante, et on exige qu'il ne
  // reste plus un seul chiffre. Ce qui reste est, par construction, un nombre que
  // personne ne tient à jour.
  it('aucun chiffre du contenu n\'échappe à une constante du moteur', () => {
    const paras = methodologie()
      .flatMap((s) => s.paragraphes)
      // L'attribution Ciqual porte ses propres nombres (millésime, version de
      // licence) et a déjà sa source unique dans `lib/foods.ts` : on ne la réécrit
      // pas, donc on ne la mesure pas ici.
      .filter((p) => !p.includes('Ciqual'))
      .join('\n');

    const issusDuMoteur = [
      millier(MIN_KCAL.male), millier(MIN_KCAL.female),
      nb(NEAT_PAL.desk), nb(NEAT_PAL.physical),
      nb(PROTEIN_MIN_PER_KG_FFM), nb(PROTEIN_MAX_PER_KG_FFM), nb(FAT_MIN_PER_KG_BW),
      String(BF_CHART_MAX.female), String(BF_CHART_MAX.male),
      String(HIGH_ADIPOSITY_PCT.female), String(HIGH_ADIPOSITY_PCT.male),
      String(EA_OPTIMAL), String(EA_HARD_FLOOR),
      String(Math.round(MAX_DEFICIT_TDEE_RATIO * 100)),
      String(MIN_AGE), String(LOW_EA_BUDGET_WEEKS), String(DIET_BREAK_AFTER_WEEKS),
    ];

    // Deux nombres n'ont PAS de constante exportée, et c'est assumé — ils sont
    // déclarés ici pour qu'ils restent visibles plutôt que tolérés en silence :
    //  · 18,5 — la borne OMS du sous-poids, écrite dans `deficitBlocked` ;
    //  · 5 — les ±5 points d'incertitude d'un %MG lu sur une silhouette (mesure
    //    consignée en CLAUDE.md §6, ce n'est pas un réglage du moteur).
    const exceptions = ['18,5', '5'];

    // Du plus long au plus court, sinon « 5 » mangerait le début de « 500 ».
    const aRetirer = [...issusDuMoteur, ...exceptions].sort((a, b) => b.length - a.length);
    let reste = paras;
    for (const v of aRetirer) reste = reste.split(v).join('');

    const orphelins = reste.match(/\d+/g) ?? [];
    expect(
      orphelins,
      `chiffres sans source dans le contenu : ${orphelins.join(' · ')} — les lire depuis une constante, ou les déclarer en exception`,
    ).toEqual([]);
  });

  // 🔴 LE TROU QUE LE TEST PRÉCÉDENT NE VOIT PAS, et il a fallu une mutation pour le
  // trouver. Retirer du texte les valeurs venues des constantes ne distingue pas une
  // INTERPOLATION d'un littéral de même valeur : « 1 500 » tapé à la main passerait,
  // puisque c'est exactement ce qu'on retire. Il resterait juste jusqu'au jour où la
  // constante bouge — le défaut qu'on prétend interdire.
  // ➡️ On exige donc que le NOM de chaque constante apparaisse dans la source. Un
  // chiffre substitué à son interpolation fait disparaître le nom, et rougir ici.
  it('chaque valeur est LUE, pas retapée — les constantes sont nommées dans la source', () => {
    const src = sansCommentaires(lire('lib/methodologie.ts'));
    const noms = [
      'MIN_KCAL.male', 'MIN_KCAL.female', 'EA_HARD_FLOOR', 'EA_OPTIMAL',
      'LOW_EA_BUDGET_WEEKS', 'MAX_DEFICIT_TDEE_RATIO', 'DIET_BREAK_AFTER_WEEKS',
      'FAT_MIN_PER_KG_BW', 'PROTEIN_MIN_PER_KG_FFM', 'PROTEIN_MAX_PER_KG_FFM',
      'BF_CHART_MAX.male', 'BF_CHART_MAX.female', 'NEAT_PAL.desk', 'NEAT_PAL.physical',
      'HIGH_ADIPOSITY_PCT.male', 'HIGH_ADIPOSITY_PCT.female', 'MIN_AGE',
      'CIQUAL_ATTRIBUTION',
    ];
    const absents = noms.filter((n) => !src.includes(n));
    expect(
      absents,
      `ces constantes ne sont plus lues par la page : ${absents.join(' · ')} — un chiffre a probablement été retapé à leur place`,
    ).toEqual([]);
  });

  it('l\'écran ne contient aucun chiffre non plus — il ne fait que rendre', () => {
    const ecran = sansCommentaires(lire('app/methodologie.tsx'));
    const dansDuTexte = ecran.match(/>[^<>{}]*\d[^<>{}]*</g) ?? [];
    expect(dansDuTexte, `texte chiffré dans l'écran : ${dansDuTexte.join(' · ')}`).toEqual([]);
  });

  it('chaque source est complète — pas de référence à moitié citée', () => {
    const sources = methodologie().flatMap((s) => s.sources ?? []);
    expect(sources.length).toBeGreaterThanOrEqual(8);
    for (const src of sources) {
      expect(src.auteurs.length, `auteurs manquants : ${src.titre}`).toBeGreaterThan(3);
      expect(src.titre.length).toBeGreaterThan(10);
      expect(src.publication.length, `publication manquante : ${src.titre}`).toBeGreaterThan(5);
    }
  });

  it('les sections qui affirment un CHIFFRE portent des sources', () => {
    // Une section peut légitimement ne pas en avoir (le cadrage, les choix Kyroz).
    // Mais les trois qui décrivent le calcul doivent en porter : c'est exactement ce
    // qu'Apple 1.4.1 demande, et c'est ce que le rejet type reproche.
    const parTitre = new Map(methodologie().map((s) => [s.titre, s]));
    for (const titre of ['La dépense énergétique (TDEE)', 'La répartition des macronutriments', 'Les limites de sécurité']) {
      const sec = parTitre.get(titre);
      expect(sec, `section « ${titre} » introuvable — titre renommé sans mettre ce test à jour ?`).toBeDefined();
      expect(sec!.sources?.length ?? 0, `« ${titre} » n'a aucune source`).toBeGreaterThan(0);
    }
  });

  it('le disclaimer et l\'absence de validation diététique sont dits', () => {
    expect(TEXTE).toContain('n\'est pas un dispositif médical');
    expect(TEXTE).toMatch(/ne diagnostique, ne traite, ne guérit ni ne prévient/);
    // `validated_by_dietitian` est false en dur : aucun écran n'a le droit de laisser
    // croire l'inverse (CLAUDE.md §6).
    expect(TEXTE).toMatch(/n'ont pas été validées par un diététicien/);
  });

  it('la page est atteignable depuis les réglages', () => {
    const reglages = sansCommentaires(lire('components/ReglagesSheet.tsx'));
    expect(reglages).toContain('/methodologie');
    expect(reglages).toContain('Méthodologie & sources');
  });

  it('aucun émoji (CLAUDE.md §8)', () => {
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
    expect(EMOJI.test(TEXTE)).toBe(false);
    for (const s of methodologie()) expect(EMOJI.test(s.titre)).toBe(false);
  });
});
