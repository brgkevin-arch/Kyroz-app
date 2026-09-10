import { describe, it, expect } from 'vitest';
import { RAW_RECIPES, RECIPE_INGREDIENTS, type RawRecipe } from '../recipeData';

/**
 * INSTRUCTIONS vs LISTE D'INGRÉDIENTS — « chauffe un bouillon miso » quand la recette
 * ne sert ni bouillon ni miso.
 *
 * La règle existe depuis toujours dans le README du dossier Recette (« Un ingrédient
 * cité dans `instructions` mais absent de `ingredients[]` est invisible du dérivé
 * régime et de la liste de courses. Sel/poivre/herbes exceptés ») et rien ne la
 * vérifiait. Mesuré le 2026-09-09 : **17 recettes** la violaient, produites par des
 * vagues successives qui ne se voyaient pas les unes les autres.
 *
 * Ce que ça coûte à l'utilisateur : il lit « glacer le poulet à la sauce teriyaki »,
 * fait ses courses avec la liste que l'app génère — poulet, riz, brocoli, huile — et
 * il n'a pas de teriyaki. S'il en achète, il mange des calories que la fiche ne compte
 * pas ; s'il n'en achète pas, la recette n'est pas celle qu'on lui a promise. Et quand
 * la denrée manquante est diet-relevante (la sauce soja contient du blé), le dérivé
 * `restrictions_ok` affirme « sans gluten » sur une assiette qui n'en est pas — le
 * défaut déjà corrigé le 2026-07-29 sur rep05/rep46/rep80, revenu par une autre porte.
 *
 * Pourquoi un TEST et pas une consigne : une consigne ne survit pas à la vague
 * suivante, et ces 17 défauts ne se voyaient à la lecture d'AUCUN lot pris isolément.
 *
 * ── LE PÉRIMÈTRE, ET CE QU'IL LAISSE PASSER EXPRÈS ──
 * Ne sont PAS des denrées au sens de ce fichier : sel, poivre, herbes, épices, ail,
 * citron, vinaigre. Le catalogue ne leur donne aucun `ref`, ils ne portent pas de
 * macros et ne pèsent pas dans les courses — les citer n'est pas un mensonge. C'est la
 * même exception que celle écrite dans le README, élargie aux acides et aromates de
 * la même famille (un filet de vinaigre, c'est 1 kcal).
 *
 * ⚠️ Ce que ce fichier NE garde PAS, et il faut le savoir avant de s'y fier : il mesure
 * l'honnêteté de la LISTE DE COURSES, pas la complétude du mode d'emploi. Une recette
 * qui déclare des flocons d'avoine et écrit « ajoute le granola » sans dire de les
 * griller passe au vert — l'utilisateur a bien tout ce qu'il faut dans son panier, il
 * lui manque une étape. C'était le cas de col13, rep112 (croûtons) et col54 (compote),
 * réécrites le 2026-09-09 par jugement, pas par ce test. Contrôler ça demanderait de
 * relier un mot à un VERBE de fabrication, et une sonde aussi fragile finirait
 * désactivée : mieux vaut un garde-fou étroit qui vise juste (leçon de legumineuses.test).
 */

/** Normalise pour la comparaison : minuscules, sans accents, ligatures aplaties. */
const norm = (s: string) => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/œ/g, 'oe')
  .replace(/[’]/g, "'");

/**
 * Denrées du COMMERCE qu'aucun `ref` du catalogue ne peut fournir : elles n'existent
 * pas dans `ingredients_reference`, donc une recette qui les cite envoie forcément
 * l'utilisateur acheter un produit que sa liste de courses ne mentionne pas.
 *
 * ⚠️ Ce n'est pas une liste de mots interdits mais de PRODUITS ACHETÉS. « Poulet tikka »,
 * « PST bolognaise », « tempeh laqué » restent écrivables : ce sont des styles qu'on
 * réalise avec ce que la recette déclare. Le bouillon cube, le miso, la vinaigrette en
 * bouteille et la sauce teriyaki, non.
 */
const ACHETEES: Record<string, RegExp> = {
  bouillon: /\bbouillon/,
  miso: /\bmiso\b/,
  vinaigrette: /\bvinaigrette/,
  teriyaki: /\bteriyaki/,
  moutarde: /\bmoutarde/,
  mayonnaise: /\bmayonnaise/,
  ketchup: /\bketchup/,
  'crème fraîche': /\bcreme fraiche/,
  harissa: /\bharissa\b/,
  tapenade: /\btapenade/,
  sucre: /\bsucres?\b/,
  farine: /\bfarine\b/,
  // « beurre » seul = du beurre laitier. « beurre de cacahuète » et « beurre d'amande »
  // sont deux `ref`, traités plus bas — d'où la négation.
  beurre: /\bbeurre\b(?! de cacahuete| d')/,
};

/**
 * Les exceptions, UNE PAR UNE avec leur raison. Jamais par motif : un motif
 * (« toutes les recettes de la vague X ») rouvrirait la porte à la vague suivante.
 */
const ACHETEES_TOLEREES: Record<string, { mot: string; raison: string }> = {
  rep165: {
    mot: 'bouillon',
    raison: "le bouillon de pho est FABRIQUÉ dans la recette : oignon brûlé à sec (étape 1), "
      + "eau + carotte + gingembre + badiane + cannelle infusés 15 min (étape 2), filtré "
      + "(étape 4). Rien n'est acheté tout fait — c'est même le cœur du plat.",
  },
  pd66: {
    mot: 'farine',
    raison: "« farine de sarrasin » désigne le `ref` sarrasin, simplement moulu : même "
      + 'aliment, même pesée sèche, même ligne de courses.',
  },
  // Ajoutée au merge du 2026-09-10 : la réécriture des instructions muettes a fait
  // dire à pd67 ce que pd66 disait déjà, et l'a rendu PLUS explicite — « Mixe le
  // sarrasin seul 1 minute, jusqu'à obtenir une farine fine ». La mouture est
  // décrite dans l'étape elle-même : rien n'est acheté tout fait.
  pd67: {
    mot: 'farine',
    raison: 'la farine est MOULUE dans la recette, à partir du `ref` sarrasin que pd67 '
      + 'déclare (étape 1). Même aliment, même pesée, même ligne de courses.',
  },
};

/**
 * Denrées qui ONT un `ref` : les citer est légitime, à condition que la recette en
 * porte un. Le mot peut être honoré par plusieurs `ref` (« lait » par le lait d'amande,
 * de coco, demi-écrémé ou la boisson soja), et un `ref` peut honorer un mot qui ne
 * ressemble pas à son id : `tahini` s'appelle « Purée de sésame (tahini) », donc
 * « nappe de sauce au sésame » dit vrai. Chercher le mot dans le `ref` seul aurait
 * produit une fausse alerte sur les 10 recettes qui l'écrivent ainsi.
 */
const AVEC_REF: { mot: RegExp; refs: string[] }[] = [
  { mot: /\byaourts?\b/, refs: ['yaourt_grec', 'yaourt_soja', 'yaourt_soja_proteine'] },
  { mot: /\bskyr\b/, refs: ['skyr'] },
  { mot: /fromage blanc/, refs: ['fromage_blanc_0'] },
  { mot: /\bcottage\b/, refs: ['cottage_cheese'] },
  { mot: /fromage frais/, refs: ['cottage_cheese', 'fromage_blanc_0'] },
  { mot: /\bparmesan\b/, refs: ['parmesan'] },
  { mot: /\bfeta\b/, refs: ['feta'] },
  { mot: /\bmozzarella\b/, refs: ['mozzarella'] },
  { mot: /\blait\b/, refs: ['lait_amande', 'lait_coco', 'lait_demi_ecreme', 'boisson_soja'] },
  { mot: /creme de soja/, refs: ['creme_soja'] },
  { mot: /\bhuile\b/, refs: ['huile_olive'] },
  { mot: /\boeufs?\b/, refs: ['oeuf_entier', 'blanc_oeuf'] },
  { mot: /\bpoulet\b/, refs: ['poulet_filet'] },
  { mot: /\bdinde\b/, refs: ['dinde_escalope'] },
  { mot: /\bporc\b|filet mignon/, refs: ['porc_filet'] },
  { mot: /\bbavette\b/, refs: ['boeuf_bavette'] },
  { mot: /\bboeuf\b/, refs: ['boeuf_5', 'boeuf_bavette'] },
  { mot: /\bjambon\b/, refs: ['jambon_blanc'] },
  { mot: /\bsaumon\b/, refs: ['saumon', 'saumon_fume'] },
  { mot: /\bthon\b/, refs: ['thon_frais', 'thon_naturel'] },
  { mot: /\bcabillaud\b/, refs: ['cabillaud'] },
  { mot: /\bsardines?\b/, refs: ['sardines'] },
  { mot: /\bmaquereau\b/, refs: ['maquereau'] },
  { mot: /\bcrevettes?\b/, refs: ['crevettes'] },
  { mot: /\btofu\b/, refs: ['tofu_ferme', 'tofu_fume', 'tofu_soyeux'] },
  { mot: /\btempeh\b/, refs: ['tempeh'] },
  { mot: /\bseitan\b/, refs: ['seitan'] },
  { mot: /\bpst\b|soja texture/, refs: ['soja_texture'] },
  { mot: /\blevure\b/, refs: ['levure_maltee'] },
  { mot: /\bwhey\b/, refs: ['whey'] },
  { mot: /\btahini\b|puree de sesame|creme de sesame|sauce au sesame/, refs: ['tahini'] },
  { mot: /\bpesto\b/, refs: ['pesto'] },
  { mot: /sauce soja/, refs: ['sauce_soja'] },
  { mot: /\bchapelure\b/, refs: ['chapelure'] },
  { mot: /\bolives\b/, refs: ['olives'] },
  { mot: /\bmiel\b/, refs: ['miel'] },
  { mot: /sirop d'erable/, refs: ['sirop_erable'] },
  { mot: /\bchocolat\b/, refs: ['chocolat_noir'] },
  { mot: /\bcacao\b/, refs: ['cacao_poudre'] },
  { mot: /beurre de cacahuete|puree de cacahuete|sauce cacahuete/, refs: ['beurre_cacahuete'] },
  { mot: /beurre d'amande|puree d'amande/, refs: ['beurre_amande'] },
  { mot: /\bamandes?\b/, refs: ['amandes', 'beurre_amande', 'lait_amande'] },
  { mot: /\bnoisettes\b/, refs: ['noisettes'] },
  { mot: /\bchia\b/, refs: ['graines_chia'] },
  { mot: /graines de courge/, refs: ['graines_courge'] },
  { mot: /\bavocat\b/, refs: ['avocat'] },
  { mot: /\bbetterave\b/, refs: ['betterave'] },
  { mot: /\bchataignes?\b/, refs: ['chataigne'] },
  { mot: /\bdattes?\b/, refs: ['dattes'] },
  { mot: /\bkiwis?\b/, refs: ['kiwi'] },
  { mot: /\bmangue\b/, refs: ['mangue'] },
  { mot: /\bananas\b/, refs: ['ananas'] },
  { mot: /\bbanane\b/, refs: ['banane'] },
  { mot: /\bmyrtilles\b/, refs: ['myrtilles'] },
  { mot: /\bframboises\b/, refs: ['framboises'] },
  { mot: /fruits rouges/, refs: ['fruits_rouges', 'framboises', 'myrtilles'] },
  { mot: /\braisins?\b/, refs: ['raisins'] },
  { mot: /patates? douces?/, refs: ['patate_douce'] },
  { mot: /\bquinoa\b/, refs: ['quinoa'] },
  { mot: /\bboulgour\b/, refs: ['boulgour'] },
  { mot: /\bpolenta\b/, refs: ['polenta'] },
  { mot: /\bmillet\b/, refs: ['millet'] },
  { mot: /\bsarrasin\b/, refs: ['sarrasin'] },
  { mot: /\bsemoule\b/, refs: ['semoule_couscous'] },
  { mot: /\briz\b/, refs: ['riz_basmati', 'riz_complet', 'nouilles_riz', 'galette_riz'] },
  { mot: /\bflocons\b/, refs: ['flocons_avoine'] },
  { mot: /\bpates\b/, refs: ['pates_completes', 'pates_semoule'] },
  { mot: /\bnouilles\b/, refs: ['nouilles_riz', 'nouilles_completes'] },
  { mot: /\bpita\b/, refs: ['pain_pita_complet'] },
  { mot: /\btortilla\b|\bwrap\b/, refs: ['tortilla_complete', 'wrap_sans_gluten'] },
  { mot: /\blentilles\b/, refs: ['lentilles_corail', 'lentilles_cuites', 'lentilles_vertes'] },
  { mot: /pois chiches/, refs: ['pois_chiches', 'pois_chiches_conserve'] },
  { mot: /pois casses/, refs: ['pois_casses'] },
  { mot: /\bfeves\b/, refs: ['feves'] },
  { mot: /petits pois/, refs: ['petits_pois'] },
  { mot: /haricots verts/, refs: ['haricots_verts'] },
  { mot: /\bratatouille\b/, refs: ['ratatouille'] },
  { mot: /\broquette\b/, refs: ['roquette'] },
  { mot: /\bbrocolis?\b/, refs: ['brocoli'] },
  { mot: /\basperges\b/, refs: ['asperges'] },
  { mot: /chou-fleur/, refs: ['chou_fleur'] },
  { mot: /\bpoivrons?\b/, refs: ['poivron', 'legumes_wok'] },
  { mot: /\bcourgettes?\b/, refs: ['courgette'] },
  { mot: /\bconcombre\b/, refs: ['concombre'] },
  { mot: /\bcarottes?\b/, refs: ['carotte', 'legumes_wok'] },
  { mot: /\boignon\b/, refs: ['oignon'] },
  { mot: /\bepinards\b/, refs: ['epinards'] },
  { mot: /\bchampignons\b/, refs: ['champignons'] },
  { mot: /\btomates?\b/, refs: ['tomate', 'tomate_concassee'] },
  // Fabriqués à partir d'un `ref` déclaré : la liste de courses reste complète, seule
  // l'étape qui les fabrique doit exister — et c'est ce que la réécriture du 2026-09-09
  // a rétabli sur col13 (granola), rep112 (croûtons) et col54 (compote).
  { mot: /\bgranola\b/, refs: ['flocons_avoine'] },
  { mot: /\bcroutons?\b/, refs: ['pain_complet', 'pain_seigle', 'pain_sans_gluten', 'pain_pita_complet'] },
  { mot: /compote de/, refs: ['pomme'] },
  { mot: /\bhoumous\b/, refs: ['pois_chiches', 'pois_chiches_conserve'] },
  { mot: /\btzatziki\b/, refs: ['yaourt_grec', 'yaourt_soja', 'yaourt_soja_proteine'] },
  { mot: /\bfalafels?\b/, refs: ['falafel', 'pois_chiches', 'pois_chiches_conserve'] },
];

/**
 * Mots gardés dans le lexique alors que le catalogue ne les écrit PLUS aujourd'hui.
 * Le témoin de couverture ci-dessous exige que tout autre mot soit réellement employé :
 * sans cette liste, un lexique qui décroche du vocabulaire réel passerait au vert sans
 * avoir rien lu. Une par une, avec leur raison — jamais par motif.
 */
const EN_VEILLE: Record<string, string> = {
  '\\bporc\\b|filet mignon': "le `ref` porc_filet existe dans la table mais AUCUNE des 512 "
    + 'recettes ne le sert : le mot est là pour la première qui le fera.',
  '\\bcroutons?\\b': "plus aucune instruction ne l'écrit depuis la réécriture de rep112 "
    + '(2026-09-09), qui taille et fait dorer le pain complet déclaré au lieu de servir des '
    + 'croûtons venus de nulle part.',
  'compote de': "plus aucune instruction ne l'écrit depuis la réécriture de col54 (2026-09-09), "
    + 'qui cuit et écrase la pomme déclarée au lieu de demander un pot de compote.',
};

/** Exceptions du second contrôle, une par une, avec leur raison. */
const AVEC_REF_TOLEREES: Record<string, { mot: string; raison: string }> = {
  rep36: {
    mot: 'tortilla',
    raison: "« tortilla » désigne ici la TORTILLA ESPAGNOLE — l'omelette aux pommes de terre "
      + "que la recette cuit (rep36 « Tortilla pommes de terre – jambon »), pas une galette de blé.",
  },
};

interface Alerte { id: string; nom: string; mot: string; etape: string }

function sonde(recettes: RawRecipe[]): Alerte[] {
  const alertes: Alerte[] = [];
  for (const r of recettes) {
    const refs = new Set(r.ingredients.map((i) => i.ref));
    for (const etape of r.instructions) {
      const t = norm(etape);
      for (const [mot, re] of Object.entries(ACHETEES)) {
        if (!re.test(t)) continue;
        if (ACHETEES_TOLEREES[r.id]?.mot === mot) continue;
        alertes.push({ id: r.id, nom: r.name, mot, etape });
      }
      for (const { mot, refs: honorants } of AVEC_REF) {
        if (!mot.test(t)) continue;
        if (honorants.some((k) => refs.has(k))) continue;
        const nom = mot.source;
        if (AVEC_REF_TOLEREES[r.id] && nom.includes(AVEC_REF_TOLEREES[r.id].mot)) continue;
        alertes.push({ id: r.id, nom: r.name, mot: nom, etape });
      }
    }
  }
  return alertes;
}

const decrire = (a: Alerte[]) => a
  .map((x) => `${x.id} « ${x.nom} » cite « ${x.mot} » : ${x.etape}`)
  .join('\n  ');

describe('instructions — aucune recette ne cite une denrée qu’elle ne sert pas', () => {
  it('aucune instruction n’envoie acheter un produit absent de la liste', () => {
    const alertes = sonde(RAW_RECIPES);
    expect(alertes, `denrée citée mais pas servie :\n  ${decrire(alertes)}`).toEqual([]);
  });

  // ── TÉMOIN ────────────────────────────────────────────────────────────────
  // Un garde-fou qu'on n'a jamais vu rougir ne garde rien. Ces deux recettes
  // synthétiques rejouent les deux défauts réels du 2026-09-09 : si la sonde
  // cesse de mesurer (regex cassée, normalisation qui avale les accents,
  // lexique vidé), ce test tombe AVANT que le catalogue ne se dégrade en silence.
  it('la sonde attrape encore un bouillon acheté et un yaourt jamais acheté', () => {
    const cobayes = [
      {
        ...RAW_RECIPES[0], id: 'test01', name: 'Témoin bouillon',
        ingredients: [{ ref: 'riz_basmati', qty: 80, macro_role: 'carb' as const, scalable: true }],
        instructions: ['Nacrer le riz, mouiller au bouillon louche par louche.'],
      },
      {
        ...RAW_RECIPES[0], id: 'test02', name: 'Témoin yaourt',
        ingredients: [{ ref: 'poulet_filet', qty: 150, macro_role: 'protein' as const, scalable: true }],
        instructions: ['Mélanger le poulet grillé et la sauce yaourt-citron.'],
      },
    ];
    const trouvees = sonde(cobayes);
    expect(trouvees.map((a) => `${a.id}/${a.mot}`)).toEqual(['test01/bouillon', 'test02/\\byaourts?\\b']);
  });

  // ── TÉMOIN DE COUVERTURE ──────────────────────────────────────────────────
  // Deuxième façon pour une sonde de ne plus rien mesurer : viser des mots qui
  // n'existent plus. Si le lexique décrochait du vocabulaire réel du catalogue,
  // le test principal passerait au vert sans avoir rien lu.
  it('le lexique lit vraiment les instructions du catalogue', () => {
    const textes = RAW_RECIPES.flatMap((r) => r.instructions).map(norm);
    const muets = AVEC_REF
      .filter(({ mot }) => !textes.some((t) => mot.test(t)))
      .map(({ mot }) => mot.source)
      .filter((m) => !EN_VEILLE[m]);
    expect(muets, `mot du lexique introuvable dans les 512 recettes — soit tu viens de casser\n`
      + `la sonde, soit le mot a disparu du catalogue et il faut le classer dans EN_VEILLE\n`
      + `avec sa raison :\n  ${muets.join('\n  ')}`).toEqual([]);
  });

  // Le miroir : une mise en veille se périme quand le mot revient. Sans ce contrôle,
  // EN_VEILLE deviendrait un cimetière où l'on range ce qui gêne.
  it('aucun mot mis en veille n’est en fait employé par le catalogue', () => {
    const textes = RAW_RECIPES.flatMap((r) => r.instructions).map(norm);
    const revenus = AVEC_REF
      .filter(({ mot }) => EN_VEILLE[mot.source] && textes.some((t) => mot.test(t)))
      .map(({ mot }) => mot.source);
    expect(revenus, `mot en veille pourtant employé — sors-le d'EN_VEILLE :\n  ${revenus.join('\n  ')}`).toEqual([]);
  });

  it('tout `ref` cité par le lexique existe dans la table des ingrédients', () => {
    const inconnus = AVEC_REF.flatMap(({ refs }) => refs).filter((k) => !RECIPE_INGREDIENTS[k]);
    expect(inconnus, `ref inexistant : ${inconnus.join(', ')}`).toEqual([]);
  });

  it('chaque exception vise une recette réelle et le mot qu’elle prétend excuser', () => {
    const fautes: string[] = [];
    for (const [id, { mot }] of [...Object.entries(ACHETEES_TOLEREES), ...Object.entries(AVEC_REF_TOLEREES)]) {
      const r = RAW_RECIPES.find((x) => x.id === id);
      if (!r) { fautes.push(`${id} : recette inexistante`); continue; }
      if (!r.instructions.some((s) => norm(s).includes(norm(mot)))) {
        fautes.push(`${id} : n'écrit plus « ${mot} » — l'exception est périmée, supprime-la`);
      }
    }
    expect(fautes, `exception morte :\n  ${fautes.join('\n  ')}`).toEqual([]);
  });
});
