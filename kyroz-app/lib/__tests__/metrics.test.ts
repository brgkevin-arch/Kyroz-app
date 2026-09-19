import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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
//   4. la série affichée a été RETIRÉE de l'app le 2026-09-19 (décision fondateur),
//      et le §2 le dit — une page qui décrirait un compteur disparu, ou qui se
//      tairait sur un compteur revenu, ne décrirait plus le code.

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

describe('METRICS.md — la série est RETIRÉE, et la page le dit', () => {
  it('le §2 dit que la série est partie', () => {
    // Présence attendue, pas absence redoutée (A38) : la page doit PORTER le retrait.
    expect(metrics).toMatch(/RETIRÉE le 2026-09-19/);
  });

  it('le code n’en porte plus — si une série revient, le §2 doit être réécrit', () => {
    // Ce n'est pas un interdit : le fondateur la repensera peut-être un jour. C'est
    // un rappel — une série qui reviendrait sans que le §2 change laisserait la page
    // affirmer un retrait qui n'est plus vrai.
    for (const f of ['lib/streak.ts', 'hooks/useStreak.ts', 'components/StreakCelebration.tsx']) {
      expect(existsSync(join(RACINE, f)), f).toBe(false);
    }
    expect(plan).not.toMatch(/markActiveToday|useStreak/);
  });
});
