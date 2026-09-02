import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mifflinRaw } from '../tdee';

// ── LE SEXE EST CHOISI, JAMAIS SUPPOSÉ ───────────────────────────────────────
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, mesuré le 2026-09-01 : l'inscription posait
// `useState<Sex>('male')`. Le segmenté « Homme / Femme » s'ouvrait donc avec
// « Homme » à l'accent, l'étape 2 ne bloquait pas dessus, et une femme qui n'y
// touchait pas recevait un plan calculé sur un métabolisme d'homme — SANS jamais
// avoir été interrogée, et sans qu'aucun écran ne le signale.
//
// C'est exactement le défaut fermé pour le NEAT le 2026-08-19
// (`neatOnboarding.test.ts` : « SERVI SANS AVOIR ÉTÉ CHOISI »), dans sa version
// grave. Le NEAT par défaut servait le cran le PLUS PRUDENT ; le sexe par défaut
// sert un résultat FAUX. La leçon vaut d'être écrite : quand une passe corrige
// « un défaut jamais choisi », elle doit balayer TOUS les états présélectionnés
// de l'écran, pas seulement celui qui a déclenché la passe.
//
// ⚠️ Ce fichier vérifie des PRÉSENCES attendues (leçon A38) : « l'état part de
// `null` », « la validation lit `sex !== null` ». Une vérification d'absence
// (« le fichier ne contient pas `'male'` ») serait fausse dès la ligne du
// segmenté, qui doit bien proposer l'option.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const ONBOARDING = 'app/(auth)/onboarding.tsx';
const UI = 'components/ui.tsx';

const onboarding = sansCommentaires(lire(ONBOARDING));
const ui = sansCommentaires(lire(UI));

describe('la question du sexe est posée, pas présupposée', () => {
  it('rien n\'est présélectionné — sinon le défaut passerait pour une réponse', () => {
    expect(onboarding).toMatch(/useState<Sex \| null>\(null\)/);
  });

  it('on ne peut pas passer l\'étape 2 sans avoir répondu', () => {
    const validation = onboarding.match(/const basicsValid =[\s\S]*?;/)?.[0] ?? '';
    expect(validation).toContain('sex !== null');
    // …et la garde doit RESTER branchée sur le bouton : `canProceed` lit `basicsValid`.
    expect(onboarding).toMatch(/step === 2 && basicsValid/);
  });

  it('l\'étape dit ce qui manque, sans deviner à la place', () => {
    expect(onboarding).toContain('Indique si tu es un homme ou une femme pour continuer.');
  });

  it('la fin de parcours ne se rabat sur AUCUN sexe par défaut', () => {
    // Le contraste avec le NEAT est le cœur du sujet : `neat ?? DEFAULT_NEAT_LEVEL`
    // est légitime (le repli est le cran le plus prudent), un `sex ?? ...` ne l'est
    // jamais. Le filet renvoie à l'étape 2 au lieu de choisir.
    expect(onboarding).not.toMatch(/sex\s*(\?\?|\|\|)\s*'/);
    expect(onboarding).toMatch(/if \(sex === null\) \{ setStep\(2\)/);
  });

  it('le motif affiché se RECALCULE, il n\'est pas figé au moment du tap', () => {
    // Trouvé à l'écran le 2026-09-01, en vérifiant le correctif ci-dessus : le motif
    // était mémorisé (`useState<string | null>`), donc « Indique si tu es un homme ou
    // une femme » restait affiché APRÈS avoir touché « Femme », tant que l'étape
    // restait incomplète pour une autre raison. Un message d'aide qui survit à sa
    // cause envoie corriger ce qui l'est déjà.
    expect(onboarding).toMatch(/const \[avanceTentee, setAvanceTentee\] = useState\(false\)/);
    expect(onboarding).toContain('{avanceTentee && !canProceed && <Text style={s.hint}>{blockReason()}</Text>}');
  });
});

// L'APPLICATION DE LA LEÇON, LE JOUR MÊME : en remontant la famille, l'objectif
// portait le même défaut. `useState<Goal>('cut')` cochait « Sèche » — la première
// carte — et l'étape 5 ne validait que l'ABSENCE de refus, jamais la présence d'un
// choix. Un tap sur Continuer suffisait donc à repartir avec un déficit calorique
// que personne n'avait demandé. Le sexe fausse le calcul ; l'objectif engage une
// décision de santé. Aucun des deux n'a de valeur de repli défendable.
describe('l\'objectif est choisi, jamais hérité de l\'ordre d\'affichage', () => {
  it('rien n\'est présélectionné', () => {
    expect(onboarding).toMatch(/useState<Goal \| null>\(null\)/);
  });

  it('on ne peut pas passer l\'étape 5 sans avoir choisi', () => {
    expect(onboarding).toMatch(/step === 5 && goal !== null/);
  });

  it('l\'étape dit ce qui manque — et le CHOIX manquant se dit avant le REFUS', () => {
    // L'ordre compte : un refus (« Sèche n'est pas disponible ici ») suppose un
    // objectif choisi. Le motif « choisis ton objectif » doit donc être testé en
    // premier, sinon il ne sort jamais.
    const choix = onboarding.indexOf('Choisis ton objectif pour continuer.');
    const refus = onboarding.indexOf('step === 5 && objectifBloque');
    expect(choix).toBeGreaterThan(-1);
    expect(refus).toBeGreaterThan(-1);
    expect(choix).toBeLessThan(refus);
  });

  it('la fin de parcours ne se rabat sur AUCUN objectif par défaut', () => {
    expect(onboarding).toMatch(/if \(goal === null\) \{ setStep\(5\)/);
  });
});

describe('un segmenté sait montrer qu\'il n\'a rien reçu', () => {
  it('Segmented accepte l\'état vide', () => {
    expect(ui).toMatch(/value: T \| null/);
    expect(ui).toMatch(/const vide = value === null/);
  });

  it('l\'état vide n\'affiche PAS de curseur', () => {
    // Sans ça, le correctif serait invisible : l'état `null` désignerait quand même
    // la première option à l'œil, et l'écran continuerait de mentir.
    const glissant = ui.match(/const glissant = .*/)?.[0] ?? '';
    expect(glissant).toContain('!vide');
    expect(ui).toMatch(/\{glissant && \(/);
  });
});

describe('pourquoi ça comptait — la mesure, pas l\'opinion', () => {
  it('le sexe supposé déplace la dépense de repos de 166 kcal', () => {
    // Mifflin-St Jeor : le terme sexué vaut +5 chez l'homme, −161 chez la femme
    // (`lib/tdee.ts`). Le même corps change donc de 166 kcal selon la seule case
    // cochée — avant même le facteur d'activité, qui les multiplie.
    const corps = { age: 30, weight_kg: 65, height_cm: 168 };
    const homme = mifflinRaw({ ...corps, sex: 'male' });
    const femme = mifflinRaw({ ...corps, sex: 'female' });
    expect(homme - femme).toBe(166);
  });
});
