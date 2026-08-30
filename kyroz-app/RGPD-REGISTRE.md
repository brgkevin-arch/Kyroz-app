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
| **Catégories de données** | • Identification : adresse email.<br>• **Données de santé (art. 9)** : sexe, âge, poids, taille, taux de masse grasse, niveau d'activité, sport, objectif, restrictions et préférences alimentaires.<br>• Usage : plans générés, suivi du poids, série (streak), favoris, réserve alimentaire (table `pantry`). |
| **Base légale** | Consentement explicite (art. 9-2-a), recueilli à l'inscription et horodaté (`consent_health_data`, `consent_at`). |
| **Destinataires** | Le responsable de traitement, et les sous-traitants listés ci-dessous dans la stricte limite de leur mission. Aucun partage commercial, aucune revente, aucun traceur publicitaire. La mesure d'audience fait l'objet d'un traitement séparé (n°2) : **aucune donnée de ce traitement-ci ne lui est transmise**. |
| **Sous-traitants** | • **Supabase Inc.** — hébergement de la base et de l'authentification (données de santé comprises).<br>• **Resend** — nom légal **Plus Five Five, Inc.** (États-Unis) — envoi des e-mails de service (confirmation d'inscription, réinitialisation de mot de passe), branché en SMTP dédié le 2026-08-09. Reçoit l'**adresse e-mail** et le contenu de ces messages, **aucune donnée de santé**. Stockage aux **États-Unis** (voir « Transferts hors UE »).<br>**Sous-traitants ultérieurs de Resend** — page publique consultée le 2026-08-23, datée du **15 juillet 2026** : **22 entités, toutes aux États-Unis**, dont Amazon Web Services (hébergement et envoi), Cloudflare (pare-feu applicatif), PlanetScale (base de données), Vercel (hébergement serveur), Snowflake (entrepôt de données), Datadog, Stripe. Le DPA (§4.2) impose un **préavis de 14 jours** avant tout changement.<br>🔴 **QUESTION OUVERTE, non écrite dans la politique tant qu'elle n'est pas mesurée** : deux de ces 22 sous-traitants sont des fournisseurs d'IA — **Anthropic, PBC** (« Artificial Intelligence ») et **RunPod, Inc.** (« Self hosted LLM's »). La page ne dit pas à quoi l'IA sert ni si le **contenu des messages** y passe. ➡️ Se tranche comme pour PostHog : **deux preuves, pas une** (une réponse écrite du prestataire, et une vérification de ce que l'app envoie réellement). 🔁 À revérifier à chaque évolution, et **avant le 2027-02-23** (6 mois) — une liste de sous-traitants recopiée n'est juste que le jour où on la lit.<br>⚠️ **ET RESEND N'EST PAS SOUS-TRAITANT SUR TOUT — §9 du DPA, lu le 2026-08-23.** Sur deux catégories il est **contrôleur INDÉPENDANT**, sous sa propre politique de confidentialité et non sous nos instructions : les *Company Account Data* (§1.6 — identité et facturation du titulaire du compte, donc **le fondateur**, pas les utilisateurs de Kyroz) et les *Company Usage Data* (§1.7 — journaux d'activité, **source et destination d'une communication**, données de performance et de lutte contre l'abus). ➡️ La distinction compte : sur ces données-là, une demande d'effacement ne se relaie pas via Kyroz, elle s'adresse à Resend (`privacy@resend.com`).<br><br>• 🔴 **RevenueCat, Inc.** (1032 E Brandon Blvd #3003, Brandon, FL 33511, **États-Unis**) — gestion des abonnements Kyroz+. **Ajouté au registre le 2026-08-26 ; il traitait déjà.** La clé `EXPO_PUBLIC_REVENUECAT_IOS_KEY` est posée dans l'environnement **production** d'EAS (`eas env:list`, vérifié le 2026-08-26), donc tout build de production appelle `Purchases.configure()` puis `Purchases.logIn()` — **avant même la mise en vente**. C'est exactement la leçon déjà payée sur Resend : *un sous-traitant se déclare le jour où il TRAITE, pas le jour où on comptait s'en servir.*<br>**Ce qui part, mesuré dans le code et pas supposé** (`hooks/usePremium.ts:52` → `lib/purchases.ts::identifyUser`) : **l'UUID Supabase de l'utilisateur, et rien d'autre**. Aucun `setAttributes`, aucun e-mail, aucun nom, aucun `collectDeviceIdentifiers`. **Aucune donnée de santé** — ce qui concorde avec l'Annexe 1B du DPA, qui déclare *« Sensitive data transferred: Not Applicable »*. S'ajoutent les données que le SDK et les stores produisent d'eux-mêmes (reçus d'achat, informations d'app et d'appareil).<br>**Sous-traitants ultérieurs de RevenueCat** — Annexe 3 du DPA, lue le 2026-08-26 : **13 entités, toutes aux États-Unis** — Amazon Web Services, Google LLC, Cloudflare, Fastly, Snowflake, ClickHouse, ScyllaDB, Elastic, Sentry, Honeycomb, Hex, **OpenAI OpCo, LLC** et **Anthropic, PBC**. (Une 14ᵉ, AB180, ne vaut que pour les clients coréens.) Notification préalable des ajouts **sur demande écrite** à `compliance@revenuecat.com` ; la liste est mise à jour sous **30 jours** sauf objection motivée.<br>🔴 **MÊME QUESTION OUVERTE QUE CHEZ RESEND, et elle se pose deux fois ici** : OpenAI et Anthropic sont décrits comme *« AI service provider used to power product features that require automated analysis or content generation »*. L'annexe ne dit **pas** si des données personnelles de clients y transitent. ➡️ Se tranche à la même règle : **deux preuves** — une réponse écrite de RevenueCat, et une vérification de ce que l'app envoie (déjà faite de notre côté : un UUID). 🔁 À revérifier avant le **2027-02-26**.<br>✅ **SUPPRESSION À LA DEMANDE — CÂBLÉE, DÉPLOYÉE ET VÉRIFIÉE LE 2026-08-27.** L'Edge Function `delete-account` supprime l'abonné (`DELETE /v1/subscribers/{uuid}`) **AVANT** la cascade Supabase — le seul instant où l'UUID a encore un porteur ; appelée après, plus rien ne permettrait de savoir quoi supprimer. Best-effort borné à **5 s** (`AbortSignal.timeout`) : l'effacement du compte n'est jamais retardé par la disponibilité d'un tiers, et le compte Supabase part **dans tous les cas** — un droit à l'effacement ne peut pas dépendre d'un sous-traitant.<br>**Ce que ça rend vrai** : le §7 de la politique borne l'exception de conservation à « si vous avez souscrit un abonnement ». Cette rédaction n'était exacte que si l'identifiant d'un NON-abonné disparaît — or `identifyUser` crée un abonné pour **tout le monde**, abonné ou non. Elle l'est depuis aujourd'hui.<br>**Comment ça a été vérifié — sur l'ARTEFACT, pas sur une intention** : secret `REVENUECAT_SECRET_KEY` posé et son nom relu par la CLI · fonction déployée puis **retéléchargée et comparée** au fichier de `main`, identique · suppression réelle d'un compte jetable depuis l'écran Profil, journal d'invocation **muet** — ce qui, depuis le même jour, ne veut plus dire qu'une chose (voir ci-dessous).<br>⚠️ **TROIS PIÈGES PAYÉS EN CHEMIN, écrits parce qu'ils se retendront** : (1) le secret créé sous le nom `Revenuecat` — `Deno.env.get` est sensible à la casse, la fonction n'aurait rien tenté **sans erreur ni message** ; (2) une clé secrète **v2** sur un endpoint **v1** → `403`. Le tableau de bord range les deux versions au même endroit, sous le même préfixe `sk_` ; (3) 🔴 **le journal ne mesurait rien** : la fonction ne journalisait que ses échecs, alors qu'elle a **trois** façons de ne rien supprimer — `supprime` (muet), `introuvable` 404 (muet), `non_configure` (muet). Un journal silencieux avait donc trois sens, dont « tout va bien ». Depuis, chaque état qui ne supprime pas ÉCRIT, et le succès seul se tait : **muet = réussi**. Contrat compté par `lib/__tests__/suppressionSousTraitants.test.ts` (4 mutations, 4 rouges).<br>⚠️ **Ce que la suppression NE couvre pas, et il faut le savoir** : `purchases.web.ts::identifyUser` ne fait rien — aucun abonné n'est créé depuis le web, donc aucune vérification faite depuis le site ne prouve quoi que ce soit (elle obtient un 404). Et `usePremium` n'est monté que par **trois** surfaces (Profil, Kyroz+, feuille de pesée) : l'abonné naît en visitant l'une d'elles, pas à l'inscription.<br>✅ **LES ABONNÉS ORPHELINS ONT ÉTÉ RETIRÉS LE 2026-08-27, 16:51.** Ce sont les comptes de test supprimés AVANT ce câblage : hors d'atteinte de tout correctif, puisque leur ligne Supabase n'existait plus et que plus rien ne pouvait dire quoi supprimer. **Trois** abonnés, un `DELETE /v1/subscribers/{uuid}` chacun, **trois `200` avec `deleted: true`** — mesuré sur la réponse de l'API, pas sur le tableau de bord (qui supprime de façon asynchrone). Le geste a été fait par une fonction **jetable** déployée hors du dépôt, appelée une fois puis **détruite** ; vérifié sur l'artefact — `supabase functions list` ne rend plus que `delete-account` (v8), et l'arbre du dépôt est resté propre. ℹ️ **Les trois identifiants ne sont pas recopiés ici** : le registre décrit un traitement, il n'en ouvre pas un second. Ils ne sont écrits **nulle part dans le dépôt** non plus : la fonction jetable les portait en dur et vivait hors de lui.<br>ℹ️ Contact conformité : `compliance@revenuecat.com` (Miguel Carranza, CTO, désigné à l'Annexe 1A). |
| **Transferts hors UE** | Données de santé : **aucun** — hébergement Supabase dans l'Union européenne (`eu-central-1`).<br>**Adresses e-mail et contenu des e-mails de service : OUI, vers les États-Unis** — *cadre lu dans le DPA le 2026-08-23, plus supposé.* Deux mécanismes cumulés : (1) **clauses contractuelles types** §6.2–6.5 (modules UE 1/2/3 pour les transferts hors EEE, addendum UK §6.4, adaptations suisses §6.5) ; (2) **EU-U.S. Data Privacy Framework** §11.1–11.4, extension UK comprise. Plus des mesures supplémentaires §6.6 (demandes des autorités : redirection vers nous quand la loi le permet, préavis, aucune divulgation volontaire) et §6.7 (coopération avec les autorités de contrôle de l'UE et l'ICO au titre du DPF). Les CCT sont régies par le **droit irlandais**, litiges devant les **tribunaux d'Irlande** (§6.3.5–6.3.6), et §6.3.9 précise que les parties sont **réputées les avoir signées** du seul fait du DPA. Contact vie privée du sous-traitant : `privacy@resend.com`. Notification de violation « sans retard injustifié » (§8.6–8.7) ; droit d'audit une fois par an (§8.4) ; registres conservés 3 ans après la fin du contrat (§8.3).<br>🔴 **Et le fait qui pèse plus que le cadre** — *désormais confirmé par le CONTRAT et non par une page marketing* : §6.1 écrit que **« Company's primary processing operations take place in the United States »**.<br>ℹ️ **La région d'ENVOI, elle, est l'Irlande** — relevé le 2026-08-23 dans la console (*Domains → kyroz.app*, « Region : Ireland (eu-west-1) », domaine vérifié le 2026-08-09). C'est le meilleur réglage disponible et il vaut d'être noté, mais ⚠️ **il ne déplace pas le stockage** : la page RGPD de Resend écrit que la région choisie *« does not control where data is stored »*. Les deux faits coexistent — envoi depuis l'UE, stockage aux États-Unis — et confondre l'un avec l'autre ferait écrire « données en Europe » à tort. Resend stocke **toutes** les données client aux États-Unis — contenu des messages, journaux de livraison, charges utiles de webhooks, données de compte. La **région d'envoi** choisie pour un domaine (`eu-west-1`) *« does not control where data is stored »*, et **aucun réglage ne déplace aujourd'hui le stockage dans l'UE** (page RGPD de Resend, consultée le 2026-08-23). ➡️ Ce n'est donc pas un paramètre mal posé qu'on pourrait corriger : c'est une propriété du prestataire, à assumer ou à changer de prestataire.<br><br>🔴 **IDENTIFIANT D'ABONNÉ : OUI, VERS LES ÉTATS-UNIS** — *cadre lu dans le DPA le 2026-08-26, pas supposé.* Un seul mécanisme, et c'est une **différence avec Resend** : **clauses contractuelles types de la Commission européenne** (décision 2021/914), *« incorporated into this DPA and apply to the transfer with effect from commencement of the relevant transfer »*, **module 2 (responsable → sous-traitant)** puisque Kyroz est responsable de traitement ; clause 7 (docking) écartée. **AUCUNE adhésion au EU-U.S. Data Privacy Framework n'est revendiquée** dans ce DPA — recopier la phrase écrite pour Resend ferait donc affirmer un cadre que RevenueCat ne déclare pas. ⚠️ L'autorité de contrôle compétente (Annexe 1C) est celle de l'État membre d'établissement de l'exportateur. Sécurité (Annexe 2) : SOC 2 Type II, chiffrement AES-128-CBC + HMAC-SHA256, infrastructure AWS et Snowflake, accès restreint et 2FA. Conservation : jusqu'à la fin de l'Accord (§7). |
| **Durée de conservation** | Pendant toute la durée de vie du compte. Suppression définitive (serveur + appareil) à la suppression du compte ou sur demande.<br>**Chez Resend, deux durées distinctes — lues dans l'Exhibit A du DPA le 2026-08-23**, et ce n'est pas la même horloge : (1) le traitement dure aussi longtemps que le contrat Kyroz–Resend est actif ; (2) si Kyroz cessait d'utiliser le service, Resend supprime les données **sous 90 jours** après résiliation du compte.<br>🔴 **CE QUE ÇA LAISSE OUVERT, ET QUI TOUCHE UNE PROMESSE FAITE À L'UTILISATEUR** : le contrat ne dit **rien** de la purge d'un destinataire INDIVIDUEL. Une adresse e-mail figure dans les journaux d'envoi de Resend, et supprimer son compte Kyroz efface la ligne `auth.users` et les données Supabase — pas ces journaux. Or le §7 de la politique promet une suppression « serveur + appareil » sans nommer d'exception. ➡️ **Arbitrage à poser** : soit la politique nomme cette limite, soit on obtient de Resend une purge sur demande (l'Exhibit C mentionne une fonction de suppression, sans en préciser la granularité). Ne pas laisser la phrase en l'état en espérant que personne ne demande. |
| **Mesures de sécurité** | • Cloisonnement par utilisateur (Row Level Security PostgreSQL — un utilisateur n'accède qu'à ses données).<br>• Chiffrement des échanges en transit (HTTPS) **entre l'app et Supabase**.<br>• ⚠️ **Pour le COURRIER, la garantie est plus faible et il faut l'écrire** : Resend est réglé en **TLS « Opportunistic »** (relevé le 2026-08-23) — il tente une connexion chiffrée vers le serveur du destinataire et, s'il n'y parvient pas, **envoie le message non chiffré**. Ce qui est garanti est la tentative, pas le résultat. Bascule en « Enforced » proposée au suivi des actions ci-dessous.<br>• Chez Resend, mesures techniques de l'Exhibit C du DPA (lu le 2026-08-23) : chiffrement en transit et **au repos**, pentest annuel, analyse statique de code, hébergeurs audités SOC 2 Type II / ISO 27001, 2FA, accès restreint à un sous-ensemble du personnel sous accord de confidentialité.<br>• Droit à l'effacement self-service (suppression de compte + cascade).<br>• Purge des données locales à la déconnexion.<br>• ✅ **Les sauvegardes automatiques du téléphone n'emportent pas les données — vérifié le 2026-08-27, des DEUX côtés.** Android : `android.allowBackup: false` (`app.json`, posé le 2026-08-26). iOS : le dossier d'AsyncStorage est exclu de la sauvegarde **par défaut** par la bibliothèque elle-même (`RNCAsyncStorage.mm:518-527` — *« by default, we want to exclude AsyncStorage data from backup »*, `isExcludedFromBackup = @YES`), et le dépôt ne pose aucune surcharge `RCTAsyncStorageExcludeFromBackup` (vérifié dans `ios/` et `app.json`). Les photos de progression, elles, vivent dans le répertoire de **cache** (`lib/photos.ts`), qu'iOS ne sauvegarde pas non plus.<br>🔴 **CE QUE ÇA CORRIGE DANS LE TEXTE PUBLIÉ** : le §6 de la politique demandait à l'utilisateur de **couper sa sauvegarde iCloud** pour protéger ses données de santé — un geste réel, pour un risque qui n'a pas lieu. La moitié iOS était réputée « demander un plugin natif, donc un nouveau binaire » : faux, et la réserve a survécu un jour à sa péremption alors que le contre-audit l'avait signalée (`CA-5-01`). *Une politique trop prudente n'est pas neutre : elle fait agir.*<br>⚠️ **Ce sont deux DÉFAUTS, pas des engagements contractuels** : si `allowBackup` bougeait, ou si AsyncStorage changeait le sien, la phrase publiée redeviendrait fausse. C'est pourquoi la formulation est verrouillée par empreinte dans `lib/__tests__/legal.test.ts`.<br>• Aucun SDK tiers de tracking/publicité embarqué — le client de mesure du traitement n°2 est écrit à la main (`lib/analytics.ts`), sans SDK, et reste inerte sans consentement.<br>• Photos de progression **stockées uniquement sur l'appareil**, jamais transmises au serveur. |

---

## Traitement n°2 — Mesure d'audience — **RETIRÉ DU REGISTRE LE 2026-08-26**

> 🔴 **DÉCLARÉ LE 2026-08-18, ARRÊTÉ ET RETIRÉ LE 2026-08-26** (décision fondateur :
> *« on enlève le posthog pour l'instant »*, puis *« juste efface, on a rien collecté
> ou juste des données de moi ou un testeur, je vais supprimer et voilà »*).
>
> **Ce qui a été fait, dans cet ordre :**
> 1. coupure dans le code (`lib/featureFlags.ts::STATISTIQUES_USAGE_ACTIVES`), en amont
>    de la lecture du consentement — c'est la seule garde qui vaille pour les binaires
>    déjà installés, la clé y étant inlinée à la compilation ;
> 2. clé `EXPO_PUBLIC_POSTHOG_KEY` supprimée des **trois** environnements EAS
>    (`development`, `preview`, `production`) — vérifié : 0 occurrence dans chacun ;
> 3. écran de consentement, interrupteur et ligne de suppression retirés de l'app ;
> 4. mentions supprimées des textes opposables (politique in-app, page publique) ;
> 5. données déjà collectées supprimées à la source, côté tableau de bord PostHog.
>
> 🔴 **6. LA DATE D'ARRÊT EFFECTIF N'EST AUCUNE DES DATES ÉVIDENTES** (constat 08-02,
> écrit ici le 2026-08-27). Ce n'est ni la date du merge, ni celle du retrait de la clé
> d'EAS : c'est celle du **SECOND LANCEMENT de chaque appareil**.
> Le motif est mécanique. `EXPO_PUBLIC_POSTHOG_KEY` est **inlinée à la compilation** :
> la retirer d'EAS ne concerne que les builds FUTURS, et le binaire déjà installé chez
> un testeur la contient toujours, en dur. Ce qui coupe réellement sur ce parc, c'est la
> **garde publiée en OTA** — le premier `if` de `capture()`. Or `fallbackToCacheTimeout: 0`
> fait qu'une OTA s'applique au **deuxième** démarrage : entre la publication et ce
> démarrage-là, un appareil ayant consenti en août tournait encore sur le code d'avant.
> ⚠️ Vérifié le 2026-08-27, `eas env:list production` : `EXPO_PUBLIC_POSTHOG_KEY` est
> bien absente des trois environnements. La prémisse tient ; c'est la CHRONOLOGIE qui
> devait être écrite, pas le fait.
> ➡️ Conséquence pratique : devant une demande d'effacement portant sur une période,
> ne jamais borner au merge. La fenêtre réelle court jusqu'au second lancement.
>
> ⚠️ **POURQUOI LA FICHE PART, ALORS QUE LE TRAITEMENT A EU LIEU.** Un registre décrit
> les traitements EN COURS. Celui-ci a duré huit jours, n'a concerné que l'appareil du
> fondateur et un testeur, et ses données sont effacées : il n'a plus ni finalité, ni
> destinataire, ni personne concernée, ni durée de conservation. Garder la fiche
> décrirait un traitement inexistant — le même défaut que d'omettre un traitement
> réel, dans l'autre sens. **Cette trace datée reste** : c'est elle qui permet de
> répondre à « avez-vous mesuré quelque chose entre le 18 et le 26 août ? », et le
> détail complet vit dans l'historique git de ce fichier.
>
> 🔁 **Si la mesure revient**, la fiche se réécrit entièrement : le périmètre devra être
> ré-arbitré (les 15 événements, l'adresse IP, le DPA, la rétention), et le consentement
> redemandé à tout le monde — un « oui » de 2026 ne vaut pas pour un périmètre de 2027.

---

## Droits des personnes — moyens d'exercice

| Droit | Moyen |
|---|---|
| Accès / Portabilité | Bouton « Exporter mes données » (Profil) → fichier JSON complet. |
| Rectification | Édition du profil dans l'app. |
| Effacement | « Supprimer mon compte » (Profil) → suppression serveur + locale. |
| Retrait du consentement | **Données de santé** (traitement n°1) : suppression du compte. Aucun autre consentement n'est demandé depuis le retrait du traitement n°2 (2026-08-26). |
| Réclamation | CNIL — www.cnil.fr. |

---

## Suivi des actions (côté responsable)

- [x] **DPA Supabase** accepté et signé le 2026-06-15 (données de santé déclarées en catégorie spéciale, rôle Controller). PDF conservé hors dépôt.
- [x] **Région UE** confirmée (`eu-central-1`, Frankfurt).
- [x] **2FA** activée sur le compte Supabase.
- [x] Adresse + email de contact renseignés (2 rue du moulin, 64570 Arette · contact@kyroz.app).
- [x] **SIREN complété** (106386162) ici, dans `constants/legal.ts` (objet `LEGAL`) et `public/legal.html`.
- [x] ✅ **CORRIGÉ LE 2026-08-26 — la politique ne dit plus « pourra ».** RevenueCat,
  Inc. est nommé au §5, le transfert est encadré en toutes lettres par les clauses
  contractuelles types, et le texte dit désormais la vérité mesurée : l'identifiant part
  **dès que l'utilisateur est connecté, abonné ou non**. Les trois surfaces sont
  régénérées (app, `public/legal.html`, `kyroz.app/legal.html`).
  ⚠️ **Deuxième révision du même jour** : `effectiveDate` reste au 26 août — le texte
  entre en vigueur le jour même, post-dater annoncerait une prise d'effet qui n'a pas
  lieu. Seule l'empreinte de `legal.test.ts` a bougé.
  ⚠️ Le test qui interdisait de NOMMER un prestataire a été retourné, en suivant sa
  propre consigne : il vérifie maintenant qu'on ne nomme **que ce qui est réellement
  branché** (le SDK doit être une dépendance), que le cadre du transfert accompagne
  toujours le nom, et qu'aucun **Data Privacy Framework** n'est prêté à RevenueCat —
  le piège étant de recopier la phrase voisine, écrite pour Resend.
  Ce qui suit est l'état AVANT correction, gardé parce qu'il explique la mécanique :
- **CE QUI S'ÉTAIT PASSÉ.** `constants/legal.ts` §5 sert aujourd'hui : *« Si vous souscrivez
  un jour un abonnement Kyroz+, sa gestion technique **pourra** être confiée à un
  prestataire spécialisé. […] Ce prestataire **sera** nommé ici **avant toute mise en
  vente**. »*
  Trois choses y sont fausses, mesurées le 2026-08-26 :
  1. ce n'est plus conditionnel — la clé est en production, `Purchases.configure()`
     s'exécute à chaque lancement d'un build de prod ;
  2. ce n'est pas lié à la souscription — `hooks/usePremium.ts:52` appelle
     `identifyUser(uid)` **dès qu'un utilisateur est connecté**, abonné ou non, donc
     l'UUID part pour des gens qui n'achèteront jamais rien ;
  3. « avant toute mise en vente » place l'échéance après le fait : le transfert a
     commencé avant la vente.
  ⚠️ La phrase n'est pas devenue fausse par négligence : elle a été écrite au
  conditionnel **exprès**, le 2026-08-02, pour ne pas nommer un prestataire qui n'en
  était pas un. C'est le CÂBLAGE qui l'a rattrapée, pas la rédaction. *Un texte écrit au
  futur devient faux tout seul le jour où le futur arrive, et rien ne le signale.*
  **Texte proposé, à arbitrer** (remplace le paragraphe §5) :
  > « La gestion technique des abonnements Kyroz+ est confiée à RevenueCat, Inc.
  > (États-Unis). Dès que vous êtes connecté, que vous soyez abonné ou non,
  > l'identifiant technique de votre compte lui est transmis pour vérifier si un
  > abonnement est actif ; s'y ajoutent, le cas échéant, l'état de votre abonnement et
  > le reçu d'achat émis par l'App Store ou Google Play. Ne lui sont transmis ni votre
  > adresse email, ni vos données de santé, ni aucune coordonnée bancaire. Ce transfert
  > hors de l'Union européenne est encadré par les clauses contractuelles types de la
  > Commission européenne. »
  ⚠️ **Ne PAS y ajouter le Data Privacy Framework** — le DPA de RevenueCat n'en
  revendique aucun, contrairement à celui de Resend.
  ⚠️ Appliquer ce changement = bouger `effectiveDate`, mettre à jour l'empreinte de
  `legal.test.ts`, et régénérer les trois surfaces (`npm run gen:legal`, plus le site
  avec `KYROZ_SITE`).
- [x] ✅ **DPA RevenueCat — LU le 2026-08-26, et LUI NON PLUS NE SE SIGNE PAS.** Version
  en vigueur **« Effective: August 2026 »**, page publique `revenuecat.com/dpa/`. Son
  préambule dit qu'il *« forms part of the Customer Agreement, SaaS Services Agreement,
  Terms of Use … including without limitation any such agreement that incorporates this
  DPA by reference »* : il lie donc depuis l'acceptation des conditions à la création du
  compte. **Même famille que Resend**, et pas celle de Supabase / PostHog, qui
  demandaient une génération et une contresignature.
  ➡️ **Ne pas rouvrir cette case en cherchant « où signer ».** C'est le défaut déjà payé
  deux fois : *une case qui attend un geste inexistant reste cochée « à faire » pour
  toujours.*
  ✅ **TRANCHÉ LE 2026-08-26 : le compte est au NOM PROPRE du fondateur, et c'est
  COHÉRENT.** Le responsable de traitement déclaré en tête de ce registre est *Kévin
  Berger, entrepreneur individuel (micro-entreprise), SIREN 106386162*. Une entreprise
  individuelle **n'a pas de personnalité juridique distincte** : la personne EST
  l'entreprise. Le « Customer » que lie le DPA de RevenueCat et le responsable de
  traitement déclaré sont donc la **même entité en droit**. Rien à régulariser.
  ⚠️ **CE QUI CHANGERAIT SI KYROZ DEVENAIT UNE SOCIÉTÉ** (SAS, SARL…), et il vaut mieux
  le savoir avant qu'après : une société est une personne juridique NOUVELLE. Les
  comptes prestataires resteraient contractuellement liés à la personne physique,
  pendant que le responsable de traitement déclaré serait la société — deux entités
  différentes de part et d'autre de chaque DPA. Il faudrait alors **transférer chaque
  compte** (RevenueCat, Supabase, Resend, PostHog, Apple, Google) à la nouvelle entité
  et ré-entrer dans les contrats, pas seulement changer le nom sur la politique.
  ➡️ À rouvrir le jour d'un changement de statut, et pas plus tôt.
  📄 Pour le classement (validité non concernée) : chercher l'équivalent du
  *Settings → Documents* de Resend dans la console RevenueCat.
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
  ✅ **PDF RÉCUPÉRÉ ET LU EN ENTIER LE 2026-08-23** (Resend → *Settings → Documents*),
  et il est **bel et bien pré-signé** : enveloppe **Docusign `CC958417-9D1F-42CD-8B94-53B5F496F14E`**
  apposée sur les 19 pages, signature **Zeno Rocha Bueno Netto, CEO de Plus Five Five,
  Inc., datée du 14/01/2026** ; le bloc « Customer » reste vide, ce que §12 prévoit.
  **Version qui engage : « Updated on 12/31/2025 ».** Les six références citées plus
  haut ont été vérifiées **une par une contre le contrat**, pas contre la page web.
  ⚠️ **La lecture automatique du PDF public avait conclu « ne semble pas pré-signé »** —
  elle lisait des flux compressés qui ne rendent pas les champs de signature. C'était
  l'instrument, pas le document. *Ne pas conclure d'une sonde qui dit « ne semble pas ».*
  ⚠️ **Ce qui reste** : 🧑 **arbitrer** le stockage aux États-Unis — légal et déclaré,
  mais c'est un choix de prestataire, pas une fatalité.
- [x] ✅ **Resend : le suivi d'ouverture est INACTIF — relevé le 2026-08-23, deux preuves.**
  La question venait de l'Exhibit A, qui prévoit que le client *« has the option to enable
  open/link tracking and other analytics/tracking of recipient actions, which could
  include **IP address, location, operating system, browser, device, email client** and
  spam complaints »*. Activée, elle ferait collecter par Resend, sur **chaque
  destinataire**, des données que ni ce registre ni la politique ne déclarent — sur un
  canal que l'utilisateur ne peut pas refuser, puisque c'est l'e-mail d'inscription.
  **Les deux preuves, et il en fallait deux** : (1) le tableau de bord — *Domains →
  kyroz.app → Configuration* affiche « Enable tracking metrics » avec un bouton
  **« Configure »**, donc rien n'est configuré (capture du fondateur) ; (2) le **DNS** ne
  porte **aucun sous-domaine de suivi** (`track.kyroz.app` ne répond pas ; seuls existent
  le DKIM `resend._domainkey` et le `send.` d'envoi). Le tracking exige un sous-domaine
  vérifié : sans enregistrement, il ne peut pas fonctionner. La console dit l'intention,
  le DNS dit la capacité — l'un sans l'autre laisserait un doute.
  🔁 À re-relever si quelqu'un touche à la configuration du domaine.
- [ ] 🔴 🧑 **Resend : TLS en mode « Opportunistic » — un e-mail peut partir EN CLAIR.**
  Trouvé le 2026-08-23 sur la capture de la console (*Domains → kyroz.app →
  Configuration*), en cherchant tout autre chose. Resend l'explique lui-même : en
  *Opportunistic*, il tente une connexion chiffrée et, s'il n'y arrive pas, **envoie le
  message non chiffré** ; en *Enforced*, la connexion TLS est exigée quoi qu'il arrive.
  🔴 **Ce que ces e-mails transportent** : le code de confirmation d'inscription et le
  code de réinitialisation de mot de passe. Un envoi en clair rend ce code interceptable
  par qui observe le trafic entre Resend et le serveur du destinataire — c'est-à-dire
  qu'il vaut prise de contrôle du compte, données de santé comprises.
  ⚠️ **Et ce n'est pas un correctif évident, c'est un ARBITRAGE** : *Enforced* fait
  **échouer** l'envoi vers un serveur qui ne sait pas faire de TLS. L'utilisateur ne
  reçoit alors jamais son code, sans rien comprendre, et l'app n'a aucun moyen de le
  savoir. En 2026 tous les fournisseurs grand public français (Gmail, iCloud, Outlook,
  Orange, Free, SFR) acceptent TLS entrant, donc le risque de casse est faible — mais
  « faible » n'est pas « nul », et personne ne l'a mesuré sur le parc réel.
  ➡️ **Recommandation : passer en *Enforced*, après la soumission**, pas la veille. Rien
  ne le rend urgent aujourd'hui (aucune fuite constatée, volume quasi nul), et le faire
  maintenant ajouterait un mode de panne silencieux au moment précis où le relecteur
  Apple crée un compte. ⚠️ **Ne pas laisser cette ligne dormir pour autant** : le réglage
  est resté à sa valeur par défaut quatorze jours sans que personne l'ouvre.
  ⚠️ Tant qu'il est *Opportunistic*, la ligne « Mesures de sécurité » ne doit pas
  laisser croire que le courrier est chiffré de bout en bout : ce qui est garanti, c'est
  la tentative, pas le résultat.
- [ ] 🧑 **Resend : à quoi sert l'IA chez le sous-traitant ?** Deux fournisseurs d'IA
  figurent à sa liste (Anthropic PBC, RunPod). Tant que ce n'est pas mesuré, rien n'en
  est écrit dans la politique — la question vit au tableau des sous-traitants ci-dessus.
  ℹ️ **Ce que le contrat en dit déjà, et qui BORNE la question sans y répondre** : §2.2
  interdit à Resend de traiter les données pour d'autres finalités que celles de l'Accord
  et de l'Exhibit A, et §4.5 impose à chaque sous-traitant des obligations comparables aux
  siennes. Un usage IA hors fourniture du service serait donc une violation du contrat —
  ce qui n'est pas la même chose que la preuve qu'il n'en existe pas.
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

📄 **Procédure détaillée, étape par étape** : `docs/archive/2026-08-18-procedure-activation-posthog.md`
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

