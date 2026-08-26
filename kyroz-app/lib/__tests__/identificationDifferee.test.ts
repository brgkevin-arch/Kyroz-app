import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { premiumAccess, isGrandfathered, PAYWALL_LAUNCH } from '../premium';

const lire = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

// ── Constat 09-01 : l'identifiant de compte ne part chez RevenueCat que s'il SERT ──
//
// 🔴 CE QUE CES TESTS DOIVENT VOIR ROUGIR. Avant le 2026-08-26, `usePremium` appelait
// `identifyUser(uid)` à chaque changement de compte, sans condition — donc l'identifiant
// Supabase partait pour tout le monde, abonné ou non. Le §2 de la politique annonçait
// l'inverse (« uniquement si vous souscrivez »).

describe('09-01 — l’identifiant ne part que si le verdict en dépend', () => {
  it('🔴 le hook ne peut plus identifier sans condition', () => {
    const src = lire('hooks/usePremium.ts');
    // ⚠️ On vise l'APPEL, pas la mention du docstring : `identifyUser(uid)` apparaît
    // aussi dans le commentaire au-dessus, et la première version de ce test tombait
    // dessus — elle mesurait un commentaire, pas du code.
    const i = src.indexOf('identifyUser(uid).then(');
    expect(i).toBeGreaterThan(0);
    // La garde doit précéder l'appel, dans le même effet.
    expect(src.slice(Math.max(0, i - 900), i)).toContain('if (!necessaire) return;');
  });

  it('🔴 la nécessité se calcule sur les DEUX sorties anticipées de `premiumAccess`', () => {
    // Paywall pas lancé → le verdict est rendu sans lire `entitled`, donc rien à demander.
    expect(premiumAccess({ entitled: false, createdAt: '2026-01-01', launch: null }).reason)
      .toBe('not_launched');
    // Compte antérieur au lancement → idem, l'accès est accordé avant toute interrogation.
    expect(premiumAccess({ entitled: false, createdAt: '2026-01-01', launch: '2026-09-01' }).reason)
      .toBe('grandfathered');
    // Compte postérieur SANS abonnement → là, et là seulement, `entitled` décide.
    expect(premiumAccess({ entitled: false, createdAt: '2026-10-01', launch: '2026-09-01' }).reason)
      .toBe('locked');
    expect(premiumAccess({ entitled: true, createdAt: '2026-10-01', launch: '2026-09-01' }).reason)
      .toBe('entitled');
  });

  it('une date de création inconnue ne déclenche AUCUNE identification', () => {
    // `isGrandfathered` rend `true` sur une date absente — se tromper en donnant.
    // Conséquence directe : pas de verdict à trancher, donc pas d’identifiant à envoyer.
    expect(isGrandfathered(undefined, '2026-09-01')).toBe(true);
    expect(isGrandfathered(null, '2026-09-01')).toBe(true);
  });

  it('l’écran d’achat, LUI, force l’identification — sinon l’achat serait anonyme', () => {
    const src = lire('app/kyroz-plus.tsx');
    expect(src).toContain('usePremium({ forcerIdentification: true })');
  });

  it('aucun AUTRE écran ne force l’identification', () => {
    for (const f of ['app/(tabs)/profil.tsx', 'components/WeightCheckin.tsx']) {
      expect(lire(f)).not.toContain('forcerIdentification');
    }
  });

  it('témoin : tant que le paywall n’est pas lancé, la question ne se pose pour personne', () => {
    // Si ce test rougit un jour, c'est que la date a été posée — et il faudra alors
    // vérifier sur appareil que l'identification part bien pour les comptes verrouillés.
    expect(PAYWALL_LAUNCH).toBeNull();
  });
});
