import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LEGAL, PRIVACY_POLICY, TERMS_OF_USE } from '../../constants/legal';
import { CIBLES, renderHtml, renderMarkdown } from '../../scripts/gen-legal';

/**
 * Le texte légal a UNE source — `constants/legal.ts` — et toutes les autres surfaces
 * s'en fabriquent (`npm run gen:legal`).
 *
 * ⚠️ CE FICHIER A CHANGÉ DE MÉTIER LE 2026-08-18, et le motif compte. Il vérifiait
 * jusque-là que chaque paragraphe de la source se retrouvait dans `public/legal.html`,
 * recopié à la main. Il a tenu son poste — mais un test qui DÉTECTE une dérive suppose
 * encore quelqu'un pour la réparer juste, et il ne pouvait rien dire des surfaces qu'il
 * ne connaissait pas. Le recensement du 2026-08-18 en a trouvé six, dont deux qui
 * mentaient en production :
 *   • `docs/politique-confidentialite-kyroz.md` — 10 sections contre 11, § Mineurs
 *     absente, gabarits `[Nom / Raison sociale]` jamais remplis (depuis le 2026-08-05) ;
 *   • `https://kyroz.app/legal.html` — figée au 15 juin 2026, Resend absent, et un
 *     § Mineurs à **16 ans** quand l'app bloque à **18** (`lib/safety.ts::MIN_AGE`).
 * ➡️ Une copie régénérée ne peut pas diverger. Ce fichier ne surveille donc plus une
 * recopie : il vérifie qu'on n'a pas oublié de RÉGÉNÉRER.
 */

describe('les surfaces générées sont à jour', () => {
  // Le test que l'ancien garde-fou ne pouvait pas écrire : non pas « le miroir
  // contient les paragraphes » (vrai même s'il en contient d'autres, périmés), mais
  // « le fichier sur le disque est EXACTEMENT ce que la source produit ».
  it.each([
    ['public/legal.html', CIBLES.html, renderHtml],
    ['docs/politique-confidentialite-kyroz.md', CIBLES.markdown, renderMarkdown],
  ])('%s correspond à constants/legal.ts', (_nom, chemin, rendre) => {
    expect(
      readFileSync(chemin as string, 'utf8'),
      'fichier légal périmé → corrige constants/legal.ts, puis : npm run gen:legal'
    ).toBe((rendre as () => string)());
  });
});

/** Tout ce qu'un lecteur peut lire, quelle que soit la surface. */
const TOUS_LES_PARAS = [...PRIVACY_POLICY, ...TERMS_OF_USE].flatMap((s) => s.paragraphs).join(' ');

describe("ce que le texte doit dire avant qu'un abonnement puisse être vendu", () => {
  // Ces phrases ne sont pas décoratives : deux d'entre elles sont contrôlées par
  // la revue Apple (Guideline 3.1.2), la troisième est une obligation RGPD.

  it('annonce qu’un prestataire recevra l’identifiant du compte', () => {
    // Sans ça, §5 promet « aucun tiers » alors qu'un tiers recevra l'identifiant du
    // compte. La politique deviendrait fausse le jour du premier abonné.
    expect(TOUS_LES_PARAS).toMatch(/prestataire/);
    expect(TOUS_LES_PARAS).toMatch(/identifiant technique de votre compte/);
  });

  it('ne NOMME aucun prestataire tant qu’aucun contrat n’existe', () => {
    // ⚠️ Ce test protège le sens INVERSE du précédent, et il a une histoire : une
    // première version nommait « RevenueCat, Inc. » dans un document public alors
    // qu'aucun contrat n'avait été signé et que le choix technique n'était pas arrêté.
    // Désigner un sous-traitant qui n'en est pas un est le même mensonge que taire
    // celui qui l'est. Le RGPD autorise les CATÉGORIES de destinataires (art. 13-1-e).
    // ➡️ Le jour où le contrat existe : on met le nom ICI et dans le texte, ensemble,
    // avec le cadre du transfert hors UE (art. 13-1-f) qui ne se lit que dans le contrat.
    expect(TOUS_LES_PARAS).not.toMatch(/RevenueCat|Stripe|Adapty|Superwall/i);
  });

  it('dit que le renouvellement est automatique ET comment y échapper', () => {
    expect(TOUS_LES_PARAS).toMatch(/renouvelle automatiquement/);
    expect(TOUS_LES_PARAS).toMatch(/24 heures/);
  });

  it('dit que supprimer son compte Kyroz n’annule PAS l’abonnement', () => {
    // Le piège coûte de l'argent réel à quelqu'un qui croit avoir tout arrêté.
    expect(TOUS_LES_PARAS).toMatch(/n’annule PAS un abonnement|n'annule PAS un abonnement/);
  });

  it('ne promet AUCUNE donnée bancaire chez Kyroz', () => {
    expect(TOUS_LES_PARAS).toMatch(/coordonnée bancaire/);
  });
});

describe('la déclaration de mesure d’audience ne peut plus disparaître', () => {
  // Ces trois assertions gardent le lot du 2026-08-18. Elles ne testent pas du code :
  // elles comptent une règle qui, sans elles, resterait un paragraphe de .md — et
  // c'est exactement comme ça que « aucun outil d'analyse tiers » a survécu jusqu'au
  // jour où l'app demandait déjà le consentement en production.

  it('NOMME le destinataire des mesures', () => {
    // RGPD art. 13-1-e : un consentement qui ne dit pas à qui les données vont n'est
    // pas éclairé. Le nom doit vivre dans le texte, pas seulement au registre.
    expect(TOUS_LES_PARAS).toMatch(/PostHog/);
  });

  it('n’affirme plus qu’aucun outil d’analyse tiers n’est utilisé', () => {
    // La phrase a été vraie pendant des mois, ce qui la rendait rassurante à la
    // relecture — et invisible le jour où elle a cessé de l'être.
    expect(TOUS_LES_PARAS).not.toMatch(/outil d’analyse tiers|outil d'analyse tiers/);
  });

  it('dit « pseudonyme », jamais « anonyme »', () => {
    // ⚠️ L'identifiant est STABLE et SUPPRIMABLE sur demande : les deux affirmations
    // ne peuvent pas tenir ensemble. Une donnée qu'on sait rattacher à un individu
    // pour l'effacer n'est pas anonyme (synthèse analytics §3.3). Le vocabulaire fait
    // partie de la promesse.
    expect(TOUS_LES_PARAS).toMatch(/pseudonyme/);
    expect(TOUS_LES_PARAS).not.toMatch(/anonyme/i);
  });
});

describe('aucun gabarit ne part en production', () => {
  // `docs/politique-confidentialite-kyroz.md` a porté `[Nom / Raison sociale]`,
  // `[SAS Kyroz, SIREN n° XXX]` et `[Adresse postale]` pendant des mois, sur la
  // version destinée à l'URL publique. Un gabarit ne se voit pas à la relecture :
  // il ressemble à du texte, et il ne fait rougir aucun outil. Maintenant, si.
  const GABARIT = /\[[A-ZÉÈÀÎÔ][^\]]{2,}\]/;

  it.each([
    ['les paragraphes de la source', TOUS_LES_PARAS],
    ['les valeurs de LEGAL', Object.values(LEGAL).join(' ')],
    ['la page publique générée', renderHtml()],
    ['le markdown généré', renderMarkdown()],
  ])('%s ne contient aucun [Gabarit] non rempli', (_nom, texte) => {
    expect(texte as string).not.toMatch(GABARIT);
  });
});
