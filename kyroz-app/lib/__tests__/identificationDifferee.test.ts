import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { premiumAccess, isGrandfathered, PAYWALL_LAUNCH, entitlementNecessaire } from '../premium';

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

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

  it('🔴 aucun AUTRE fichier ne force l’identification — recensé, pas listé', () => {
    // ⚠️ Ce test itérait sur DEUX chemins écrits à la main. Un troisième écran posant
    // `forcerIdentification: true` serait passé sans que rien ne bouge — une liste
    // écrite à la main ne recense pas, elle se souvient. On balaye désormais le dépôt.
    const dossiers = ['app', 'components', 'hooks', 'lib'];
    const fichiers: string[] = [];
    const parcours = (d: string) => {
      for (const e of readdirSync(join(RACINE, d), { withFileTypes: true })) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        const rel = `${d}/${e.name}`;
        if (e.isDirectory()) parcours(rel);
        else if (/\.tsx?$/.test(e.name)) fichiers.push(rel);
      }
    };
    dossiers.forEach(parcours);
    expect(fichiers.length, 'le balayage n’a rien trouvé : il ne mesure RIEN').toBeGreaterThan(50);

    const porteurs = fichiers.filter((f) => lire(f).includes('forcerIdentification'));
    // `hooks/usePremium.ts` DÉFINIT l'option ; `app/kyroz-plus.tsx` est le seul écran
    // qui a le droit de la poser — acheter exige que le fournisseur sache à quel
    // compte rattacher l'achat.
    expect(porteurs.sort()).toEqual(['app/kyroz-plus.tsx', 'hooks/usePremium.ts']);
  });

  // ── LA FONCTION QUI DÉCIDE, MESURÉE ────────────────────────────────────────
  //
  // Les six tests ci-dessus mesuraient des chaînes de source et des fonctions
  // voisines. Aucun ne touchait `entitlementNecessaire` — celle dont un mot inversé
  // renvoie l'identifiant de tout le monde à RevenueCat.
  describe('entitlementNecessaire — sa table de vérité', () => {
    it('🔴 tant que `PAYWALL_LAUNCH` est null, elle est fausse pour TOUT LE MONDE', () => {
      // C'est l'état d'aujourd'hui, donc l'état de 100 % des comptes.
      expect(PAYWALL_LAUNCH, 'la date a été posée — relire ce bloc en entier').toBeNull();
      for (const createdAt of [null, undefined, '2020-01-01T00:00:00Z', '2099-01-01T00:00:00Z']) {
        expect(entitlementNecessaire(createdAt), `créé le ${createdAt}`).toBe(false);
      }
    });

    it('une date de création absente ne force JAMAIS l’identification', () => {
      // Se tromper en DONNANT, jamais en retirant : sans date, `isGrandfathered` est
      // vrai, donc l'accès est accordé sans interroger personne. La règle doit tenir
      // le jour où `PAYWALL_LAUNCH` sera posée — c'est là qu'elle compte vraiment.
      expect(entitlementNecessaire(null)).toBe(false);
      expect(entitlementNecessaire(undefined)).toBe(false);
    });
  });

  it('témoin : tant que le paywall n’est pas lancé, la question ne se pose pour personne', () => {
    // Si ce test rougit un jour, c'est que la date a été posée — et il faudra alors
    // vérifier sur appareil que l'identification part bien pour les comptes verrouillés.
    expect(PAYWALL_LAUNCH).toBeNull();
  });
});
