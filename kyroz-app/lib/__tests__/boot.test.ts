import { describe, it, expect } from 'vitest';
import { withBudget, AUTH_BUDGET_MS, HYDRATION_BUDGET_MS } from '../boot';

// Ce que ces tests protègent : le démarrage de l'app ne doit JAMAIS dépendre
// d'une réponse réseau. Mesuré le 2026-08-02, avant correction : avec un réseau
// qui ne répond pas, l'écran restait sur le splash indéfiniment alors que le
// profil et le plan étaient déjà sur l'appareil.

describe('withBudget', () => {
  it('rend la valeur quand la promesse répond dans le budget', async () => {
    const res = await withBudget(Promise.resolve('ok'), 100);
    expect(res).toEqual({ ok: true, value: 'ok' });
  });

  it('rend la main au budget quand la promesse ne répond JAMAIS', async () => {
    const jamais = new Promise<string>(() => {}); // le cas réel : fetch sans expiration
    const t0 = Date.now();
    const res = await withBudget(jamais, 40);
    expect(res).toEqual({ ok: false, reason: 'timeout' });
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('ne rejette pas quand la promesse échoue — l\'échec se lit dans ok:false', async () => {
    const res = await withBudget(Promise.reject(new Error('réseau')), 100);
    expect(res).toEqual({ ok: false, reason: 'error' });
  });

  it('ignore une réponse arrivée APRÈS le budget (une seule résolution)', async () => {
    const tardive = new Promise<string>((r) => setTimeout(() => r('trop tard'), 60));
    const res = await withBudget(tardive, 20);
    expect(res).toEqual({ ok: false, reason: 'timeout' });
    await new Promise((r) => setTimeout(r, 80)); // la promesse finit : rien ne doit casser
    expect(res).toEqual({ ok: false, reason: 'timeout' });
  });

  it('les budgets restent sous le seuil de patience d\'un démarrage', () => {
    // Repère volontairement grossier : il n'existe que pour qu'un futur réglage
    // à 30 s (« pour laisser le temps au réseau ») fasse rougir un test.
    expect(AUTH_BUDGET_MS).toBeLessThanOrEqual(2000);
    expect(HYDRATION_BUDGET_MS).toBeLessThanOrEqual(8000);
  });
});
