import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyser, VERSION, CLE_BROUILLON, type OnboardingDraft } from '../onboardingDraft';
import { CLES_CONSERVEES, clesAPurger } from '../sessionLocale';

// ── UNE INSCRIPTION EN COURS SURVIT À UNE FERMETURE DE L'APP ─────────────────
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, mesuré le 2026-09-01 : l'onboarding ne
// persistait rien. Sept étapes, et un appel entrant ou un manque de mémoire
// renvoyaient au prénom.
//
// ⚠️ La lecture disque n'est pas instrumentable ; la DÉCISION « qu'est-ce qui se
// relit » l'est. C'est donc `analyser` qui est éprouvée ici, comme `clesAPurger`
// l'est pour la purge.

const TOTAL = 7;
const brut = (o: unknown) => JSON.stringify(o);

const complet = {
  v: VERSION,
  step: 5, firstName: 'Camille', sex: 'female', birthDate: '1996-04-12',
  weight: '62', height: '168', bodyFat: 26, bodyFatSource: 'estimated',
  sports: [{ type: 'running', sessionsPerWeek: 2 }], noSport: false, goal: 'recomp',
  restrictions: ['halal'], proteins: ['poulet'], dislikes: ['coriandre'],
  neat: 'active', variety: 'balanced',
  planWeekdays: [1, 2, 3], restWeekdays: [0, 6], restTouched: true,
  meals: ['breakfast', 'lunch'], customSlots: [],
};

describe('ce qui se relit', () => {
  it('un brouillon complet revient entier', () => {
    const d = analyser(brut(complet), TOTAL) as OnboardingDraft;
    expect(d).not.toBeNull();
    expect(d.step).toBe(5);
    expect(d.sex).toBe('female');
    expect(d.goal).toBe('recomp');
    expect(d.neat).toBe('active');
    expect(d.restTouched).toBe(true);
  });

  it('« pas encore choisi » se relit COMME TEL, il ne se confond pas avec une erreur', () => {
    // Le piège du fichier : depuis le 2026-09-01, `null` est une valeur normale pour
    // le sexe, l'objectif et le NEAT. Un validateur qui dirait « invalide » par `null`
    // rendrait ces trois champs indistinguables de leur propre état de départ — et le
    // brouillon d'une inscription à peine commencée serait jeté à chaque fois.
    const d = analyser(brut({ ...complet, sex: null, goal: null, neat: null }), TOTAL);
    expect(d).not.toBeNull();
    expect(d!.sex).toBeNull();
    expect(d!.goal).toBeNull();
    expect(d!.neat).toBeNull();
  });

  it('un champ ABSENT rend sa valeur initiale — un champ ajouté ne périme pas les brouillons', () => {
    const { dislikes, variety, ...sansDeuxChamps } = complet;
    const d = analyser(brut(sansDeuxChamps), TOTAL);
    expect(d).not.toBeNull();
    expect(d!.dislikes).toEqual([]);
    expect(d!.variety).toBe('balanced');
  });

  it('l\'étape se BORNE au lieu de tout jeter', () => {
    // Une étape aberrante ne dit rien sur la validité des réponses ; jeter des
    // réponses saines pour un compteur faux serait la punition inverse.
    expect(analyser(brut({ ...complet, step: 99 }), TOTAL)!.step).toBe(TOTAL);
    expect(analyser(brut({ ...complet, step: 0 }), TOTAL)!.step).toBe(1);
    expect(analyser(brut({ ...complet, step: 'cinq' }), TOTAL)!.step).toBe(1);
  });
});

describe('ce qui se jette', () => {
  it('rien, du JSON cassé, une autre version', () => {
    expect(analyser(null, TOTAL)).toBeNull();
    expect(analyser('{pas du json', TOTAL)).toBeNull();
    expect(analyser(brut({ ...complet, v: VERSION + 1 }), TOTAL)).toBeNull();
    expect(analyser(brut({ ...complet, v: undefined }), TOTAL)).toBeNull();
    expect(analyser(brut([1, 2, 3]), TOTAL)).toBeNull();
  });

  it('UN champ du mauvais type jette le brouillon ENTIER, jamais amputé', () => {
    // Un parcours restauré à l'étape 5 avec un objectif retombé à `null` est un état
    // que l'écran ne produit jamais lui-même — donc que personne n'aurait vu à l'essai.
    // Perdre un brouillon corrompu, c'est l'état d'avant ; en servir un incohérent
    // serait une régression.
    for (const casse of [
      { weight: 62 },                    // un nombre là où l'écran met une chaîne saisie
      { sex: 'autre' },                  // hors de l'ensemble fermé
      { goal: 'sèche' },                 // le libellé au lieu de la clé
      { neat: 'assis' },
      { restrictions: ['vegetarian', 'paleo'] },
      { planWeekdays: [1, 2.5] },
      { meals: [{ nom: 'petit-déj' }] },
      { sports: ['course'] },
      { noSport: 'oui' },
      { bodyFat: 'vingt' },
    ]) {
      expect(analyser(brut({ ...complet, ...casse }), TOTAL), JSON.stringify(casse)).toBeNull();
    }
  });
});

describe('le brouillon est une donnée personnelle, et il est traité comme telle', () => {
  it('il est PURGÉ à la déconnexion — il ne rejoint jamais la liste blanche', () => {
    // 🔴 Ce qu'un ajout « bien intentionné » à `CLES_CONSERVEES` produirait : un
    // brouillon contenant poids, taille et masse grasse survivrait à une déconnexion,
    // et le compte suivant hériterait du corps du précédent.
    expect(CLES_CONSERVEES).not.toContain(CLE_BROUILLON);
    expect(clesAPurger([CLE_BROUILLON, '@kyroz:theme'])).toContain(CLE_BROUILLON);
  });

  it('il part dans l\'export RGPD tout seul — la clé porte le préfixe balayé', () => {
    expect(CLE_BROUILLON.startsWith('@kyroz:')).toBe(true);
    const src = readFileSync(join(__dirname, '..', 'exportData.ts'), 'utf8');
    expect(src).toContain("startsWith('@kyroz:')");
  });
});

describe('l\'écran s\'en sert vraiment', () => {
  const onboarding = readFileSync(join(__dirname, '..', '..', 'app', '(auth)', 'onboarding.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

  it('il lit au montage, écrit ensuite, et efface une fois le profil écrit', () => {
    expect(onboarding).toContain('lireBrouillon(TOTAL_STEPS)');
    expect(onboarding).toContain('ecrireBrouillon(brouillonRef.current)');
    expect(onboarding).toMatch(/saveProfile\(profile\);\s*await effacerBrouillon\(\);/);
  });

  it('rien ne s\'affiche avant la lecture — sinon la restauration a l\'air d\'un bug', () => {
    // Et surtout : sans cette garde, le premier rendu écraserait le brouillon qu'on
    // est en train de lire. L'écran effacerait la sauvegarde qu'il vient de restaurer.
    expect(onboarding).toContain('if (!brouillonLu) return null;');
    expect(onboarding).toMatch(/if \(!brouillonLu\) return;/);
  });

  it('l\'arrière-plan force une écriture immédiate — c\'est là que le système tue', () => {
    expect(onboarding).toMatch(/AppState\.addEventListener/);
  });
});
