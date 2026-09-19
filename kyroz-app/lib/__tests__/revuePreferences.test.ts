import { describe, it, expect, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPreferencesRevues, loadPreferencesRevues, marquerPreferencesRevues, subscribePreferencesRevues, VERSION_QUESTION,
} from '../revuePreferences';

// ── « Revois tes protéines préférées » (décision fondateur du 2026-09-19) ─────────────────
// Un compte créé avant la question des protéines par régime la reçoit sur son Plan, jusqu'à ce
// qu'il enregistre ses préférences ; un nouvel inscrit ne la voit jamais. Ce qui se garde ici :
// la carte ne clignote pas au démarrage, elle apparaît pour un ancien compte, et elle part
// PARTOUT dès la réponse (le Profil l'écrit, le Plan la lit — CLAUDE.md §11).

const CLE = '@kyroz:preferencesProteinesRevues';

describe('la carte « revois tes préférences »', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('ancien compte (jamais répondu) : la carte apparaît après le chargement', async () => {
    await loadPreferencesRevues();
    expect(getPreferencesRevues()).toBe(false);
  });

  it('répondre la fait partir, le dit aux écrans abonnés, et le retient', async () => {
    await loadPreferencesRevues();
    let appels = 0;
    const stop = subscribePreferencesRevues(() => { appels++; });
    marquerPreferencesRevues();
    stop();
    expect(getPreferencesRevues()).toBe(true);
    expect(appels).toBe(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(await AsyncStorage.getItem(CLE)).toBe(VERSION_QUESTION);
    // Au démarrage suivant, elle ne revient pas.
    await loadPreferencesRevues();
    expect(getPreferencesRevues()).toBe(true);
  });

  it('une réponse à une AUTRE version de la question ne compte pas', async () => {
    await AsyncStorage.setItem(CLE, '2020-01-01');
    await loadPreferencesRevues();
    expect(getPreferencesRevues()).toBe(false);
  });
});
