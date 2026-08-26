import { describe, it, expect, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAjouts, saveAjouts, SANS_QUANTITE,
  normaliserNom, memeNom, trouverArticle, creerAjout, ajouterAjout, retirerAjout,
  basculerAjout, cocherTousAjouts, fusionner, nettoyerAjouts, ajoutsApresCloture,
} from '../shoppingAjouts';
import { appliquerEcartes } from '../shoppingRemoved';
import { formatQuantity } from '../units';
import { ShoppingItem } from '../types';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// La liste de courses est DÉRIVÉE : tout ce qu'elle propose vient du plan moins la
// réserve, et elle se RECALCULE — son cache est effacé par `plan.tsx` à chaque
// `persistPlan`, par « tirer pour rafraîchir » et par « Courses terminées ».
// Y glisser un article tapé au clavier, c'est le poser sur quelque chose qui va
// être reconstruit : il disparaîtrait quelques minutes plus tard, et **personne ne
// peut deviner ce que l'utilisateur avait écrit**. C'est la différence avec un
// écarté (`shoppingRemoved.ts`), que la liste sait toujours refaire.
//
// Ce que ce fichier tient, et qui ne se voit pas en lisant l'écran :
//   · un NOM = une LIGNE — le nom est la clé de la liste, la cible du cochage et
//     l'identité d'un écarté ; deux homonymes et cocher l'un coche l'autre ;
//   · les ajouts SURVIVENT au recalcul, mais se SOLDENT à la clôture — sinon rien
//     ne les ferait jamais partir, même achetés ;
//   · un ajout que le plan finit par proposer lui-même ne reste pas tapi derrière
//     lui pour ressurgir des semaines plus tard.

const derive = (name: string, category: ShoppingItem['category'] = 'autres'): ShoppingItem => ({
  name, quantity: 500, unit: 'g', category, checked: false,
});

describe('Le nom : ce qui s’affiche, et ce qui compare', () => {
  it('nettoie la saisie sans écraser la casse voulue', () => {
    expect(normaliserNom('  café   moulu ')).toBe('Café moulu');
    expect(normaliserNom('PQ')).toBe('PQ');           // pas de minuscules forcées
    expect(normaliserNom('   ')).toBe('');
  });

  it('compare sans casse ni accents — sinon « Poêlée » et « poelee » feraient deux lignes', () => {
    expect(memeNom('Poêlée', 'poelee')).toBe(true);
    expect(memeNom('Œufs', 'oeufs')).toBe(true);
    expect(memeNom('Riz', 'Riz complet')).toBe(false);
  });

  it('le rayon vient de `categorize`, la même fonction que le plan et la réserve', () => {
    expect(creerAjout('Blanc de poulet').category).toBe('viandes');
    expect(creerAjout('Banane').category).toBe('légumes');
    expect(creerAjout('Sopalin').category).toBe('autres');
  });
});

describe('La quantité est FACULTATIVE', () => {
  it('sans quantité, l’article vaut SANS_QUANTITE — pas « un peu », pas « 1 »', () => {
    const a = creerAjout('Café');
    expect(a.quantity).toBe(SANS_QUANTITE);
    expect(a.manuel).toBe(true);
    expect(a.checked).toBe(false);
  });

  it('une quantité négative ou absurde retombe sur SANS_QUANTITE', () => {
    expect(creerAjout('Café', -3).quantity).toBe(SANS_QUANTITE);
  });

  // 🔴 C'est la RAISON du garde posé dans `courses.tsx` et `ShoppingHistory.tsx` :
  // sans lui, l'écran affiche « 0 g » — un chiffre faux, à la place d'un blanc
  // honnête, sur une app dont la règle est qu'un chiffre affiché est un chiffre vrai.
  it('`formatQuantity` ne sait PAS taire un zéro — d’où le garde dans les écrans', () => {
    expect(formatQuantity('Café', SANS_QUANTITE, 'g')).toBe('0 g');
  });
});

describe('Un nom = une ligne', () => {
  it('n’ajoute jamais deux fois le même nom', () => {
    const un = ajouterAjout([], creerAjout('Café'));
    const deux = ajouterAjout(un, creerAjout('café'));
    expect(deux).toHaveLength(1);
    expect(deux).toBe(un);       // rien n'a bougé → même référence
  });

  it('un ajout homonyme d’un article du plan ne double PAS la ligne', () => {
    const fusion = fusionner([derive('Riz', 'féculents')], [creerAjout('riz')]);
    expect(fusion).toHaveLength(1);
    // C'est l'article du PLAN qui reste : lui porte une quantité calculée.
    expect(fusion[0].quantity).toBe(500);
    expect(fusion[0].manuel).toBeUndefined();
  });

  it('les ajouts se posent APRÈS les articles du plan, sans les toucher', () => {
    const plan = [derive('Riz'), derive('Skyr')];
    const fusion = fusionner(plan, [creerAjout('Café')]);
    expect(fusion.map((i) => i.name)).toEqual(['Riz', 'Skyr', 'Café']);
    expect(fusionner(plan, [])).toBe(plan);
  });

  it('trouve un article déjà présent quelle que soit la casse — c’est ce qui évite le doublon', () => {
    const tous = fusionner([derive('Riz')], [creerAjout('Café')]);
    expect(trouverArticle(tous, 'café')?.name).toBe('Café');
    expect(trouverArticle(tous, 'RIZ')?.name).toBe('Riz');
    expect(trouverArticle(tous, 'Thé')).toBeUndefined();
  });
});

describe('Le cochage écrit dans le BON stockage', () => {
  it('coche, décoche, et ne touche pas aux voisins', () => {
    const ajouts = [creerAjout('Café'), creerAjout('Pain')];
    const coches = basculerAjout(ajouts, 'café', true);
    expect(coches.find((a) => a.name === 'Café')!.checked).toBe(true);
    expect(coches.find((a) => a.name === 'Pain')!.checked).toBe(false);
  });

  it('« Tout cocher » et « Réinitialiser » emportent aussi les ajouts', () => {
    const ajouts = [creerAjout('Café'), creerAjout('Pain')];
    expect(cocherTousAjouts(ajouts, true).every((a) => a.checked)).toBe(true);
    expect(cocherTousAjouts(ajouts, false)).toBe(ajouts);   // déjà décochés
  });

  it('retirer un ajout le supprime pour de bon', () => {
    const ajouts = [creerAjout('Café'), creerAjout('Pain')];
    expect(retirerAjout(ajouts, 'CAFÉ').map((a) => a.name)).toEqual(['Pain']);
  });
});

describe('Le nettoyage — ce qui ne doit pas dormir dans la clé', () => {
  it('solde un ajout que le plan propose désormais lui-même', () => {
    const ajouts = [creerAjout('Riz'), creerAjout('Café')];
    const tenus = nettoyerAjouts(ajouts, [derive('Riz', 'féculents')]);
    expect(tenus.map((a) => a.name)).toEqual(['Café']);
  });

  it('ne réécrit rien quand il n’y a rien à solder', () => {
    const ajouts = [creerAjout('Café')];
    expect(nettoyerAjouts(ajouts, [derive('Riz')])).toBe(ajouts);
    expect(nettoyerAjouts([], [derive('Riz')])).toEqual([]);
  });

  // Le défaut que ce nettoyage ferme : l'ajout resterait invisible derrière la
  // ligne du plan (cf. `fusionner`), puis reviendrait tout seul le jour où le plan
  // cesse d'en demander — sans qu'aucun geste ne l'explique.
  it('sans lui, un ajout masqué ressurgirait au changement de plan', () => {
    const ajouts = [creerAjout('Riz')];
    expect(fusionner([derive('Riz')], ajouts)).toHaveLength(1);       // masqué
    expect(fusionner([], ajouts)).toHaveLength(1);                    // il revient
    expect(fusionner([], nettoyerAjouts(ajouts, [derive('Riz')]))).toHaveLength(0);
  });
});

describe('La clôture — le seul geste qui solde un ajout', () => {
  const sortie = () => [
    { ...creerAjout('Café'), checked: true },     // acheté
    { ...creerAjout('Pain'), checked: false },    // pas pris
  ];

  it('ce qui est coché quitte la liste : il est acheté', () => {
    expect(ajoutsApresCloture(sortie(), 'garder').map((a) => a.name)).toEqual(['Pain']);
  });

  it('ce qui reste repart DÉCOCHÉ — une nouvelle sortie commence à zéro', () => {
    const suite = ajoutsApresCloture([{ ...creerAjout('Pain'), checked: false }], 'garder');
    expect(suite[0].checked).toBe(false);
  });

  it('« les retirer » vide tout : les achetés sont partis, les autres sont refusés', () => {
    expect(ajoutsApresCloture(sortie(), 'retirer')).toEqual([]);
  });

  // 🔴 L'invariant qui justifie tout le module : rien d'autre ne les fait partir.
  // Un article du plan disparaît parce que la liste se RECALCULE ; un ajout manuel
  // ne se recalcule pas, donc sans cette étape il resterait à l'écran pour toujours.
  it('un ajout acheté ne survit PAS à la clôture', () => {
    const apres = ajoutsApresCloture(sortie(), 'garder');
    expect(trouverArticle(apres, 'Café')).toBeUndefined();
  });
});

describe('Le cycle complet, tel que l’écran l’enchaîne', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('un ajout traverse un rafraîchissement, puis se solde une fois acheté', async () => {
    // ① On note « café » sur une liste issue du plan.
    let ajouts = ajouterAjout([], creerAjout('Café'));
    await saveAjouts(ajouts);

    // ② Tirer pour rafraîchir : le cache de la liste est vidé, les écartés aussi
    //    — l'ajout, lui, ne se reconstruit depuis rien, donc il RESTE.
    ajouts = cocherTousAjouts(await loadAjouts(), false);
    expect(ajouts.map((a) => a.name)).toEqual(['Café']);
    expect(ajouts[0].manuel).toBe(true);          // le drapeau survit au stockage

    // ③ Il s'affiche avec les articles du plan, et un écarté ne l'emporte pas.
    const visibles = appliquerEcartes(fusionner([derive('Riz')], ajouts), ['Riz']);
    expect(visibles.map((i) => i.name)).toEqual(['Café']);

    // ④ Coché en magasin, puis « Courses terminées » : il quitte la liste.
    ajouts = basculerAjout(ajouts, 'Café', true);
    await saveAjouts(ajoutsApresCloture(ajouts, 'garder'));
    expect(await loadAjouts()).toEqual([]);
  });

  it('une clé absente ou corrompue rend une liste vide, jamais une erreur', async () => {
    expect(await loadAjouts()).toEqual([]);
    await AsyncStorage.setItem('@kyroz:shopping:ajouts', '{ pas du json');
    expect(await loadAjouts()).toEqual([]);
    await AsyncStorage.setItem('@kyroz:shopping:ajouts', JSON.stringify([{ name: '' }, { bidon: 1 }]));
    expect(await loadAjouts()).toEqual([]);
  });
});
