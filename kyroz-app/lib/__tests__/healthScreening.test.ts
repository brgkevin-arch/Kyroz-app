import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCREENING_VERSION, SCREENING_KEY } from '../healthScreening';

// ⚠️ Les commentaires sont RETIRÉS avant toute recherche : ces fichiers expliquent
// longuement ce qui a été supprimé, donc ils CITENT les libellés que ce test interdit.
// Sans ce nettoyage, la note qui dit « ne pas remettre X » ferait échouer le test qui
// vérifie l'absence de X. Même remède qu'`emailConfirmation.test.ts` (A30).
const lire = (p: string) =>
  readFileSync(join(__dirname, '..', '..', p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // commentaires JSX

// Le module ne porte plus de logique de décision (le dépistage bloquant est retiré —
// AGENTS.md E39) : il ne reste qu'une mémoire « avertissement vu ». Ce qu'il y a à
// verrouiller a donc changé de nature — ce n'est plus « bloque-t-il bien ? » mais
// « n'a-t-on pas reconstruit un questionnaire par la bande ? ».
describe('avertissement santé — plus aucune question posée (E39)', () => {
  it('l\'écran ne pose AUCUNE question et n\'a pas de cul-de-sac', () => {
    const ecran = lire('components/HealthScreening.tsx');
    // Les trois marques de l'ancien portail. Chacune est le symptôme d'un retour en
    // arrière différent : la question, l'attestation à cocher, l'écran de blocage.
    expect(ecran).not.toMatch(/Es-tu concerné/);
    expect(ecran).not.toMatch(/Je confirme être un adulte/);
    expect(ecran).not.toMatch(/n'est pas adapté à ta situation/);
  });

  it('l\'écran PORTE l\'avertissement exigé par Apple 1.4.1 et Google', () => {
    const ecran = lire('components/HealthScreening.tsx');
    // C'est la contrepartie du retrait : le renvoi vers un médecin est désormais la
    // SEULE chose que cet écran apporte. S'il disparaît, il ne reste plus rien.
    expect(ecran).toMatch(/Enceinte, allaitante/);
    expect(ecran).toMatch(/médecin/);
    expect(ecran).toMatch(/J'ai compris/);
  });

  it('aucun état de santé n\'est déclaré ni stocké par le module', () => {
    const src = lire('lib/healthScreening.ts');
    // Le module n'écrit qu'un {passedAt, version}. Un champ de situation médicale qui
    // réapparaîtrait ici serait une collecte art. 9 remise en place sans décision.
    expect(src).not.toMatch(/pregnant_or_breastfeeding/);
    expect(src).not.toMatch(/chronic_condition/);
    expect(src).not.toMatch(/ScreeningFlags/);
  });

  it('le moteur d\'éligibilité ne connaît plus de motif de grossesse', () => {
    const safety = lire('lib/safety.ts');
    // Le type est cité en commentaire (la note qui explique le retrait) : on cherche
    // donc l'USAGE — une branche qui pousse le motif — pas la mention.
    expect(safety).not.toMatch(/push\('PREGNANCY_OR_NURSING'\)/);
    expect(safety).not.toMatch(/includes\('PREGNANCY_OR_NURSING'\)/);
  });

  it('la mémoire « avertissement vu » reste versionnée', () => {
    expect(SCREENING_VERSION).toBeGreaterThanOrEqual(1);
    expect(SCREENING_KEY).toBe('@kyroz:healthScreening');
  });
});
