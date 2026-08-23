# Registre des activités de traitement — Kyroz

> Document obligatoire (RGPD art. 30). Modèle simplifié CNIL pour TPE/micro-entreprise.
> À tenir à jour à chaque évolution du traitement des données. Dernière mise à jour : **23 août 2026**.
>
> 🔴 **Ce registre a eu DEUX JOURS DE RETARD sur la production, et le motif vaut d'être
> gardé.** L'expéditeur e-mail (Resend) est branché depuis le 2026-08-09 — il traite
> l'adresse e-mail de chaque inscription — et il n'apparaissait ni ici, ni au §5 de la
> politique de confidentialité. La checklist qui l'a trouvé le rangeait au FUTUR
> (« avant d'activer PostHog / Resend »), en le mettant dans le même sac qu'un outil
> encore dormant. ➡️ **Un sous-traitant se déclare le jour où il TRAITE, pas le jour où
> on avait prévu de l'activer** — et un registre ne se relit jamais tout seul : c'est le
> jour où l'on branche un prestataire qu'il faut l'ouvrir.
>
> 🔵 **ET LA RÈGLE VAUT DANS L'AUTRE SENS — ajout du 2026-08-18.** Le traitement n°2
> (mesure d'audience) est déclaré ici alors qu'**aucune clé PostHog n'est posée** :
> rien ne part encore. Ce n'est pas la même faute à l'envers, et la raison tient en
> une phrase — **l'app DEMANDE déjà le consentement en production** (écran
> d'onboarding + Réglages) pour un outil que les textes déclaraient inexistant. Deux
> surfaces se contredisaient : on corrige un énoncé faux, on n'anticipe pas un
> traitement. ➡️ Le texte utilisateur est donc écrit au **conditionnel de
> consentement** (« si vous acceptez »), jamais au conditionnel d'existence — il reste
> vrai que la clé soit posée ou non. Ce registre, lui, dit l'état réel : déclaré le
> 2026-08-18, **actif à compter de la pose de la clé**, elle-même conditionnée aux
> trois verrous du suivi des actions.

## Responsable de traitement

| Champ | Valeur |
|---|---|
| Nom | Kévin Berger |
| Statut | Entrepreneur individuel (micro-entreprise) |
| SIREN | **106386162** |
| Adresse | 2 rue du moulin, 64570 Arette |
| Contact / DPO | contact@kyroz.app |

> Pas de délégué à la protection des données (DPO) formellement désigné : non obligatoire à ce stade
> (traitement non « à grande échelle » au sens de l'art. 37). Le contact RGPD ci-dessus fait office de point d'entrée.
> À réévaluer si le volume d'utilisateurs croît fortement.

---

## Traitement n°1 — Comptes utilisateurs & génération de plans nutritionnels

| Rubrique | Détail |
|---|---|
| **Finalités** | Création et gestion du compte ; calcul des besoins nutritionnels (calories, macros) ; génération des plans repas, listes de courses et suivi associé. |
| **Catégories de personnes** | Utilisateurs de l'application (adultes, 18 ans et plus — âge minimum bloqué à l'inscription, `lib/safety.ts::MIN_AGE`). |
| **Catégories de données** | • Identification : adresse email.<br>• **Données de santé (art. 9)** : sexe, âge, poids, taille, taux de masse grasse, niveau d'activité, sport, objectif, restrictions et préférences alimentaires.<br>• Usage : plans générés, suivi du poids, série (streak), favoris, frigo (garde-manger). |
| **Base légale** | Consentement explicite (art. 9-2-a), recueilli à l'inscription et horodaté (`consent_health_data`, `consent_at`). |
| **Destinataires** | Le responsable de traitement, et les sous-traitants listés ci-dessous dans la stricte limite de leur mission. Aucun partage commercial, aucune revente, aucun traceur publicitaire. La mesure d'audience fait l'objet d'un traitement séparé (n°2) : **aucune donnée de ce traitement-ci ne lui est transmise**. |
| **Sous-traitants** | • **Supabase Inc.** — hébergement de la base et de l'authentification (données de santé comprises).<br>• **Resend** — nom légal **Plus Five Five, Inc.** (États-Unis) — envoi des e-mails de service (confirmation d'inscription, réinitialisation de mot de passe), branché en SMTP dédié le 2026-08-09. Reçoit l'**adresse e-mail** et le contenu de ces messages, **aucune donnée de santé**. Stockage aux **États-Unis** (voir « Transferts hors UE »).<br>**Sous-traitants ultérieurs de Resend** — page publique consultée le 2026-08-23, datée du **15 juillet 2026** : **22 entités, toutes aux États-Unis**, dont Amazon Web Services (hébergement et envoi), Cloudflare (pare-feu applicatif), PlanetScale (base de données), Vercel (hébergement serveur), Snowflake (entrepôt de données), Datadog, Stripe. Le DPA (§4.2) impose un **préavis de 14 jours** avant tout changement.<br>🔴 **QUESTION OUVERTE, non écrite dans la politique tant qu'elle n'est pas mesurée** : deux de ces 22 sous-traitants sont des fournisseurs d'IA — **Anthropic, PBC** (« Artificial Intelligence ») et **RunPod, Inc.** (« Self hosted LLM's »). La page ne dit pas à quoi l'IA sert ni si le **contenu des messages** y passe. ➡️ Se tranche comme pour PostHog : **deux preuves, pas une** (une réponse écrite du prestataire, et une vérification de ce que l'app envoie réellement). 🔁 À revérifier à chaque évolution, et **avant le 2027-02-23** (6 mois) — une liste de sous-traitants recopiée n'est juste que le jour où on la lit. |
| **Transferts hors UE** | Données de santé : **aucun** — hébergement Supabase dans l'Union européenne (`eu-central-1`).<br>**Adresses e-mail et contenu des e-mails de service : OUI, vers les États-Unis** — *cadre lu dans le DPA le 2026-08-23, plus supposé.* Deux mécanismes cumulés : (1) **clauses contractuelles types** §6.2–6.5 (modules UE 1/2/3 pour les transferts hors EEE, addendum UK §6.4, adaptations suisses §6.5) ; (2) **EU-U.S. Data Privacy Framework** §11.1–11.4, extension UK comprise. Plus des mesures supplémentaires §6.6 (traitement des demandes gouvernementales).<br>🔴 **Et le fait qui pèse plus que le cadre** : Resend stocke **toutes** les données client aux États-Unis — contenu des messages, journaux de livraison, charges utiles de webhooks, données de compte. La **région d'envoi** choisie pour un domaine (`eu-west-1`) *« does not control where data is stored »*, et **aucun réglage ne déplace aujourd'hui le stockage dans l'UE** (page RGPD de Resend, consultée le 2026-08-23). ➡️ Ce n'est donc pas un paramètre mal posé qu'on pourrait corriger : c'est une propriété du prestataire, à assumer ou à changer de prestataire. |
| **Durée de conservation** | Pendant toute la durée de vie du compte. Suppression définitive (serveur + appareil) à la suppression du compte ou sur demande. |
| **Mesures de sécurité** | • Cloisonnement par utilisateur (Row Level Security PostgreSQL — un utilisateur n'accède qu'à ses données).<br>• Chiffrement des échanges en transit (HTTPS).<br>• Droit à l'effacement self-service (suppression de compte + cascade).<br>• Purge des données locales à la déconnexion.<br>• Aucun SDK tiers de tracking/publicité embarqué — le client de mesure du traitement n°2 est écrit à la main (`lib/analytics.ts`), sans SDK, et reste inerte sans consentement.<br>• Photos de progression **stockées uniquement sur l'appareil**, jamais transmises au serveur. |

---

## Traitement n°2 — Mesure d'audience (statistiques d'usage)

> **Déclaré le 2026-08-18. Actif à compter de la pose de la clé PostHog**, elle-même
> conditionnée aux trois verrous du suivi des actions. Traitement séparé du n°1, et
> ce n'est pas une commodité de présentation : la finalité, la base légale, les
> données, le destinataire et la durée y sont tous différents. Les fondre dans le n°1
> reviendrait à couvrir une mesure d'audience par un consentement donné pour des
> données de santé.

| Rubrique | Détail |
|---|---|
| **Finalités** | Comprendre comment l'application est utilisée, pour l'améliorer : où le parcours d'inscription décroche, si les plans générés sont réellement suivis, quelles erreurs techniques surviennent. Aucun profilage, aucune personnalisation du plan, aucune publicité. |
| **Catégories de personnes** | Utilisateurs ayant explicitement accepté le partage des statistiques d'usage. |
| **Catégories de données** | • Identifiant **pseudonyme** d'appareil (UUID tiré localement, jamais relié au compte ni à l'e-mail).<br>• 13 événements techniques et leurs propriétés (étape d'inscription, plan ouvert, repas coché, palier de série, échec de génération, erreur — type de classe, jamais le message brut).<br>• Comptes (nombre de jours du plan, nombre de repas) et rang du jour depuis l'installation.<br>• **Adresse IP** — voir la ligne dédiée ci-dessous.<br>➡️ **Aucune donnée de santé, aucun contenu de plan** (aliment, recette, quantité, liste de courses), aucun texte libre, aucune photo, ni e-mail ni identifiant de compte. Interdits absolus, tenus par `lib/__tests__/analyticsPerimetre.test.ts`. |
| **Base légale** | **Consentement** (RGPD art. 6-1-a), **distinct** de celui du traitement n°1. Demandé avant toute collecte, refusable sans conséquence sur l'usage de l'app (deux boutons de même taille), retirable à tout moment dans Réglages → Confidentialité, sans supprimer le compte. |
| **Destinataire** | **PostHog** (PostHog, Inc.), offre Cloud EU. |
| **Localisation** | **Stockage à Francfort** (Allemagne) ; **transit routé par Cloudflare sur des points de présence mondiaux**. ⚠️ Cette ligne ne dit ni « hébergement UE » ni « aucun transfert hors UE » : le stockage est en Allemagne, le transit ne l'est pas, et une localisation de serveurs ne se transforme pas en promesse plus large qu'elle. |
| **Transferts hors UE** | **Cadre trouvé — lu dans le DPA signé le 2026-08-18** (§10.3–10.4), pas supposé. Deux mécanismes cumulés, pas un choix entre les deux : (1) PostHog **auto-certifié au EU-US Data Privacy Framework** (+ extension UK, + Swiss-US DPF) ; (2) **Clauses Contractuelles Types** appliquées *« notwithstanding »* le DPF — EU SCC (module 2, contrôleur → sous-traitant), UK SCC (International Data Transfer Addendum), adaptations FADP pour la Suisse — les signatures et la date du DPA valant signature et date des CCT elles-mêmes. Couvre tout traitement hors UE : Cloudflare (points de présence mondiaux) et Hiberly Ltd. (Royaume-Uni, voir sous-traitants internes ci-dessous). |
| **Sous-traitants ultérieurs** | Tableau « services de base » publié par PostHog, **consulté le 2026-08-18** — <https://posthog.com/subprocessors> (page datée du 12 juin 2026) :<br>• **Amazon Web Services, Inc.** — stockage cloud — Allemagne (EU Cloud).<br>• **Wiz, Inc.** — détection de vulnérabilités — Allemagne, France.<br>• **PlanetScale, Inc.** — supervision des bases — Allemagne (EU Cloud).<br>• **Modal Labs, Inc.** — calcul serverless isolé — Allemagne (EU Cloud).<br>• **Cloudflare, Inc.** — reverse proxy, CDN, routage — **points de présence mondiaux (dynamique)**.<br>🔁 **À revérifier avant le 2027-02-18** (6 mois), et à chaque évolution du traitement : une liste de sous-traitants recopiée est juste le jour où on la lit. |
| **Fonctions IA de PostHog** | **Non activées — deux preuves, pas une.** (1) Réglage vérifié dans la console du projet PostHog (case du suivi des actions, à cocher le jour de la pose de la clé) ; (2) l'application n'appelle **que** l'endpoint d'ingestion `/capture/` — `POSTHOG_HOST` n'apparaît qu'une fois dans tout le code (`lib/analytics.ts`), sans `/decide/`, `/flags/` ni `/query/`. Le réglage seul serait révocable d'un clic en console ; le code seul ne dirait rien du serveur. Les deux ensemble tiennent. Le tableau « AI Subprocessors » de PostHog ne s'applique donc pas. |
| **Sous-traitants internes (PostHog)** | ✅ **Extrait le 2026-08-18** (onglet « Internal Subprocessors » de la même page — les deux premières tentatives avaient manqué un contenu chargé au clic, pas un tableau vide) — **deux entités nommées, plus des « affiliés » présumés** :<br>• **Hiberly Ltd.** — fourniture du service PostHog — **Royaume-Uni**.<br>• **PostHog GmbH** — fourniture du service PostHog — **Allemagne**.<br>Le DPA (§5.1) autorise génériquement l'usage de cette page ; il ne liste pas ces entités lui-même, il y renvoie. |
| **Adresse IP** | **Écartée — vérifié le 2026-08-18** (capture d'écran du projet EU, `Settings → Products → Privacy → Discard client IP data`, activé). Les projets Cloud EU désactivent ce réglage par défaut à la création ; ce n'était pas encore vérifié pour Kyroz, d'où la ligne précédente qui la consignait par prudence comme collectée. Le client n'envoie de toute façon rien pour l'IP — il n'en a jamais eu besoin. |
| **Durée de conservation** | **Au moins un an**, garantie par l'offre PostHog souscrite ; **sans limite haute fixe au-delà** (données déplacées en stockage froid, non supprimées). ⚠️ **Arbitrage du 2026-08-18** : PostHog ne propose aucun réglage de rétention automatique, et aucune purge n'est construite côté Kyroz — décision assumée, pour ne pas ajouter une pièce serveur (clé API, tâche planifiée) à surveiller pour une fonctionnalité encore éteinte. Ce que ça veut dire concrètement : les données ne raccourcissent pas de vie, elles n'en ont simplement plus de terme fixe promis — en pratique, rien ne les efface plus tôt qu'avant. Suppression **sur demande individuelle**, à tout moment (Réglages → Supprimer mes statistiques, avec l'identifiant pseudonyme) — ce mécanisme est manuel et existait déjà, indépendant de ce choix. |
| **Mesures de sécurité** | • Client écrit à la main, **aucun SDK tiers** embarqué.<br>• `capture()` est un **no-op** tant que le consentement n'est pas « granted » — vérifié par test.<br>• Aucun appel `identify`/`alias` vers l'identifiant de compte Supabase : le pseudonyme ne peut pas être rebranché sur le compte.<br>• Périmètre des propriétés d'événement tenu par un test de mutation (`analyticsPerimetre.test.ts`).<br>• Chiffrement en transit (HTTPS). |

---

## Droits des personnes — moyens d'exercice

| Droit | Moyen |
|---|---|
| Accès / Portabilité | Bouton « Exporter mes données » (Profil) → fichier JSON complet. |
| Rectification | Édition du profil dans l'app. |
| Effacement | « Supprimer mon compte » (Profil) → suppression serveur + locale. |
| Retrait du consentement | **Données de santé** (traitement n°1) : suppression du compte.<br>**Statistiques d'usage** (traitement n°2) : interrupteur dans Réglages → Confidentialité, sans supprimer le compte ni perdre quoi que ce soit. |
| Effacement des statistiques d'usage | « Supprimer mes statistiques » (Réglages) → prépare l'e-mail avec l'identifiant pseudonyme, seule clé permettant de retrouver les événements d'un appareil. |
| Réclamation | CNIL — www.cnil.fr. |

---

## Suivi des actions (côté responsable)

- [x] **DPA Supabase** accepté et signé le 2026-06-15 (données de santé déclarées en catégorie spéciale, rôle Controller). PDF conservé hors dépôt.
- [x] **Région UE** confirmée (`eu-central-1`, Frankfurt).
- [x] **2FA** activée sur le compte Supabase.
- [x] Adresse + email de contact renseignés (2 rue du moulin, 64570 Arette · contact@kyroz.app).
- [x] **SIREN complété** (106386162) ici, dans `constants/legal.ts` (objet `LEGAL`) et `public/legal.html`.
- [x] ✅ **DPA Resend — CONSULTÉ le 2026-08-23, et il n'y avait RIEN À SIGNER.** Le cadre
  du transfert hors UE (art. 13-1-f) et la ligne « Transferts hors UE » ci-dessus sont
  désormais renseignés d'après le contrat lui-même : CCT §6.2–6.5, DPF §11.1–11.4,
  sous-traitants §4.2. Les surfaces publiques suivent (`constants/legal.ts` §5 et §6,
  régénérées par `npm run gen:legal`).
  🔴 **CETTE CASE ATTENDAIT UN GESTE QUI N'EXISTE PAS, ET C'EST LA LEÇON.** Elle était
  rédigée « à consulter **et à conserver** », sur le modèle de Supabase et de PostHog —
  deux DPA qu'il fallait effectivement générer et faire contresigner. Celui de Resend
  est **public** et devient contraignant à l'entrée en vigueur du contrat (préambule et
  §12 ; ses blocs de signature sont explicitement *« for reference purposes only »*).
  Il liait donc les parties depuis l'inscription du 2026-08-07, et douze jours de
  « en suspens » n'ont rien attendu de réel. ➡️ **Avant de porter un point comme
  bloquant, mesurer ce qu'il demande vraiment** — même défaut que la DSA, présentée
  douze jours comme le chemin critique alors qu'elle était validée depuis le 30 juillet.
  ⚠️ **Ce qui reste, et ce n'est pas la même chose** : 🧑 conserver le PDF hors dépôt
  (preuve, comme pour Supabase et PostHog), et 🧑 **arbitrer** le stockage aux
  États-Unis — légal et déclaré, mais c'est un choix de prestataire, pas une fatalité.
- [ ] 🧑 **Resend : à quoi sert l'IA chez le sous-traitant ?** Deux fournisseurs d'IA
  figurent à sa liste (Anthropic PBC, RunPod). Tant que ce n'est pas mesuré, rien n'en
  est écrit dans la politique — la question vit au tableau des sous-traitants ci-dessus.
- [x] ✅ **LES TROIS VERROUS DE LA CLÉ POSTHOG — levés le 2026-08-18, et la clé posée le
  jour même.** `EXPO_PUBLIC_POSTHOG_KEY` est un secret du dépôt GitHub (déploiement web,
  `deploy.yml`) et une variable EAS sur les trois environnements (builds natifs). La
  mesure d'audience quitte l'état dormant — sous réserve du consentement, toujours
  demandé et refusable avant tout envoi (`lib/analytics.ts::capture`) :
  - [x] **Couper la collecte d'IP** — **déjà fait, vérifié le 2026-08-18.** Les projets
        Cloud EU désactivent ce réglage par défaut à la création ; confirmé par capture
        d'écran (`Settings → Products → Privacy → Discard client IP data`, activé).
  - [x] **DPA PostHog signé — signé et contresigné le 2026-08-18.** Généré sur
        `eu.posthog.com` (Settings → Organization → Legal documents), contresigné côté
        PostHog par Charles Cook (VP Operations). PDF à conserver hors dépôt, comme
        celui de Supabase.
        ✅ **Signer n'était pas lire, et c'est fait depuis** : les deux lignes du
        traitement n°2 qui restaient « présumé, non lu » (sous-traitants internes,
        cadre applicable à Cloudflare) sont closes ci-dessus — le fondateur a partagé
        le PDF signé le jour même, lu en entier.
  - [x] **Rétention — arbitrage tranché le 2026-08-18, PAS de mécanisme construit.**
        La doc PostHog ne documente **aucune rétention d'events configurable** ; le
        plan gratuit *garantit* 1 an, puis les données passent en stockage froid —
        **jamais supprimées automatiquement**. Les seules suppressions documentées
        sont manuelles : projet entier, personne par personne, ou via l'API.
        ➡️ **Décision fondateur : réécrire la promesse plutôt que construire une
        purge.** Les quatre surfaces (`constants/legal.ts`, l'écran de consentement,
        les Réglages, ce registre) disent maintenant « au moins un an, sans limite
        haute fixe » — ce qui est vrai — au lieu de « 18 mois, puis supprimées », qui
        ne l'était pas. Aucune tâche récurrente n'est créée : la suppression reste
        **sur demande individuelle**, via le mécanisme déjà existant.
        ⚠️ **Ce n'est pas une régression de rétention, c'est le retrait d'une fausse
        borne.** La justification d'origine (synthèse §3.5, comparer une saison à
        l'autre) reste servie — sans purge automatique, les données persistent au
        moins aussi longtemps qu'avant, souvent plus.
  - [x] Non-rotation de l'UUID **assumée et documentée** (synthèse §7.2) : une rotation
        périodique renforcerait la position mais casserait les cohortes longues.
- [ ] (Idéal) Relecture du texte légal par un juriste avant lancement à grande échelle.

---

## 🧑 À faire hors dépôt par le fondateur

Ces actions ne vivent dans aucun fichier : personne ne les verra en relisant le code, et
aucun test ne les attrapera. Elles font pourtant partie du même lot.

📄 **Procédure détaillée, étape par étape** : `PROCEDURE-2026-08-18-activation-posthog.md`
(libellés exacts des champs, ordre, et ce qui bloque quoi).

- [x] **App Store Connect** → App Privacy : **publié le 2026-08-18**. Première déclaration
      de l'app (elle n'en avait aucune) : e-mail, santé et ID utilisateur en *Fonctionnalité
      de l'app* et liés à l'identité ; **Interaction avec le produit** en *Analyses*, **non
      liée**, **sans suivi**. Photos non déclarées — elles ne quittent pas l'appareil.
- [ ] **Play Console** → Sécurité des données : ajouter les **actions dans l'app**, consenties,
      non partagées à des fins publicitaires. Même source : `STORE-RELEASE.md` §4.
- [x] **URL de politique — App Store Connect** → `https://kyroz.app/legal.html`, posée le
      2026-08-18 (*Confidentialité de l'app* → Politique de confidentialité → Modifier).
      ⏳ Ne s'affichera sur la fiche qu'à la **prochaine version publiée** : d'ici là,
      l'ancienne URL reste montrée, et elle répond toujours 200.
- [ ] **URL de politique — Play Console** → même valeur. **Reporté au 2026-08-18 par le
      fondateur**, à faire avant la prochaine soumission Android. Remplace l'URL
      `brgkevin-arch.github.io` sous pseudo personnel.
- [x] **Console PostHog** : les trois verrous ci-dessus — **levés le 2026-08-18** (IP déjà
      écartée par défaut, DPA signé et lu, rétention réécrite plutôt qu'automatisée).
- [x] **Poser `EXPO_PUBLIC_POSTHOG_KEY`** — **fait le 2026-08-18.** Secret GitHub Actions
      (`deploy.yml`) + variable EAS sur `production`, `preview` et `development`.
      ✅ **Site web : en ligne** (déployé au merge, CI verte, vérifié en production) — la
      mesure y est active pour qui a consenti.
- [x] **OTA PUBLIÉ le 2026-08-18** — `eas update --branch production --clear-cache
      --environment production`, runtime **1.0.0**, iOS + Android, groupe `f01b56ba`,
      commit `1078c94`. **Vérifié sur l'ARTEFACT** et pas sur la configuration : les trois
      témoins ASCII (clé `phc_qELCvYG4…`, hôte `eu.i.posthog.com`, réf. Supabase) sont
      présents dans les deux bundles Hermes.
      ⚠️ **Ça n'allume pas la mesure pour le parc existant** : l'écran de consentement ne
      vit que dans l'onboarding, donc qui l'a déjà terminé garde un consentement `null` et
      `capture()` reste no-op chez lui. Il faut qu'il bascule lui-même « Statistiques
      d'usage » dans les Réglages. La mesure démarre avec les **nouvelles installations**.
      ⚠️ Et il faut **deux lancements** pour la voir appliquée (`fallbackToCacheTimeout: 0`).

