import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL, PRIVACY_POLICY, TERMS_OF_USE } from '../../constants/legal';
import { MIN_AGE, AGE_BOUNDS } from '../safety';
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

  // 🔴 Servi en PRODUCTION sur les trois surfaces le 2026-08-26 : « RevenueCat, Inc.. ».
  // La raison sociale finit par un point, la phrase en ajoutait un. Ça ne se voit pas en
  // relisant le gabarit — le point est DANS la donnée, pas dans le texte — et ça se voit
  // très bien à l'écran. Le compte est bête, c'est exactement pour ça qu'il tient.
  it('aucun signe de ponctuation doublé dans le texte servi', () => {
    // ⚠️ Le motif vise le MÊME signe répété (`..`, `,,`), pas deux signes différents :
    // « Supabase Inc., sur des serveurs… » est correct — point d'abréviation suivi
    // d'une virgule. Une première version interdisait `[.,;:!?]{2}` et accusait cette
    // phrase-là. Un garde-fou trop large ne se fait pas obéir, il se fait désactiver.
    const DOUBLE = /([.,;:!?])\1/;
    for (const par of [...PRIVACY_POLICY, ...TERMS_OF_USE].flatMap((sec) => sec.paragraphs)) {
      const i = par.search(DOUBLE);
      expect(par, i < 0 ? '' : `« …${par.slice(Math.max(0, i - 45), i + 25)}… »`).not.toMatch(DOUBLE);
    }
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

describe('le texte et la mesure d’audience disent la MÊME chose', () => {
  // 🔴 CE BLOC A CHANGÉ DE SENS LE 2026-08-26, ET C'EST LE POINT.
  //
  // Il gardait le lot du 2026-08-18 : « le texte doit NOMMER PostHog », parce que
  // l'app demandait alors le consentement en production pour un outil que la
  // politique déclarait inexistant. La mesure étant éteinte et les textes purgés
  // (décision fondateur, « fais comme si posthog n'existait pas »), exiger ce nom
  // reviendrait à imposer la déclaration d'un traitement qui n'a plus lieu.
  //
  // ➡️ CE QUI EST GARDÉ EST L'INVARIANT, pas la formulation d'un jour donné : le
  // texte et le code doivent dire la même chose, dans les DEUX sens. C'est la
  // version symétrique de la leçon Resend — un sous-traitant se déclare le jour où
  // il traite, et cesse d'être déclaré le jour où il ne traite plus.

  it('🔴 la politique nomme PostHog SI ET SEULEMENT SI la mesure est active', () => {
    const nomme = /PostHog/.test(TOUS_LES_PARAS);
    expect(
      nomme,
      STATISTIQUES_USAGE_ACTIVES
        ? 'la mesure est ACTIVE mais le texte ne nomme pas son destinataire (RGPD art. 13-1-e)'
        : 'la mesure est ÉTEINTE mais le texte déclare encore un traitement qui n’a plus lieu'
    ).toBe(STATISTIQUES_USAGE_ACTIVES);
  });

  it('n’affirme jamais qu’aucun outil d’analyse tiers n’est utilisé', () => {
    // La phrase a été vraie pendant des mois, ce qui la rendait rassurante à la
    // relecture — et invisible le jour où elle a cessé de l'être. On ne la
    // réintroduit pas maintenant que c'est redevenu vrai : la prochaine bascule
    // ferait le même chemin, en silence.
    expect(TOUS_LES_PARAS).not.toMatch(/outil d’analyse tiers|outil d'analyse tiers/);
  });

  it('ne dit jamais « anonyme » — le mot est banni des textes', () => {
    // ⚠️ Un identifiant STABLE et SUPPRIMABLE sur demande n'est pas anonyme : les deux
    // affirmations ne peuvent pas tenir ensemble (synthèse analytics §3.3). La règle
    // survit à l'extinction, parce que c'est le mot qui est piégeux, pas l'outil.
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
import { STATISTIQUES_USAGE_ACTIVES } from '../featureFlags';

/**
 * L'état enregistré du texte légal. **Les deux valeurs se modifient ENSEMBLE.**
 * Quand l'empreinte rougit : arbitre la nouvelle date d'entrée en vigueur, écris-la
 * dans `constants/legal.ts`, reporte-la ici, puis remplace l'empreinte par celle
 * que le test affiche. Et régénère les miroirs (`npm run gen:legal`).
 */
const DERNIERE_REVISION = {
  date: '27 août 2026',
  // ⚠️ **SIXIÈME RÉVISION** (2026-08-27, même jour) : le `DISCLAIMER` disait « l'avis d'un
  // médecin ou diététicien-nutritionniste » quand `lib/methodologie.ts` dit « ou D'UN
  // diététicien-nutritionniste ». Deux variantes d'une phrase OBLIGATOIRE (§6, Apple
  // 1.4.1) sont deux occasions de diverger, et elles seront comparées mot à mot en revue
  // et à l'étape 9. Alignées (6b-bis-08). ⚠️ Le `DISCLAIMER` entre dans l'empreinte parce
  // qu'il est injecté dans le §4 des CGU (`:316`) — la date, elle, ne bouge pas : l'OTA
  // du 27 n'est toujours pas partie.
  //
  // ⚠️ **CINQUIÈME RÉVISION, ET LA PREMIÈRE D'UN AUTRE JOUR** (2026-08-27) : le §10
  // « Mineurs » cessait d'être vrai. Il affirmait « Aucun compte ne peut être créé en
  // deçà de cet âge » — or l'écran d'inscription ne demande ni âge ni date de
  // naissance : `canSubmit` (app/(auth)/login.tsx) vaut e-mail + mot de passe +
  // consentement. Le blocage existe, il vit à l'ONBOARDING (`AGE_BOUNDS[0]` dans
  // `basicsValid`, étape 2), et il est dur. C'est donc la phrase qui décrivait un
  // mécanisme que le code n'a jamais eu. Contre-audit V1, constat CA-8-03 — qui
  // désignait « les CGU » : la phrase est en réalité dans la POLITIQUE, et le §5 des
  // CGU (« vous vous engagez à avoir au moins 18 ans ») est un engagement de
  // l'utilisateur, pas une promesse de mécanisme : il est vrai et il ne bouge pas.
  // 🔴 **LA DATE BOUGE PARCE QUE LA RÉSERVE CI-DESSOUS LE PRESCRIT** : les révisions
  // du 26 ne sont toujours pas livrées, l'OTA a glissé au 27. C'est exactement le cas
  // prévu — « si l'OTA glisse au-delà du 26, c'est la DATE qu'il faut bouger avant de
  // publier ». Si elle glisse encore, refaire le même geste avant de publier.
  //
  // ⚠️ **QUATRIÈME RÉVISION DU MÊME JOUR** (2026-08-26) : le §6 cesse d'affirmer
  // « Aucune donnée de santé ne quitte l'Union européenne » — c'était FAUX, les
  // sauvegardes du système emportaient les données locales (audit V1, constat 09-02).
  // Android est traité (`android.allowBackup: false`), iOS attend un plugin natif, donc la
  // phrase est PRUDENTE au lieu d'être absolue, et elle dit à l'utilisateur comment
  // couper lui-même. 🔴 **Ne pas la re-durcir avant que les DEUX plateformes soient
  // traitées** : c'est l'erreur qu'elle vient de payer.
  //
  // ✅ **RÉVISION DU 2026-08-27 — LA CONDITION CI-DESSUS ÉTAIT DÉJÀ REMPLIE.** La phrase
  // est durcie, et ce n'est pas une entorse à la consigne : c'est elle qui est satisfaite.
  // La moitié iOS était réputée « demander un plugin natif, donc un nouveau binaire » —
  // FAUX, mesuré dans le paquet : `RNCAsyncStorage.mm:518-527` exclut le dossier
  // d'AsyncStorage de la sauvegarde **par défaut**, et le dépôt ne pose aucune surcharge.
  // Les photos, elles, vivent dans le répertoire de CACHE, qu'iOS ne sauvegarde pas.
  // 🔴 **CE QUE LA PRUDENCE COÛTAIT** : le texte demandait à l'utilisateur de couper sa
  // sauvegarde iCloud pour protéger ses données de santé — un geste réel, pour un risque
  // qui n'existe pas. *Une politique trop prudente n'est pas neutre : elle fait agir.*
  // ➡️ Et la leçon de méthode : une réserve écrite (« en attendant le prochain binaire »)
  // se re-mesure comme n'importe quelle prémisse. Celle-ci a survécu un jour à sa
  // péremption parce que personne n'a rouvert le paquet — le contre-audit l'avait pourtant
  // signalé (`CA-5-01`), et le texte, lui, n'avait pas suivi.
  //
  // ⚠️ **TROISIÈME RÉVISION DU MÊME JOUR** (2026-08-26) : la mention du médiateur de
  // la consommation est retirée du §10 (audit V1, constat 09-04) — elle promettait un
  // recours qui n'existe pas, l'adhésion n'étant obligatoire (L.612-1) qu'à partir de
  // la première vente. Même arbitrage que ci-dessous : la date ne bouge pas.
  // 🔴 **ET UNE RÉSERVE QUI N'AVAIT PAS LIEU D'ÊTRE LES DEUX FOIS PRÉCÉDENTES** : ce
  // texte-ci n'est PAS ENCORE LIVRÉ. Les deux révisions du 26 sont parties dans la
  // 24ᵉ OTA ; celle-ci attend la suivante. Tant qu'elle n'est pas publiée, « 26 août »
  // décrit la dernière version SERVIE, ce qui reste vrai. ➡️ Si l'OTA glisse au-delà
  // du 26, c'est la DATE qu'il faut bouger avant de publier, pas l'empreinte après.
  //
  // ⚠️ **DEUXIÈME RÉVISION DU MÊME JOUR** (2026-08-26) : le §5 est passé du
  // conditionnel au réel — RevenueCat nommé, cadre du transfert écrit — quelques
  // heures après la première publication du 26 août. La DATE ne bouge donc pas, et
  // c'est un arbitrage, pas un oubli : le texte entre en vigueur le jour même, et
  // post-dater au 27 annoncerait une prise d'effet qui n'a pas lieu.
  // ➡️ Si une révision tombait un AUTRE jour, c'est la date qu'il faudrait bouger
  // d'abord — l'empreinte ne se met à jour qu'après cet arbitrage-là.
  // ⚠️ **QUATRIÈME RÉVISION DU MÊME JOUR** (2026-08-26) : la mesure d'audience QUITTE
  // les textes. Décision fondateur, en deux temps le même jour — d'abord « éteindre »,
  // puis, une fois pesé ce qui avait réellement été collecté (huit jours, son propre
  // appareil et un testeur, supprimé à la source) : *« juste efface, fais comme si
  // posthog n'existait pas »*. Les paragraphes des §2, 3, 4, 5, 6, 7 et 9 sont donc
  // SUPPRIMÉS, pas passés au passé, et les trois constantes `analytics*` avec eux.
  // ➡️ Un sous-traitant se déclare le jour où il traite (leçon Resend) — et cesse
  // d'être déclaré le jour où il ne traite plus, données effacées. C'est la même règle
  // dans l'autre sens ; la garder à sens unique ferait décrire un traitement inexistant.
  // ➡️ La date ne bouge pas — même jour de livraison.
  empreinte: '69a2771dadba',
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

// ── L'ÂGE : LE TEXTE DÉCRIT UN MÉCANISME, DONC IL S'ÉPROUVE SUR LE CODE ─────
//
// Le §10 a affirmé pendant des mois « Aucun compte ne peut être créé en deçà de cet
// âge », alors que l'écran d'inscription ne demande ni âge ni date de naissance. Le
// blocage existe — il est DUR — mais il vit à l'onboarding, une étape plus loin. Et
// l'audit V1 avait posé la question puis fermé le constat (06b-19) sur un « RÉSOLU »
// tiré de trois preuves qui agissent toutes APRÈS la création du compte.
//
// ⚠️ Ce bloc n'interdit pas une phrase, il tient un INVARIANT : le texte n'a le droit
// de promettre un blocage à la création QUE si l'écran d'inscription demande l'âge.
// Le jour où quelqu'un ajoute le champ, la phrase redevient légitime toute seule.
describe('l’âge : le texte décrit le code, ou il se tait', () => {
  const RACINE_APP = join(__dirname, '..', '..');
  const sansCommentaires = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const login = sansCommentaires(readFileSync(join(RACINE_APP, 'app', '(auth)', 'login.tsx'), 'utf8'));
  const onboarding = sansCommentaires(readFileSync(join(RACINE_APP, 'app', '(auth)', 'onboarding.tsx'), 'utf8'));

  /** L'écran d'inscription demande-t-il l'âge, d'une façon ou d'une autre ? */
  const inscriptionDemandeAge =
    /BirthDate|naissance|birth|\bageN?\b|MIN_AGE|AGE_BOUNDS/.test(login);

  it('🔴 le texte ne promet un blocage à la CRÉATION que si l’inscription mesure l’âge', () => {
    const promesse = /compte[^.]*(ne peut|ne peuvent|impossible)[^.]*(créé|création)|(créé|création)[^.]*en deçà/i;
    const texteLePromet = promesse.test(TOUS_LES_PARAS);
    expect(
      texteLePromet && !inscriptionDemandeAge,
      'Le texte légal promet qu’aucun compte ne peut être créé sous l’âge minimum, ' +
      'et app/(auth)/login.tsx ne demande ni âge ni date de naissance. Deux issues, ' +
      'aucun compromis : demander l’âge AVANT signUp, ou écrire où le refus a lieu.',
    ).toBe(false);
  });

  it('le blocage que le texte annonce existe vraiment dans le parcours', () => {
    // ⚠️ On lit DANS `basicsValid`, pas dans le fichier : `AGE_BOUNDS[0]` sert aussi
    // au message d'erreur vingt lignes plus bas, donc chercher la chaîne dans tout le
    // fichier laissait passer un `basicsValid` entièrement vidé de sa borne d'âge.
    // Mesuré : la mutation restait VERTE.
    const basics = /const basicsValid\s*=([\s\S]*?);/.exec(onboarding)?.[1] ?? '';
    expect(basics, 'basicsValid introuvable').not.toBe('');
    expect(basics, 'basicsValid ne borne plus l’âge').toContain('AGE_BOUNDS[0]');
    expect(onboarding).toMatch(/step === 2 && basicsValid/);
    expect(AGE_BOUNDS[0]).toBe(MIN_AGE);
  });

  it('🔴 le seuil écrit dans le texte est celui que le code applique', () => {
    // Une copie publiée a déjà annoncé 16 ans pendant que l'app bloquait à 18.
    const seuils = [...TOUS_LES_PARAS.matchAll(/(\d+)\s+ans/g)].map((m) => Number(m[1]));
    expect(seuils.length, 'plus aucun seuil d’âge dans le texte').toBeGreaterThan(0);
    expect([...new Set(seuils)]).toEqual([MIN_AGE]);
  });

  it('le texte dit à un mineur ce qu’il peut faire de son compte', () => {
    // On refuse le service, donc on doit la sortie : sans adresse, un compte créé par
    // un mineur n'a aucun recours — l'onboarding n'offre pas de déconnexion.
    const mineurs = PRIVACY_POLICY.find((s) => s.title.includes('Mineurs'));
    expect(mineurs, '§ Mineurs introuvable').toBeTruthy();
    expect(mineurs!.paragraphs.join(' ')).toContain(LEGAL.dpoEmail);
  });
});

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
