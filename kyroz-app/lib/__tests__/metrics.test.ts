import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Events } from '../analytics';

// ── METRICS.md dit ce que le CODE fait — ce test le vérifie ─────────────────
//
// 🔴 CE QUE CE FICHIER FERME, écrit le 2026-08-20 avec `METRICS.md` lui-même.
// Une page qui définit un indicateur est une AFFIRMATION SUR LE CODE, exactement
// comme l'écran Méthodologie (`methodologie.test.ts`) ou les libellés du harnais
// (`harnaisEcrans.test.ts`). Et le dépôt sait déjà ce que devient une affirmation
// que personne ne relit : trois bulles de tuto sur cinq étaient fausses à l'audit,
// chacune vraie le jour de son écriture.
//
// `METRICS.md` prend quatre paris sur le code, et chacun casse la north star EN
// SILENCE s'il tombe :
//   1. l'événement qu'elle nomme existe vraiment, sous ce nom-là, côté PostHog ;
//   2. il part là où un repas devient `eaten`, et nulle part ailleurs ;
//   3. `jour_depuis_install` part sur TOUS les envois — c'est la seule clé qui
//      permette de compter des journées LOCALES (cf. §3) ;
//   4. la série, elle, continue de compter des OUVERTURES — sans quoi le tableau
//      du §2, qui oppose les deux, ne décrit plus rien.
//
// ⚠️ Il vérifie aussi que la CITATION du §2 est encore le texte de l'app. Une
// citation dans un document est la forme la plus fragile d'affirmation : elle a
// l'air d'une preuve et elle vieillit comme un commentaire.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentairesJS = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const metrics = lire('METRICS.md');
const analytics = lire('lib/analytics.ts');
const plan = sansCommentairesJS(lire('app/(tabs)/plan.tsx'));

describe('METRICS.md — l’événement qu’elle nomme existe', () => {
  it('le nom PostHog écrit dans la page est celui du code', () => {
    // La page écrit `meal_cooked` : c'est la chaîne qu'on tapera dans PostHog, pas
    // la clé TypeScript. Renommer la valeur sans toucher la page ferait pointer la
    // requête sur un événement qui n'existe pas — et une requête vide se lit comme
    // « personne ne cuisine », pas comme « la requête est fausse ».
    expect(metrics).toContain('`meal_cooked`');
    expect(Events.mealCooked).toBe('meal_cooked');
  });

  it('la propriété de cohorte écrite dans la page est celle du code', () => {
    expect(metrics).toContain('`jour_depuis_install`');
    expect(analytics).toContain('jour_depuis_install');
  });
});

describe('METRICS.md — le calcul reste possible', () => {
  it('`meal_cooked` part là où un repas devient `eaten`', () => {
    // On lit le corps de `cookMeal` : le passage à `eaten` et la capture doivent
    // rester dans le MÊME geste. Séparés, un chemin peut marquer un repas mangé
    // sans que la journée compte — la north star baisserait sans que rien ne casse.
    const cook = plan.slice(plan.indexOf("setMealStatus(meal, 'eaten'"));
    expect(cook.slice(0, 400)).toContain('Events.mealCooked');
  });

  it('rien d’autre ne marque un repas `eaten` en douce', () => {
    // Le §3 affirme « au seul endroit ». Si un deuxième apparaît, il lui faut sa
    // propre capture — ou la page ment sur ce qu'elle sait compter.
    const poses = [...plan.matchAll(/setMealStatus\([^,]+,\s*'eaten'/g)];
    expect(poses.length, 'un seul point de passage à `eaten`').toBe(1);
  });

  it('`jour_depuis_install` s’ajoute dans le chemin d’envoi COMMUN', () => {
    // « sur TOUS les événements » ne tient que tant que l'enrichissement est en
    // amont de l'envoi, une seule fois. Posé par appelant, il manquerait au premier
    // oubli — et une cohorte incomplète ne se voit pas, elle se lit comme une baisse.
    const envoi = analytics.slice(analytics.indexOf('const enrichi'));
    expect(envoi).toMatch(/const enrichi[^\n]*jour_depuis_install/);
    expect(envoi.indexOf('const enrichi')).toBeLessThan(envoi.indexOf('fetch('));
  });
});

describe('METRICS.md — la série et la north star restent DEUX choses', () => {
  it('la série compte toujours des ouvertures', () => {
    // Le §2 oppose les deux dans un tableau. Le jour où `markActiveToday()` quitte
    // le montage, ce tableau devient faux — et c'est le genre de changement qu'on
    // fait en croyant « corriger la métrique ».
    expect(plan).toMatch(/if \(profile\) \{ markActiveToday\(\); capture\(Events\.planOpened\)/);
  });

  it('le §2 ne s’appuie plus sur une bulle qui n’existe plus', () => {
    // La page se sert de cette phrase comme PREUVE que la règle est annoncée à
    // l'utilisateur. Si la bulle change, l'argument tombe — et il faut le savoir
    // avant de continuer à s'appuyer dessus.
    // 🔴 TROUVÉ PAR MUTATION, et c'est le défaut le plus instructif des trois : la
    // première version lisait `lib/tours.ts` BRUT. Or la phrase y est deux fois —
    // dans le texte de la bulle (l. 113) et dans le commentaire qui l'explique
    // (l. 98). Réécrire la bulle laissait donc le test VERT, le commentaire se
    // portant garant du libellé qu'il décrit. Exactement la panne
    // qu'`harnaisEcrans.test.ts` documente. Sans le passage au mutant, ce garde-fou
    // serait entré au dépôt en ne gardant rien.
    // 🔴 ET C'EST EXACTEMENT CE QUI EST ARRIVÉ le 2026-08-25 : la bulle `plan-serie`
    // est partie avec la coupe des tutos, donc la preuve a disparu. Le test tenait —
    // il a rougi le jour même. Ce qu'il compte désormais : ou bien la phrase est
    // AFFICHÉE quelque part et la page peut s'en réclamer, ou bien la page DIT
    // qu'elle ne l'est plus. Ce qui est interdit, c'est de continuer à s'appuyer sur
    // une bulle supprimée.
    const affichee = sansCommentairesJS(lire('lib/tours.ts')).includes('cuisiné ou pas');
    if (affichee) {
      expect(metrics).toContain('cuisiné ou pas');
    } else {
      expect(metrics, 'METRICS §2 cite une bulle que l’app n’affiche plus')
        .toMatch(/L['’]APP NE LE DIT PLUS/);
    }
  });

  it('les fichiers de la série renvoient à METRICS.md au lieu de se dire north star', () => {
    // ⚠️ PREMIÈRE VERSION REJETÉE, et la leçon vaut d'être gardée : elle interdisait
    // la chaîne « North Star : » dans ces fichiers. Elle rougissait sur la NOTE qui
    // corrige le défaut — celle qui cite l'ancien titre pour dire qu'il était faux.
    // Un test d'ABSENCE ne sait pas distinguer une affirmation de sa rétractation
    // (A38 : vérifier une présence attendue, pas l'absence d'une forme redoutée).
    for (const f of ['lib/streak.ts', 'components/StreakCelebration.tsx']) {
      expect(lire(f), f).toContain('METRICS.md');
    }
    // ⚠️ DEUXIÈME VERSION REJETÉE POUR LA MÊME RAISON, et c'est ce qui rend la leçon
    // solide : « le titre ne contient pas “North Star” » rougissait sur le titre
    // CORRIGÉ — « UN OUTIL DE RÉTENTION, PAS LA NORTH STAR ». Deux fois de suite,
    // l'absence a confondu l'erreur avec son démenti.
    // ➡️ Ce qu'on veut n'est pas que le nom disparaisse, c'est que le fichier DISE
    // ce qu'il n'est pas. On vérifie donc le démenti, pas l'absence — et restaurer
    // l'ancien titre (« North Star : 7 jours consécutifs ») le fait rougir.
    const titre = lire('lib/streak.ts').split('\n')[2] ?? '';
    expect(titre, 'ligne de titre de lib/streak.ts').toMatch(/PAS LA NORTH STAR/i);
  });
});
