import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  // ⚠️ CE TEST A ÉTÉ RETOURNÉ LE 2026-08-26, en suivant sa propre consigne. Il exigeait
  // qu'AUCUN prestataire ne soit nommé : une première version (2026-08-02) écrivait
  // « RevenueCat, Inc. » alors qu'aucun contrat n'existait, et désigner un sous-traitant
  // qui n'en est pas un est le même mensonge que taire celui qui l'est. Sa note disait
  // déjà quoi faire ensuite : « le jour où le contrat existe : on met le nom ICI et dans
  // le texte, ensemble, avec le cadre du transfert hors UE ». Ce jour est arrivé — la clé
  // est en production, le SDK traite. Ce qu'il garde est donc l'invariant, pas l'état :
  // **on ne nomme que ce qui est réellement branché, et jamais sans son cadre.**
  it('ne nomme QUE le prestataire réellement branché', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
    const branche = Object.keys(pkg.dependencies ?? {}).includes('react-native-purchases');
    expect(branche, 'le SDK d’abonnement n’est plus une dépendance — le nom doit repartir du texte').toBe(true);
    expect(TOUS_LES_PARAS).toContain(LEGAL.subscriptionProvider);
    // Les concurrents jamais intégrés n'ont rien à faire dans un document public.
    expect(TOUS_LES_PARAS).not.toMatch(/Stripe|Adapty|Superwall|Paddle/i);
  });

  it('nomme le cadre du transfert avec le prestataire, jamais l’un sans l’autre', () => {
    // Art. 13-1-f : nommer un destinataire hors UE sans dire ce qui encadre le transfert
    // laisse le lecteur devant un fait brut. Les deux vont ensemble ou pas du tout.
    expect(TOUS_LES_PARAS).toMatch(/clauses contractuelles types/i);
  });

  it('ne prête PAS à RevenueCat un cadre qu’il ne revendique pas', () => {
    // 🔴 Le piège concret : le paragraphe voisin, écrit pour Resend, cumule clauses
    // contractuelles types ET EU-U.S. Data Privacy Framework. Le DPA de RevenueCat, lu
    // en entier le 2026-08-26, ne mentionne AUCUN DPF. Recopier la phrase de Resend —
    // le geste le plus naturel du monde — ferait affirmer une adhésion inexistante.
    const paraAbonnement = [...PRIVACY_POLICY, ...TERMS_OF_USE]
      .flatMap((sec) => sec.paragraphs)
      .filter((par) => par.includes(LEGAL.subscriptionProvider));
    expect(paraAbonnement.length, 'le prestataire n’apparaît dans aucun paragraphe').toBeGreaterThan(0);
    for (const par of paraAbonnement) {
      expect(par, `« ${par.slice(0, 60)}… » revendique un DPF que le DPA ne déclare pas`)
        .not.toMatch(/Data Privacy Framework/i);
    }
  });

  it('dit que le renouvellement est automatique ET comment y échapper', () => {
    expect(TOUS_LES_PARAS).toMatch(/renouvelle automatiquement/);
    expect(TOUS_LES_PARAS).toMatch(/24 heures/);
  });

  // Ajouté le 2026-08-25 avec la mécanique early bird. Ce n'est pas une obligation
  // Apple : c'est l'ENGAGEMENT qui rend la hausse par cohortes acceptable. La seule
  // zone où la mécanique pouvait être perçue comme un piège est la reprise après
  // résiliation — une ligne suffit à l'éliminer, à condition qu'elle soit écrite.
  it('promet un tarif BLOQUÉ à la souscription', () => {
    expect(TOUS_LES_PARAS).toMatch(/tarif de votre abonnement est celui affiché au moment où vous souscrivez/i);
    expect(TOUS_LES_PARAS).toMatch(/reste inchangé tant que votre abonnement demeure actif/i);
  });

  it('dit qu’une hausse ne touche QUE les nouvelles souscriptions', () => {
    expect(TOUS_LES_PARAS).toMatch(/ne s’applique qu’aux nouvelles souscriptions/i);
  });

  it('dit ce qui se passe si on résilie puis revient — le seul point qui pourrait piéger', () => {
    // Sans cette phrase, un abonné de la première heure découvre le tarif courant le
    // jour où ça lui arrive. C'est le comportement natif des stores, pas une décision
    // Kyroz — mais le taire reviendrait à laisser croire l'inverse.
    expect(TOUS_LES_PARAS).toMatch(/si vous résiliez puis souscrivez à nouveau/i);
    expect(TOUS_LES_PARAS).toMatch(/tarif en vigueur à cette date/i);
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

// ── VERROU : le texte ne bouge pas sans que sa date bouge ────────────────────
//
// POURQUOI CE VERROU EXISTE
//
// Le 2026-08-25, deux paragraphes ont été réécrits (« garde-manger » → « réserve »)
// et un paragraphe ENTIER ajouté aux CGU : le blocage du tarif à la souscription.
// Ce n'est pas une reformulation, c'est un ENGAGEMENT. `LEGAL.effectiveDate`, lui,
// est resté au 23 août — pendant trois jours, les documents ont annoncé une date de
// dernière mise à jour ANTÉRIEURE à leur dernière modification, sur un paragraphe
// qui engage. Un lecteur en concluait que l'engagement valait déjà le 23.
//
// Les cinq mises à jour précédentes de cette date ont été faites à la main, et rien
// ne les imposait. C'est la seule raison pour laquelle la sixième a pu être oubliée :
// pas une négligence, une absence de cliquet.
//
// ⚠️ CE QU'IL NE SAIT PAS FAIRE, et il faut le dire : il ne peut pas VÉRIFIER que la
// date est juste — elle s'arbitre (c'est celle de la livraison, pas celle du commit).
// Il ne peut pas non plus empêcher quelqu'un de mettre à jour l'empreinte sans
// toucher la date. Ce qu'il garantit, c'est qu'on ne peut plus le faire SANS LE
// SAVOIR : les deux valeurs sont côte à côte, et la seconde ne se met à jour qu'en
// lisant le message de la première.

import { createHash } from 'node:crypto';

/**
 * L'état enregistré du texte légal. **Les deux valeurs se modifient ENSEMBLE.**
 * Quand l'empreinte rougit : arbitre la nouvelle date d'entrée en vigueur, écris-la
 * dans `constants/legal.ts`, reporte-la ici, puis remplace l'empreinte par celle
 * que le test affiche. Et régénère les miroirs (`npm run gen:legal`).
 */
const DERNIERE_REVISION = {
  date: '26 août 2026',
  // ⚠️ **DEUXIÈME RÉVISION DU MÊME JOUR** (2026-08-26) : le §5 est passé du
  // conditionnel au réel — RevenueCat nommé, cadre du transfert écrit — quelques
  // heures après la première publication du 26 août. La DATE ne bouge donc pas, et
  // c'est un arbitrage, pas un oubli : le texte entre en vigueur le jour même, et
  // post-dater au 27 annoncerait une prise d'effet qui n'a pas lieu.
  // ➡️ Si une révision tombait un AUTRE jour, c'est la date qu'il faudrait bouger
  // d'abord — l'empreinte ne se met à jour qu'après cet arbitrage-là.
  empreinte: '67c329629431',
};

/**
 * L'empreinte porte la SUBSTANCE, pas la date : le paragraphe « Date de dernière
 * mise à jour : … » interpole `effectiveDate`, donc sans neutralisation, bouger la
 * date suffirait à faire bouger l'empreinte — et les deux ne diraient plus rien
 * l'une de l'autre.
 */
function empreinteDuTexte(): string {
  const brut = [...PRIVACY_POLICY, ...TERMS_OF_USE]
    .map((s) => `${s.title}\n${s.paragraphs.join('\n')}`)
    .join('\n\n')
    .split(LEGAL.effectiveDate).join('«DATE»');
  return createHash('sha256').update(brut, 'utf8').digest('hex').slice(0, 12);
}

describe('la date de mise à jour suit le texte', () => {
  it('la date enregistrée ici est celle que les documents affichent', () => {
    expect(
      LEGAL.effectiveDate,
      'la date a bougé dans constants/legal.ts sans être reportée ici'
    ).toBe(DERNIERE_REVISION.date);
  });

  it('le texte n’a pas changé depuis cette date', () => {
    expect(
      empreinteDuTexte(),
      `LE TEXTE LÉGAL A CHANGÉ. Arbitre la date d'entrée en vigueur (celle de la LIVRAISON, pas du commit), écris-la dans constants/legal.ts ET dans DERNIERE_REVISION.date, reporte l'empreinte ci-dessous, puis : npm run gen:legal`
    ).toBe(DERNIERE_REVISION.empreinte);
  });

  it('la date est bien servie au lecteur, et pas seulement stockée', () => {
    expect(TOUS_LES_PARAS).toContain(LEGAL.effectiveDate);
  });
});
