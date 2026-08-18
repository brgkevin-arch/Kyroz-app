# Registre des activités de traitement — Kyroz

> Document obligatoire (RGPD art. 30). Modèle simplifié CNIL pour TPE/micro-entreprise.
> À tenir à jour à chaque évolution du traitement des données. Dernière mise à jour : **18 août 2026**.
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
| **Sous-traitants** | • **Supabase Inc.** — hébergement de la base et de l'authentification (données de santé comprises).<br>• **Resend** — envoi des e-mails de service (confirmation d'inscription, réinitialisation de mot de passe), branché en SMTP dédié le 2026-08-09. Reçoit l'**adresse e-mail** et le contenu de ces messages, **aucune donnée de santé**. |
| **Transferts hors UE** | Données de santé : **aucun** — hébergement Supabase dans l'Union européenne (`eu-central-1`). ⚠️ **À VÉRIFIER pour Resend** : le cadre du transfert (clauses contractuelles types / Data Privacy Framework) ne peut se lire que dans son DPA, qui n'a pas encore été consulté. Tant qu'il ne l'est pas, cette ligne ne dit pas « aucun » pour ce sous-traitant — voir le suivi des actions en fin de document. |
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
| **Durée de conservation** | **18 mois**, puis suppression. Choix motivé : 12 mois interdiraient toute comparaison d'une année sur l'autre sur un marché très saisonnier ; 18 mois couvrent une saison complète plus une marge, sous le plafond de référence de 25 mois. Suppression sur demande à tout moment avant ce terme (Réglages → Supprimer mes statistiques, avec l'identifiant pseudonyme). |
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
- [ ] 🧑 **DPA Resend — à consulter et à conserver** (branché le 2026-08-09, déclaré ici
  le 2026-08-11). Deux choses en dépendent, et elles ne peuvent pas s'écrire sans lui :
  le **cadre du transfert hors UE** (clauses contractuelles types / Data Privacy
  Framework, art. 13-1-f) et la ligne « Transferts hors UE » ci-dessus, qui reste
  volontairement en suspens. ⚠️ Ne pas la compléter au jugé : une politique de
  confidentialité n'est pas l'endroit où supposer (même règle que le prestataire
  d'abonnement, `constants/legal.ts` §5).
- [ ] 🔴 **LES TROIS VERROUS DE LA CLÉ POSTHOG.** `EXPO_PUBLIC_POSTHOG_KEY` ne se pose pas
  tant que les trois ne sont pas faits — ils partent dans le même lot qu'elle, jamais après :
  - [x] **Couper la collecte d'IP** — **déjà fait, vérifié le 2026-08-18.** Les projets
        Cloud EU désactivent ce réglage par défaut à la création ; confirmé par capture
        d'écran (`Settings → Products → Privacy → Discard client IP data`, activé).
  - [x] **DPA PostHog signé — signé et contresigné le 2026-08-18.** Généré sur
        `eu.posthog.com` (Settings → Organization → Legal documents), contresigné côté
        PostHog par Charles Cook (VP Operations). PDF à conserver hors dépôt, comme
        celui de Supabase.
        ⚠️ **Signer n'est pas lire.** Deux lignes du traitement n°2 restent « présumé,
        non lu » — le périmètre des **sous-traitants internes** et le cadre applicable
        à **Cloudflare** — parce que personne n'a encore extrait ces clauses du texte
        signé. C'est une action séparée, pas une conséquence automatique de la
        signature.
  - [ ] 🔴 **Rétention 18 mois — AUCUN MÉCANISME CONNU, arbitrage requis (2026-08-18).**
        Ce verrou était formulé « cocher un réglage ». Vérification faite : la doc PostHog ne
        documente **aucune rétention d'events configurable**. Le plan gratuit *garantit* 1 an,
        après quoi les données « peuvent passer en stockage froid » — **elles ne sont pas
        supprimées**. Les seules suppressions documentées sont manuelles : projet entier,
        personne par personne, ou via l'API.
        ➡️ Or « conservées 18 mois, puis supprimées » est écrit dans la politique, sur l'écran
        de consentement, dans les Réglages et ici. **Une durée affichée doit être celle qui
        sera servie.** Rien ne ment aujourd'hui — aucune donnée n'est collectée — et c'est
        exactement ce que ce verrou est censé empêcher.
        Trois issues, à trancher avant la clé : (1) vérifier dans la console si un réglage
        non documenté existe — gratuit, à faire en premier ; (2) une suppression périodique
        via l'API PostHog, qui tient la promesse mais demande une clé secrète donc du code
        serveur ; (3) réécrire la durée dans les quatre surfaces.
        ⚠️ La synthèse analytics §3.5 justifiait 18 mois par la comparaison d'une saison à
        l'autre — avec une conservation d'un an, **cet argument tombe**, et c'est lui qui
        avait écarté les 12 mois.
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
- [ ] **Console PostHog** : les trois verrous ci-dessus.

