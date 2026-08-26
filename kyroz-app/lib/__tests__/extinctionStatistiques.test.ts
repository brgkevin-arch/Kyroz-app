import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATISTIQUES_USAGE_ACTIVES } from '../featureFlags';

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
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

describe('Les statistiques d’usage sont éteintes', () => {
  it('la constante est bien à false — le reste de ce fichier en dépend', () => {
    expect(STATISTIQUES_USAGE_ACTIVES).toBe(false);
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

    it('🔴 « Supprimer mes statistiques » reste, lui, hors de la constante', () => {
      // Le droit à l'effacement ne s'éteint pas avec la collecte : des mesures ont
      // pu partir entre le 2026-08-18 et l'extinction. La ligne dépend d'un
      // pseudonyme EXISTANT, pas de la constante — sinon on retirerait le seul
      // chemin de suppression aux seules personnes concernées.
      const src = lire('components/ReglagesSheet.tsx');
      const i = src.indexOf('Supprimer mes statistiques');
      expect(i).toBeGreaterThan(0);
      const avant = src.slice(Math.max(0, i - 300), i);
      expect(avant).toContain('pseudonyme &&');
      expect(avant).not.toContain('STATISTIQUES_USAGE_ACTIVES');
    });
  });

  // ── Ce qui NE doit pas avoir été supprimé ───────────────────────────────
  it('le périmètre reste gardé pour le jour où ça revient', () => {
    // Éteindre n'est pas supprimer : les 15 events, leur table et leur garde-fou
    // restent en place. Les effacer obligerait à re-arbitrer tout le périmètre le
    // jour du retour — et c'est cet arbitrage qui coûte, pas le code.
    const analytics = lire('lib/analytics.ts');
    expect(analytics).toContain('export const Events');
    expect(lire('components/AnalyticsConsentStep.tsx').length).toBeGreaterThan(1000);
  });
});
