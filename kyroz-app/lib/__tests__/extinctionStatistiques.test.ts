import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATISTIQUES_USAGE_ACTIVES } from '../featureFlags';
import { PRIVACY_POLICY } from '../../constants/legal';

// ── VERROU : éteint veut dire ÉTEINT — rien ne part, rien n'est demandé ─────
//
// POURQUOI CE FICHIER EXISTE
//
// Décision du fondateur, 2026-08-26 : « on enlève le posthog pour l'instant ».
//
// 🔴 UNE EXTINCTION QUE PERSONNE NE COMPTE SE RALLUME TOUTE SEULE. Le dépôt a déjà
// deux parcours éteints par constante (`PARCOURS_HORS_PLAN_ACTIF`,
// `RYTHME_HEBDOMADAIRE_ACTIF`) ; ce qui les tient, c'est que quelque chose vérifie
// qu'ils sont bien coupés PARTOUT. Sans ça, il suffit d'un refactor qui déplace un
// appel au-dessus de la garde pour que la mesure reparte — sans écran, donc sans
// consentement, donc pire qu'avant.
//
// ⚠️ LA GARDE EST DANS `capture`, ET C'EST LA SEULE QUI VAILLE POUR LES BINAIRES DÉJÀ
// INSTALLÉS. La clé PostHog est inlinée dans le bundle à la compilation : la retirer
// de l'environnement EAS ne change rien à ce qui tourne chez les testeurs. Seul un
// code qui refuse de partir arrête ça, et il se publie en OTA.
//
// ⚠️ CE QUE CE FICHIER NE FERME PAS, et il faut le savoir : ce qui a DÉJÀ été envoyé
// entre la pose de la clé (2026-08-18) et l'extinction est chez PostHog. Aucun test
// ne peut l'effacer — c'est une action hors dépôt, sur le tableau de bord.

const RACINE = join(__dirname, '..', '..');
const brut = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

/**
 * Le code SEUL — commentaires retirés.
 *
 * 🔴 Sans ça, ces sondes mesurent une fenêtre de caractères que la PROSE remplit : la
 * note qui explique pourquoi un bloc est derrière la constante repousse la constante
 * hors de la fenêtre, et le test accuse le code qu'il vient de garder. Vu ici même,
 * sur deux assertions. C'est la « mesure contaminée » : on croit mesurer le code, on
 * mesure sa description.
 */
function sansCommentaires(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

const lire = (rel: string) => sansCommentaires(brut(rel));

// ── LE SENS QUI MANQUAIT (constats 08-01 et 06b-01, 2026-08-27) ─────────────
//
// 🔴 CE FICHIER NE COMPTAIT QU'UNE MOITIÉ DU COUPLAGE. Il vérifiait « éteint → les
// textes se taisent ». L'autre sens n'était compté nulle part : **le jour où
// quelqu'un repasse la constante à `true`, trois écrans se rallument et
// `constants/legal.ts` devient FAUX au même commit** — il affirme « Aucune
// statistique d'usage n'est collectée ».
//
// Ce n'est pas une hypothèse d'école : le périmètre entier est délibérément
// CONSERVÉ dans le bundle (15 événements, 16 points d'appel, l'écran de
// consentement, le bloc Réglages), tous derrière cette seule constante. Rallumer
// est donc un geste d'UN caractère — et c'est exactement ce qui rend le texte
// publié fragile.
//
// ⚠️ **CE N'EST PAS « LA CONSTANTE DOIT RESTER FALSE ».** Cette assertion-là existe
// déjà au-dessus, et elle dit au développeur « tu as cassé ce fichier » — pas « ta
// politique de confidentialité vient de devenir fausse ». Le jour où la mesure
// revient légitimement, c'est cette phrase-ci qu'il faut lire : elle nomme LE
// paragraphe à corriger, et elle ne se contourne pas en changeant la constante.
//
// ℹ️ Deux constats se rejoignent ici, par les deux bouts : `08-01` l'a trouvé côté
// périmètre dormant, `06b-01` côté texte publié. Un seul garde-fou les ferme —
// c'est le couplage qui manquait, pas deux contrôles.
const PHRASE_AUCUNE_MESURE = 'Aucune statistique d’usage n’est collectée';

describe('Les statistiques d’usage sont éteintes', () => {
  it('la constante est bien à false — le reste de ce fichier en dépend', () => {
    expect(STATISTIQUES_USAGE_ACTIVES).toBe(false);
  });

  it('🔴 la constante et le texte publié ne peuvent pas se contredire', () => {
    // Le témoin d'abord : la phrase existe VRAIMENT dans le texte servi. Sans lui,
    // le jour où elle serait reformulée, l'invariant deviendrait vide et se
    // déclarerait tenu tout seul.
    const texte = PRIVACY_POLICY.flatMap((s) => s.paragraphs ?? []).join(' ');
    const leTexteNieTouteMesure = texte.includes(PHRASE_AUCUNE_MESURE);
    expect(
      leTexteNieTouteMesure || STATISTIQUES_USAGE_ACTIVES,
      `la phrase « ${PHRASE_AUCUNE_MESURE} » a disparu de la politique alors que la `
      + 'mesure est toujours éteinte — soit elle revient, soit cet invariant ne garde plus rien.',
    ).toBe(true);

    expect(
      !(STATISTIQUES_USAGE_ACTIVES && leTexteNieTouteMesure),
      'STATISTIQUES_USAGE_ACTIVES vient de passer à `true` alors que la politique de '
      + `confidentialité affirme encore « ${PHRASE_AUCUNE_MESURE} ». Ce texte est OPPOSABLE : `
      + 'il devient faux au même commit. Corriger `constants/legal.ts` (§2), reporter '
      + 'l’empreinte de `legal.test.ts`, arbitrer la date d’entrée en vigueur, puis '
      + '`npm run gen:legal` — et republier les trois surfaces.',
    ).toBe(true);
  });

  // ── Le comportement : même tout allumé par ailleurs, rien ne part ────────
  describe('`capture` n’émet RIEN, même avec la clé posée et le consentement donné', () => {
    const CLE = process.env.EXPO_PUBLIC_POSTHOG_KEY;

    beforeEach(async () => {
      await AsyncStorage.clear();
      vi.resetModules();
      // La clé est lue AU CHARGEMENT du module : elle se pose donc avant l'import.
      // Sans ça, le test passerait au vert grâce à l'absence de clé — c'est-à-dire
      // en mesurant autre chose que ce qu'il prétend (`capture` a DEUX sorties
      // anticipées, et on veut prouver que c'est la PREMIÈRE qui agit).
      process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_faux_pour_le_test';
    });

    afterEach(() => {
      if (CLE === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
      else process.env.EXPO_PUBLIC_POSTHOG_KEY = CLE;
      vi.restoreAllMocks();
    });

    // ── L'ORDRE DES TROIS REMPARTS, ENFIN COMPTÉ ─────────────────────────
    //
    // 🔴 LE DÉFAUT MESURÉ (contre-audit CA-2-04, 2026-08-27). Le §5 de la synthèse
    // affirmait « trois remparts dans le bon ordre, la garde passant AVANT la lecture
    // du consentement, et 14 assertions qui la tiennent ». AUCUNE des 14 ne
    // contraignait l'ordre : inverser `lib/analytics.ts` pour lire le consentement
    // d'abord laissait tout vert, y compris les deux tests ci-dessous — ils posent le
    // consentement à `granted`, donc la seconde garde les sauve. La propriété qui a
    // rendu l'OTA d'extinction obligatoire n'était gardée par rien d'exécutable.
    //
    // ⚠️ Deux sondes, et il faut les deux. La comportementale ne vaut que tant que la
    // constante est à `false` ; celle qui lit la source vaut dans les deux états, donc
    // elle survivra au jour où la mesure revient. Une seule des deux serait une
    // protection qui s'éteint avec le drapeau qu'elle garde.
    it('🔴 éteint, le consentement n’est même pas LU — la garde passe avant', async () => {
      // Sans consentement posé, `getAnalyticsConsent` doit lire AsyncStorage. Si la
      // garde du drapeau est première, on n'y arrive jamais. Déplacer la garde d'une
      // ligne fait apparaître cette lecture — et ce test rougit.
      // ⚠️ L'ESPION SE POSE SUR LE MÊME REGISTRE QUE LE MODULE. `vi.resetModules()`
      // en `beforeEach` fait que `../analytics` réimporte un AsyncStorage FRAIS :
      // espionner celui du haut de ce fichier surveille un autre objet, et la sonde
      // reste verte quoi qu'il arrive. Mesuré — la première version l'était.
      const mod = await import('../analytics');
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      const lu = vi.spyOn(AS, 'getItem');
      await mod.capture(mod.Events.planOpened, { x: 1 });
      const consentLu = lu.mock.calls.some(([k]) => String(k).includes('analyticsConsent'));
      expect(consentLu, 'le consentement a été lu alors que la mesure est éteinte : la garde n’est plus la première').toBe(false);
    });

    it('🔴 dans la SOURCE, le drapeau est testé avant la lecture du consentement', async () => {
      // Vaut quel que soit l'état du drapeau — c'est ce qui rend cette sonde utile
      // le jour où la mesure revient, là où la précédente cessera de mesurer.
      const corps = /export async function capture\([\s\S]*?\n}/.exec(lire('lib/analytics.ts'))?.[0] ?? '';
      expect(corps, 'corps de capture() introuvable').not.toBe('');
      const drapeau = corps.indexOf('STATISTIQUES_USAGE_ACTIVES');
      const consentement = corps.indexOf('getAnalyticsConsent');
      const reseau = corps.indexOf('fetch(');
      expect(drapeau, 'la garde du drapeau a disparu de capture()').toBeGreaterThan(-1);
      expect(consentement, 'la lecture du consentement a disparu de capture()').toBeGreaterThan(-1);
      expect(reseau, 'l’appel réseau a disparu de capture()').toBeGreaterThan(-1);
      expect(drapeau, 'le consentement est lu AVANT la garde du drapeau').toBeLessThan(consentement);
      expect(consentement, 'le réseau est atteint AVANT la lecture du consentement').toBeLessThan(reseau);
    });

    it('aucun appel réseau', async () => {
      const appels = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
      const mod = await import('../analytics');
      await mod.setAnalyticsConsent('granted');       // le pire cas : il a dit OUI
      await mod.capture(mod.Events.planOpened, { x: 1 });
      await mod.capture(mod.Events.mealCooked, { meal_type: 'lunch' });
      expect(appels, 'un event est parti alors que la mesure est éteinte').not.toHaveBeenCalled();
    });

    it('et aucun identifiant pseudonyme n’est CRÉÉ au passage', async () => {
      // `distinctId()` en pose un à la première émission. Éteint, il ne doit pas
      // exister : sinon l'app fabriquerait un identifiant de mesure pour personne,
      // et la ligne « Supprimer mes statistiques » apparaîtrait à des gens dont
      // rien n'est jamais parti.
      //
      // 🔴 LE STOCKAGE SE RELIT DANS LE MÊME GRAPHE DE MODULES QUE `capture`, et ce
      // n'est pas un détail d'écriture : `vi.resetModules()` reconstruit le registre,
      // donc le mock importé en tête de fichier N'EST PLUS celui qu'écrit le module
      // fraîchement importé. Première version : elle interrogeait le mock du dessus,
      // qui restait vide quoi qu'il arrive — le test passait au vert **avec la
      // constante à `true`**, c'est-à-dire en ne mesurant rien. Trouvé en le mutant,
      // pas en le relisant.
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
      const mod = await import('../analytics');
      const stockage = (await import('@react-native-async-storage/async-storage')).default;
      await mod.setAnalyticsConsent('granted');
      await mod.capture(mod.Events.planOpened);
      expect(await stockage.getItem('@kyroz:analyticsId')).toBeNull();
    });
  });

  // ── Le câblage : plus rien ne le PROPOSE ────────────────────────────────
  describe('aucun écran ne demande ni ne propose la mesure', () => {
    it('l’inscription ne monte l’écran de consentement que sous la constante', () => {
      const src = lire('app/(auth)/onboarding.tsx');
      const i = src.indexOf('<AnalyticsConsentStep');
      expect(i, 'l’écran n’est plus monté nulle part — il devait rester, pas disparaître').toBeGreaterThan(0);
      // La garde tient dans les lignes qui précèdent le montage.
      expect(src.slice(Math.max(0, i - 400), i)).toContain('STATISTIQUES_USAGE_ACTIVES');
    });

    it('l’interrupteur des Réglages est derrière la constante', () => {
      const src = lire('components/ReglagesSheet.tsx');
      const i = src.indexOf("<Text style={s.label}>Statistiques d'usage</Text>");
      expect(i).toBeGreaterThan(0);
      expect(src.slice(Math.max(0, i - 300), i)).toContain('STATISTIQUES_USAGE_ACTIVES');
    });

    it('🔴 « Supprimer mes statistiques » est parti AUSSI — les données sont effacées', () => {
      // ⚠️ CETTE ASSERTION A ÉTÉ ÉCRITE À L'ENVERS LE MATIN MÊME, et le revirement
      // mérite d'être lu : tant que des mesures existaient chez le prestataire, la
      // ligne devait RESTER hors de la constante — un droit à l'effacement ne se
      // retire pas tant qu'il a un objet. C'est la suppression à la source (décision
      // fondateur, « je vais supprimer et voilà ») qui l'a rendue sans objet, pas
      // l'extinction de la collecte. Les deux sont des faits différents, et seul le
      // premier autorise ce test-ci.
      // ➡️ Le chemin générique demeure : « Confidentialité & CGU » porte l'adresse
      // de contact RGPD, qui couvre n'importe quelle demande résiduelle.
      const src = lire('components/ReglagesSheet.tsx');
      const i = src.indexOf('Supprimer mes statistiques');
      expect(i).toBeGreaterThan(0);       // la ligne existe encore dans le code…
      const avant = src.slice(Math.max(0, i - 300), i);
      expect(avant).toContain('STATISTIQUES_USAGE_ACTIVES');   // …mais ne se rend plus
    });

    it('la section Confidentialité ne parle plus de mesure du tout', () => {
      // « Fais comme si posthog n'existait pas » : ni interrupteur, ni phrase
      // d'explication, ni ligne de suppression. Tout le bloc dépend de la constante.
      const src = lire('components/ReglagesSheet.tsx');
      for (const ancre of ["<Text style={s.label}>Statistiques d'usage</Text>", 'Supprimer mes statistiques', 'identifiant pseudonyme tiré sur cet appareil']) {
        const i = src.indexOf(ancre);
        expect(i, `ancre introuvable : ${ancre}`).toBeGreaterThan(0);
        expect(src.slice(Math.max(0, i - 900), i), ancre).toContain('STATISTIQUES_USAGE_ACTIVES');
      }
    });
  });

  it('🔴 les textes légaux ne déclarent plus aucune mesure', () => {
    // La politique et les CGU sont générées depuis `constants/legal.ts`. Un texte qui
    // décrirait encore un traitement inexistant serait faux dans l'autre sens — c'est
    // la réciproque de la leçon Resend (« un sous-traitant se déclare le jour où il
    // traite »), et `legal.test.ts` tient l'invariant dans les deux sens.
    const code = lire('constants/legal.ts');
    expect(code, 'PostHog est encore nommé dans un texte opposable').not.toMatch(/PostHog/);
    expect(code).not.toMatch(/analyticsProvider|analyticsStorage|analyticsRetention/);
  });

  // ── Ce qui NE doit pas avoir été supprimé ───────────────────────────────
  it('le périmètre reste gardé pour le jour où ça revient', () => {
    // Éteindre n'est pas supprimer : les 15 events, leur table et leur garde-fou
    // restent en place. Les effacer obligerait à re-arbitrer tout le périmètre le
    // jour du retour — et c'est cet arbitrage qui coûte, pas le code.
    const analytics = lire('lib/analytics.ts');
    expect(analytics).toContain('export const Events');
    expect(brut('components/AnalyticsConsentStep.tsx').length).toBeGreaterThan(1000);
  });
});
