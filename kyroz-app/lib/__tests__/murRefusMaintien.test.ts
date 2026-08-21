import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkEligibility, eligibilityMessage, MIN_AGE } from '../safety';
import { computePlan } from '../tdee';
import { makeProfile } from './helpers';

// ── LE REFUS DE LA SÈCHE EST UNE BIFURCATION, PAS UN MUR ─────────────────────
//
// 🔴 LE DÉFAUT, corrigé le 2026-08-20. Sous IMC 18,5, l'inscription refusait au
// SEPTIÈME tap — « Kyroz ne propose pas de sèche dans cette situation », une boîte
// de dialogue, et rien d'autre. Sept étapes remplies pour une porte close, sans dire
// laquelle était ouverte. Or DEUX endroits du code disaient déjà le contraire :
//   · `checkEligibility` en en-tête — « les autres bloquent l'objectif concerné,
//     pas l'app entière » ;
//   · `deficitBlocked` — « pas de blocage de l'app : le plan cesse simplement de
//     creuser, et l'UI dit pourquoi » (drapeau `UNDERWEIGHT_NO_DEFICIT`).
// Le mode dégradé EXISTAIT donc de bout en bout ; seule l'entrée le cachait. Ce qui
// se perdait au portail, c'est précisément le profil le plus fragile.
//
// ⚠️ Ce fichier vérifie des PRÉSENCES (la porte est nommée, la sortie existe, et
// elle mène quelque part), jamais l'absence d'une tournure : un message se réécrit,
// et une liste de mots interdits attrape la formulation d'hier.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const onboarding = sansCommentaires(lire('app/(auth)/onboarding.tsx'));
const maigre = makeProfile({ sex: 'female', age: 30, weight_kg: 45, height_cm: 165, goal: 'cut' }); // IMC 16,5

describe('le message dit le fait, l’issue, et le recours', () => {
  const msg = eligibilityMessage(checkEligibility(maigre)) ?? '';

  it('il nomme l’objectif refusé', () => {
    expect(msg.toLowerCase()).toContain('sèche');
  });

  it('il NOMME la porte ouverte — c’est tout le correctif', () => {
    // Sans ce mot, le message est un refus sans issue : la personne doit deviner
    // lequel des trois autres objectifs l'app accepte, ou repartir.
    expect(msg).toContain('Maintien');
  });

  it('il oriente vers un professionnel, sans en faire une alarme', () => {
    expect(msg).toMatch(/médecin|diététicien/i);
    // Conditionné à la DURÉE : un IMC bas n'est pas en soi un problème médical, et
    // un signal alarmant est interdit (CLAUDE.md §10).
    expect(msg).toMatch(/si cette situation dure/i);
  });
});

describe('la porte ouverte mène quelque part', () => {
  it('sous IMC 18,5, le plan est SERVI à la maintenance — pas refusé', () => {
    // La preuve que « Maintien » n'est pas une consolation : le moteur rend déjà un
    // plan complet dans cette zone. Si ce comportement tombait, le message enverrait
    // la personne vers une porte qui ne s'ouvre pas.
    const plan = computePlan(maigre);
    expect(plan.flags).toContain('UNDERWEIGHT_NO_DEFICIT');
    expect(plan.profile.target_kcal).toBe(plan.profile.tdee_kcal);
  });

  it('seul l’objectif est bloqué, pas l’app', () => {
    expect(checkEligibility(maigre)).toEqual(['UNDERWEIGHT_CUT_BLOCKED']);
    expect(checkEligibility({ ...maigre, goal: 'maintain' })).toEqual([]);
    expect(checkEligibility({ ...maigre, goal: 'lean_bulk' })).toEqual([]);
  });

  it('le blocage des MINEURS, lui, reste entier — il n’a pas de porte à nommer', () => {
    const mineur = checkEligibility({ ...maigre, age: MIN_AGE - 1 });
    expect(mineur).toContain('MINOR');
    expect(eligibilityMessage(mineur)).toBe(`Kyroz est réservé aux ${MIN_AGE} ans et plus.`);
  });
});

describe('l’inscription refuse à l’étape 5, pas au dernier tap', () => {
  it('l’objectif est éprouvé dès qu’il est choisi', () => {
    expect(onboarding).toMatch(/const objectifBloque =[\s\S]{0,220}checkEligibility/);
  });

  it('l’étape 5 ne se passe pas tant que l’objectif est refusé', () => {
    expect(onboarding).toContain('(step === 5 && !objectifBloque)');
    // …et l'étape doit RESTER dans la liste des étapes gardées : l'oublier ici
    // laisserait `canProceed` retomber sur son `!includes` fourre-tout, donc passer.
    expect(onboarding).toMatch(/!\[1, 2, 3, 4, 5, 7\]\.includes\(step\)/);
  });

  it('la sortie tient en UN tap, et elle est écrite à l’écran', () => {
    expect(onboarding).toContain('Passer en Maintien');
    expect(onboarding).toContain("setGoal('maintain')");
  });

  it('le POURQUOI n’a qu’une rédaction, et le bandeau ne le répète pas', () => {
    // La carte rend le message partagé — deux rédactions du même refus, c'est la
    // porte par laquelle l'une des deux devient fausse.
    expect(onboarding).toContain('{objectifBloque}');
    // 🔴 TROUVÉ À L'ÉCRAN, pas en relisant : le bandeau renvoyait `objectifBloque`
    // lui-même, donc le paragraphe de quatre lignes s'affichait DEUX fois — et la
    // copie en accent recouvrait la carte qu'elle répétait. Le bandeau dit l'ACTION.
    // La classe doit accepter les apostrophes ÉCHAPPÉES : « Sèche n\'est pas… ».
    // Première version coupée au `\'`, elle rendait « Sèche n\ » — un test rouge
    // qui accusait le texte alors que c'était la sonde qui s'arrêtait trop tôt.
    const bandeau = onboarding.match(/step === 5 && objectifBloque\) return '((?:[^'\\]|\\.)*)'/)?.[1] ?? '';
    expect(bandeau.length, 'le bandeau doit rester une ligne').toBeGreaterThan(0);
    expect(bandeau.length).toBeLessThan(90);
    expect(bandeau).toContain('Maintien');
  });
});
