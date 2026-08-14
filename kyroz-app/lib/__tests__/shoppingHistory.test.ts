import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ShoppingTrip, SHOPPING_HISTORY_KEY, MAX_AGE_DAYS, MAX_TRIPS,
  pruneHistory, tripFromList, addTrip, removeTrip, newestFirst,
  boughtItems, skippedItems, tripHeadline, skippedNote, historySummary,
  loadHistory, saveHistory, recordTrip,
} from '../shoppingHistory';
import { frDateLongue } from '../dateLabel';
import { ShoppingItem, ShoppingList } from '../types';
import { todayStamp } from '../weight';

const art = (name: string, quantity: number, checked: boolean): ShoppingItem =>
  ({ name, quantity, unit: 'g', category: 'autres', checked });

const liste = (items: ShoppingItem[], plan_id = 'plan-1'): ShoppingList =>
  ({ id: `sl-${plan_id}`, plan_id, items });

const sortie = (date: string, at = `${date}T10:00:00.000Z`, items = [{ name: 'Riz', quantity: 500, unit: 'g', category: 'féculents' as const, bought: true }]): ShoppingTrip =>
  ({ at, date, plan_id: 'plan-1', items });

/** Date locale décalée de n jours (négatif = passé), au format 'YYYY-MM-DD'. */
const decale = (n: number): string => {
  const d = new Date(todayStamp() + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(async () => {
  await AsyncStorage.removeItem(SHOPPING_HISTORY_KEY);
});

describe('Historique des courses — ce qui est archivé', () => {
  // 🔴 LE garde-fou du module. Ce qui est relu six mois plus tard doit être ce
  // qui était à l'écran le jour des courses : aucun arrondi, aucune conversion,
  // aucun regroupement. Sinon l'historique raconte une autre liste.
  it('les quantités archivées sont celles de la liste, au chiffre près', () => {
    const l = liste([art('Blanc de poulet', 1237, true), art('Épinards', 300, false)]);
    const tr = tripFromList(l, '2026-08-07T09:00:00.000Z', '2026-08-07');
    expect(tr.items.map((i) => [i.name, i.quantity, i.bought])).toEqual([
      ['Blanc de poulet', 1237, true],
      ['Épinards', 300, false],
    ]);
    expect(tr.plan_id).toBe('plan-1');
  });

  it('un article non coché est archivé comme NON pris, pas effacé', () => {
    const tr = tripFromList(liste([art('Riz', 500, true), art('Tofu', 200, false)]), 'x', '2026-08-07');
    expect(boughtItems(tr).map((i) => i.name)).toEqual(['Riz']);
    expect(skippedItems(tr).map((i) => i.name)).toEqual(['Tofu']);
  });

  // Le titre compte les articles PRIS. Annoncer « 2 articles » quand un n'a pas
  // été trouvé serait un chiffre qu'aucune course ne confirme.
  it('le titre ne compte que ce qui a été pris', () => {
    const tr = tripFromList(liste([art('Riz', 500, true), art('Tofu', 200, false)]), 'x', '2026-08-07');
    expect(tripHeadline(tr)).toBe('1 article');
    expect(skippedNote(tr)).toBe('1 non pris — resté dans ta liste');
  });

  it('la note des non-pris se tait quand tout a été pris', () => {
    const tr = tripFromList(liste([art('Riz', 500, true)]), 'x', '2026-08-07');
    expect(tripHeadline(tr)).toBe('1 article');
    expect(skippedNote(tr)).toBeNull();
  });

  it('accord du pluriel sur les deux phrases', () => {
    const tr = tripFromList(
      liste([art('Riz', 1, true), art('Thon', 1, true), art('Tofu', 1, false), art('Pâtes', 1, false)]),
      'x', '2026-08-07',
    );
    expect(tripHeadline(tr)).toBe('2 articles');
    expect(skippedNote(tr)).toBe('2 non pris — restés dans ta liste');
  });
});

describe('Historique des courses — bornes et ordre', () => {
  it(`oublie les sorties de plus de ${MAX_AGE_DAYS} jours`, () => {
    const h = pruneHistory([sortie(decale(-(MAX_AGE_DAYS + 1))), sortie(decale(-MAX_AGE_DAYS)), sortie(decale(-1))]);
    expect(h.map((tr) => tr.date)).toEqual([decale(-MAX_AGE_DAYS), decale(-1)]);
  });

  it(`ne garde que les ${MAX_TRIPS} dernières, et ce sont bien les plus RÉCENTES`, () => {
    const brut = Array.from({ length: MAX_TRIPS + 5 }, (_, i) => sortie(decale(-(MAX_TRIPS + 5 - i))));
    const h = pruneHistory(brut);
    expect(h).toHaveLength(MAX_TRIPS);
    expect(h[h.length - 1].date).toBe(decale(-1));
    expect(h[0].date).toBe(decale(-MAX_TRIPS));
  });

  it('deux sorties le même jour restent deux lignes distinctes', () => {
    const matin = sortie('2026-08-07', '2026-08-07T08:00:00.000Z');
    const soir = sortie('2026-08-07', '2026-08-07T19:00:00.000Z');
    const h = addTrip(addTrip([], matin, '2026-08-07'), soir, '2026-08-07');
    expect(h).toHaveLength(2);
    expect(newestFirst(h)[0].at).toBe(soir.at);
  });

  // Retirer par HORODATAGE et non par rang : la liste affichée est inversée, et
  // un index se décale dès qu'une ligne s'efface — on effacerait la voisine.
  it("retire exactement la sortie visée, même à date identique", () => {
    const matin = sortie('2026-08-07', '2026-08-07T08:00:00.000Z');
    const soir = sortie('2026-08-07', '2026-08-07T19:00:00.000Z');
    const h = removeTrip([matin, soir], matin.at);
    expect(h.map((tr) => tr.at)).toEqual([soir.at]);
  });

  it('newestFirst ne modifie pas la liste source', () => {
    const src = [sortie('2026-08-01'), sortie('2026-08-05')];
    const copie = JSON.parse(JSON.stringify(src));
    newestFirst(src);
    expect(src).toEqual(copie);
  });
});

describe('Historique des courses — le résumé ne juge pas', () => {
  // Même règle que `journalSummary` : un compteur posé sur un écran met la
  // pression sans qu'on ouvre quoi que ce soit. Le résumé doit donc être
  // IDENTIQUE pour une sortie et pour douze à la même date.
  it('le résumé ne dépend pas du NOMBRE de sorties', () => {
    const une = [sortie(decale(-3))];
    const douze = Array.from({ length: 12 }, (_, i) => sortie(decale(-3), `${decale(-3)}T0${i % 10}:00:00.000Z`));
    expect(historySummary(douze)).toBe(historySummary(une));
  });

  it('le résumé parle de la dernière sortie', () => {
    expect(historySummary([])).toBe("Aucune pour l'instant");
    expect(historySummary([sortie(decale(0))])).toBe("Dernières courses aujourd'hui");
    expect(historySummary([sortie(decale(-1))])).toBe('Dernières courses hier');
    expect(historySummary([sortie(decale(-4))])).toBe('Dernières courses il y a 4 jours');
  });
});

describe('Historique des courses — persistance', () => {
  // 🔴 La règle vit dans le module, pas dans la condition d'affichage du bouton :
  // un garde-fou qui ne tient que chez son appelant disparaît au premier appelant
  // qui l'oublie.
  it("n'inscrit RIEN quand aucun article n'a été coché", async () => {
    const res = await recordTrip(liste([art('Riz', 500, false), art('Tofu', 200, false)]));
    expect(res).toBeNull();
    expect(await AsyncStorage.getItem(SHOPPING_HISTORY_KEY)).toBeNull();
  });

  it('inscrit la sortie et la relit à l\'identique', async () => {
    const tr = await recordTrip(liste([art('Riz', 500, true), art('Tofu', 200, false)]), '2026-08-07T09:00:00.000Z');
    expect(tr).not.toBeNull();
    const relu = await loadHistory();
    expect(relu).toHaveLength(1);
    expect(relu[0]).toEqual(tr);
  });

  it('deux clôtures successives empilent deux sorties', async () => {
    await recordTrip(liste([art('Riz', 500, true)]), '2026-08-07T09:00:00.000Z');
    await recordTrip(liste([art('Thon', 200, true)]), '2026-08-07T18:00:00.000Z');
    expect(await loadHistory()).toHaveLength(2);
  });

  it('un historique illisible repart à vide au lieu de casser l\'écran', async () => {
    await AsyncStorage.setItem(SHOPPING_HISTORY_KEY, '{pas du json');
    expect(await loadHistory()).toEqual([]);
  });

  it('la lecture élague aussi (une sortie périmée ne remonte pas)', async () => {
    await saveHistory([sortie(decale(-(MAX_AGE_DAYS + 10))), sortie(decale(-2))]);
    const h = await loadHistory();
    expect(h.map((tr) => tr.date)).toEqual([decale(-2)]);
  });
});

describe('Date lisible', () => {
  it("aujourd'hui et hier se nomment, le reste se date", () => {
    expect(frDateLongue('2026-08-07', '2026-08-07')).toBe("Aujourd'hui");
    expect(frDateLongue('2026-08-06', '2026-08-07')).toBe('Hier');
    expect(frDateLongue('2026-08-01', '2026-08-07')).toBe('Samedi 1 août');
  });

  // ⚠️ `textTransform: 'capitalize'` rendrait « Samedi 1 Août ». En français,
  // seul le premier mot en prend une.
  it('une seule majuscule, sur le premier mot', () => {
    const txt = frDateLongue('2026-08-04', '2026-08-07');
    expect(txt).toBe('Mardi 4 août');
    expect(txt.slice(1)).toBe(txt.slice(1).toLowerCase());
  });

  it('le passage de mois se calcule en calendrier, pas en soustraction de jours', () => {
    expect(frDateLongue('2026-07-31', '2026-08-01')).toBe('Hier');
  });

  // 🔴 AUCUN ARTICLE COLLÉ DEVANT UNE DATE VARIABLE. Le défaut a été livré DEUX
  // fois : « Retirer la ligne du ${date} » (OffPlanHistory) donnait « du
  // Aujourd'hui », et « Point du ${label} mis à jour » (WeightCheckin, corrigé le
  // 2026-08-14) donnait « Point du aujourd'hui mis à jour ». La cause est
  // structurelle, pas une inattention : « du 5 août » et « d'aujourd'hui » ne
  // prennent pas le même article, donc AUCUNE phrase collée ne peut être juste
  // pour les deux valeurs que rend `frDateLongue`. Le remède retenu les deux fois
  // est le TIRET.
  //
  // ⚠️ CE QUE CE CAS NE COUVRE PAS, et il faut le savoir pour ne pas s'y fier : il
  // lit le source, donc il ne voit que l'article ACCOLÉ à l'interpolation. Une
  // phrase construite en deux temps (l'article ici, la date trois fonctions plus
  // loin) lui échappe. Il ferme le chemin par lequel la faute est arrivée deux
  // fois — pas la faute elle-même.
  // ℹ️ Le `frDate` COURT de `WeightCheckin` (« 5 août ») est hors périmètre à
  // dessein : il ne rend jamais « Aujourd'hui », donc son « Ton poids le … » est
  // juste. Ce sont les formateurs qui NOMMENT le jour qui interdisent l'article.
  it('aucune phrase ne colle un article devant une date nommée', () => {
    const ARTICLE_COLLE = /\b(?:du|de|le|au|ce)\s+\$\{[^}]*(?:frDateLongue|\.label)/;
    const fautifs: string[] = [];
    const racine = join(__dirname, '..', '..');
    const parcourir = (dir: string) => {
      for (const e of readdirSync(dir)) {
        if (e === 'node_modules' || e === '__tests__') continue;
        const p = join(dir, e);
        if (statSync(p).isDirectory()) { parcourir(p); continue; }
        if (!/\.tsx?$/.test(e)) continue;
        const src = readFileSync(p, 'utf8');
        src.split('\n').forEach((l, i) => {
          if (ARTICLE_COLLE.test(l)) fautifs.push(`${p.slice(racine.length + 1)}:${i + 1} — ${l.trim()}`);
        });
      }
    };
    for (const d of ['app', 'components']) parcourir(join(racine, d));
    expect(fautifs, fautifs.join('\n')).toEqual([]);
    // Sait dire NON : la phrase d'avant correctif est bien vue comme fautive.
    expect(ARTICLE_COLLE.test('`✓ Point du ${saved.label} mis à jour`')).toBe(true);
  });
});
