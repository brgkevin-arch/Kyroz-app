# Procédure — déclarer la mesure d'audience, puis allumer PostHog

> Écrite le 2026-08-18, après le lot `feat(rgpd)` (PR #115). Les textes, le registre et
> les garde-fous sont livrés ; **ces cinq étapes-ci ne vivent dans aucun fichier** :
> elles se font à la main dans des consoles, avec tes comptes. Aucun test ne les
> attrapera, et personne ne les verra en relisant le code.
>
> 🧑 **Une étape à la fois.** Fais l'étape, dis-le, on passe à la suivante. L'ordre n'est
> pas décoratif : les étapes 1 à 3 déclarent ce qui est **déjà vrai** aujourd'hui
> (l'app demande le consentement, les textes le disent) ; l'étape 4 lève les verrous ;
> l'étape 5 seulement met la mesure en marche.

---

## Étape 1 — L'URL de politique, dans les deux consoles ⚠️ À MOITIÉ FAITE

> ✅ **App Store Connect : posée le 2026-08-18.**
> ❌ **Play Console : reportée par le fondateur**, à faire avant la prochaine soumission
> Android. ⚠️ Une seule des deux consoles remplie, c'est exactement la divergence entre
> deux déclarations publiques que l'encadré de la Play Console ci-dessous met en garde.

**Nouvelle valeur, identique des deux côtés :**

```
https://kyroz.app/legal.html
```

### App Store Connect

⚠️ **Ce n'est PAS dans « Informations sur l'app »** — c'est l'erreur qu'a faite la
première version de cette procédure, et le champ est introuvable si on le cherche là.

1. **Apps** → sélectionner Kyroz
2. Dans la **barre latérale** → **Confidentialité de l'app** (*App privacy*)
3. En face de **Politique de confidentialité** (*Privacy Policy*) → **Modifier**
4. Coller l'URL → **Enregistrer**

Le champ est **par plateforme**, pas par version, et il est localisable. Rôle requis :
Account Holder, Admin, App Manager ou Marketing.

⏳ **Le changement ne s'applique qu'à la prochaine version publiée** (« Any changes to
the URLs releases with your next app version »). La fiche App Store continuera donc
d'afficher l'ancienne URL jusqu'à la prochaine soumission — sans conséquence : elle
répond toujours 200 et sert le même texte. Ce qui compte, c'est que la nouvelle soit
posée **avant** cette soumission.
📄 <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy>

### Play Console

1. **Règles et programmes** → **Contenu de l'application** (*App content*)
2. Carte **Politique de confidentialité** → **Démarrer** (ou **Gérer** si déjà remplie)
3. Coller l'URL → **Enregistrer**

> ⚠️ Il existe aussi un champ « Politique de confidentialité » dans la **fiche Store**
> (*Store listing*) selon les versions de l'interface. Si tu le vois, mets la même
> valeur aux deux endroits : deux champs qui divergent, c'est la contradiction publique
> qu'on passe justement ce lot à supprimer.
📄 <https://support.google.com/googleplay/android-developer/answer/9859455>

**Pourquoi** : l'ancienne (`https://brgkevin-arch.github.io/Kyroz-app/legal.html`)
reste servie et valide, mais elle affiche un **pseudo personnel** dans un champ public
de fiche produit. La nouvelle est sur le domaine de la marque et sert le même fichier,
généré depuis la même source.

**Vérifier avant de valider** : la page répond 200 et porte la date du 18 août 2026.

---

## Étape 2 — App Store Connect → App Privacy ✅ PUBLIÉE le 2026-08-18

> ✅ **Faite et publiée** : les quatre types déclarés, Photos non cochées. Ce qui suit
> reste la référence des réponses — elle est **re-publiable à tout moment**, et c'est
> elle qu'on relit avant de toucher à un event.

⚠️ **C'était une PREMIÈRE déclaration, pas un ajout** — constaté à l'écran le
2026-08-18 : la page ne montre aucune section « Types de données », seulement le texte
d'introduction d'Apple et un bouton **Démarrer**. Il faut donc déclarer **tout** ce que
Kyroz collecte, pas seulement la mesure d'audience.

**App Store Connect** → ton app → *Confidentialité de l'app* → **Démarrer**.

1. « Collectez-vous des données de cette app ? » → **Oui**
2. Cocher les **quatre** types collectés (et rien d'autre) :
   - *Coordonnées* → **Adresse e-mail**
   - *Santé et forme* → **Santé** (poids, taille, masse grasse, objectif, régime)
   - *Identifiants* → **ID utilisateur**
   - *Données d'utilisation* → **Interaction avec le produit**
3. **Enregistrer**, puis répondre aux questions de chaque type (tableau ci-dessous)
4. **Publier**

> ⚠️ **Ne PAS cocher « Photos »** : les photos de progression restent sur l'appareil et
> ne sont jamais transmises. Une donnée déclarée collectée qui ne l'est pas est un
> mensonge comme un autre, juste dans l'autre sens.

| Type | Utilisations | Liée à l'identité | Suivi |
|---|---|---|---|
| Adresse e-mail | Fonctionnalité de l'app | **Oui** | Non |
| Santé | Fonctionnalité de l'app | **Oui** | Non |
| ID utilisateur | Fonctionnalité de l'app | **Oui** | Non |
| Interaction avec le produit | **Analyses** | **Non** | Non |

La dernière ligne est la seule qui diffère, et les deux écarts sont vrais : la mesure
d'audience sert aux analyses (pas au fonctionnement), et son identifiant est un
pseudonyme d'appareil — jamais le compte ni l'e-mail.

ℹ️ **Publier prend effet immédiatement sur la fiche produit, sans nouvelle version** —
l'inverse de l'URL de l'étape 1, qui attend la prochaine soumission.

Le débat « sur-déclare-t-on ? » qui figurait ici est **sans objet** : l'app est en
« 1.0 À finaliser avant soumission », il n'existe aucune fiche publique ni aucune
version en ligne dont les réponses devraient refléter la collecte. La déclaration
partira avec la première soumission. Elle reste re-publiable à tout moment.

Le détail des réponses pour la ligne qui porte la mesure d'audience :

| Champ | Valeur |
|---|---|
| Type de données | **Données d'utilisation → Interaction avec le produit** (*Usage Data → Product Interaction*) |
| Utilisation | **Analyses** (*Analytics*) — et rien d'autre |
| Liée à l'identité de l'utilisateur | **Non** |
| Utilisée pour le suivi (tracking) | **Non** |

**Les deux « non » comptent, et ils sont vrais** : les mesures sont rattachées à un
identifiant pseudonyme tiré sur l'appareil, jamais au compte ni à l'e-mail ; et il n'y
a ni ATT, ni publicité, ni suivi inter-applications.

> ⚠️ Ne coche **pas** « Diagnostics » : `app_error` n'envoie que le nom de classe de
> l'erreur et l'écran, jamais un message brut — mais surtout, Apple range les rapports
> de plantage sous Diagnostics, et Kyroz n'en envoie aucun.

Les réponses complètes sont dans `STORE-RELEASE.md` §4, à recopier.

---

## Étape 3 — Play Console → Sécurité des données ❌ RESTE À FAIRE

> ❌ **Non faite au 2026-08-18.** C'est, avec l'URL de l'étape 1, la moitié Android du
> lot — et les deux se remplissent dans la même console, en une fois.

**Play Console** → ton app → *Règles* → *Contenu de l'application* → **Sécurité des
données**.

Ajouter, dans *Activité dans l'application* :

| Champ | Valeur |
|---|---|
| Type | **Interactions dans l'application** (*App interactions*) |
| Collectées | **Oui** |
| Partagées | **Non** |
| Obligatoire ? | **Non — l'utilisateur peut choisir** (l'app fonctionne à l'identique en cas de refus) |
| Finalité | **Analyses** |
| Chiffrées en transit | **Oui** |
| Suppression possible | **Oui**, sur demande |

> ⚠️ **Les deux formulaires se remplissent ensemble.** Ils décrivent le même flux dans
> deux vocabulaires : n'en mettre qu'un à jour crée une contradiction entre deux
> déclarations publiques, que personne ne relit ensuite.

---

## Étape 4 — PostHog : les trois verrous

> 🇬🇧 **La console PostHog n'existe qu'en anglais** — aucune traduction de l'interface,
> les libellés ci-dessous sont donc donnés tels qu'ils s'affichent, avec le sens entre
> parenthèses.
> ⚠️ **Ne pas activer la traduction automatique de Chrome dessus** : leur propre doc
> signale qu'elle modifie le DOM et fait planter l'app
> (`NotFoundError: Failed to execute 'removeChild' on 'Node'`).
>
> 🇪🇺 **Et l'app du Cloud EU n'est pas `app.posthog.com`** (qui est le cloud US), mais
> **`eu.posthog.com`**. Les liens de la doc PostHog pointent par défaut vers le US : y
> aller connecté à une organisation EU montre soit une organisation vide, soit la
> mauvaise.

**Rien ne se pose tant que les trois ne sont pas faits.** Ce sont les conditions
écrites dans `RGPD-REGISTRE.md` et rappelées dans `.env.example`.

> ✅ **LES TROIS SONT LEVÉS DEPUIS LE 2026-08-18** — et la clé est posée (étape 5). Ce
> qui suit est donc l'archive de comment ils l'ont été, pas une liste à faire. Le
> troisième n'a PAS été réglé par un réglage : il a été **arbitré**, cf. 4.3.

### 4.1 — Couper la collecte d'adresse IP ✅ FAIT — vérifié le 2026-08-18

**Rien à faire.** Capture d'écran du projet Kyroz (`251977`, région `EU Cloud`),
`Settings → Products → Privacy` : l'interrupteur **Discard client IP data** est déjà
**activé**. Les projets Cloud EU le désactivent par défaut à la création — ce verrou
était une vérification, pas une action, et il est passé du premier coup.

⚠️ **Le chemin documenté par PostHog (« Settings → Project → General ») ne
correspondait pas à cette version de l'interface.** Toujours se fier à ce qui
s'affiche à l'écran plutôt qu'à une doc qui peut décrire une autre version.

Corrigé dans la foulée : le commentaire de `lib/analytics.ts` et la ligne « Adresse
IP » de `RGPD-REGISTRE.md` supposaient le défaut général de PostHog (collecte +
géolocalisation). Faux pour ce projet précisément — les deux disent maintenant
« écartée, vérifiée le 2026-08-18 ».

### 4.2 — Signer le DPA ✅ FAIT — signé et contresigné le 2026-08-18

Généré sur `eu.posthog.com` → **Organization → Legal documents** → *New Data
Processing Agreement*. Signataire Kyroz : Kévin Berger, Founder. Contresigné côté
PostHog par **Charles Cook (VP Operations)**, le même jour.

⚠️ Le chemin de `posthog.com/dpa` (un site public qui renvoie vers
`app.posthog.com/legal`, le cloud US) ne correspondait pas — le document se génère
**dans les réglages du projet EU**, pas sur une page séparée.

**PDF à conserver hors dépôt**, comme celui de Supabase.

✅ **Les deux lignes qui restaient « présumé, non lu » sont closes, le jour même** —
le fondateur a partagé le PDF signé et il a été lu :
- **§10.3–10.4** donne le cadre de transfert hors UE : DPF (auto-certification) **+**
  Clauses Contractuelles Types (EU module 2, UK Addendum, adaptations FADP), les deux
  cumulés, pas un choix. Couvre Cloudflare.
- **L'onglet « Internal Subprocessors »** de la page publique (raté aux deux premières
  tentatives — contenu chargé au clic, pas un tableau vide) nomme **Hiberly Ltd.**
  (Royaume-Uni) et **PostHog GmbH** (Allemagne).

### 4.3 — La rétention ✅ ARBITRÉ le 2026-08-18 — issue 3 retenue

🔴 **Ce verrou n'était pas un réglage à cocher — il demandait un arbitrage.**

> ✅ **Décision fondateur : réécrire la promesse plutôt que construire la purge**
> (issue 3 ci-dessous). Les quatre surfaces disent maintenant **« au moins un an, sans
> limite haute fixe »** — ce qui est vrai — au lieu de « 18 mois, puis supprimées », qui
> ne l'était pas. ⚠️ **Ce n'est pas une régression de rétention, c'est le retrait d'une
> fausse borne** : sans purge automatique, les données persistent au moins aussi
> longtemps qu'avant. Aucune tâche récurrente créée ; la suppression reste **sur demande
> individuelle**, par le mécanisme déjà en place (Réglages → Supprimer mes statistiques).
> Détail et motif : `RGPD-REGISTRE.md`, et l'amendement du §3.5 de la synthèse.

Vérification du 2026-08-18 : la doc PostHog **ne documente aucune rétention d'events
configurable**. Le plan gratuit *garantit* 1 an de conservation, après quoi les données
« peuvent passer en stockage froid » — **elles ne sont pas supprimées**. Les seules
suppressions documentées sont manuelles : projet entier, personne par personne, ou via
l'API.

Or « conservées 18 mois, puis supprimées » est écrit à **quatre** endroits : la
politique, l'écran de consentement, les Réglages, ce registre. Une durée affichée doit
être celle qui sera servie. Rien ne ment aujourd'hui — aucune donnée n'est collectée —
et c'est précisément ce que ce verrou est là pour empêcher.

**Trois issues, dans l'ordre où les essayer :**

1. **Regarder dans la console** s'il existe un réglage que la doc ne mentionne pas.
   Gratuit, et ça peut clore le sujet.
2. **Suppression périodique via l'API PostHog.** Tient la promesse telle qu'elle est
   écrite. Demande une clé API personnelle — donc secrète, donc du code serveur, pas
   du client.
3. **Réécrire la durée** dans les quatre surfaces pour dire ce qui se passe vraiment.
   Gratuit et honnête, mais le RGPD (art. 13-2-a) exige une durée ou des critères : la
   nouvelle formule devra en donner une, pas botter en touche.

⚠️ Et une conséquence produit à ne pas manquer : la synthèse analytics §3.5 justifiait
les 18 mois par la comparaison d'une saison à l'autre. Avec une conservation d'un an
sans garantie au-delà, **cette justification tombe** — c'est l'argument même qui avait
écarté les 12 mois.

> 📌 **Tranché depuis** (amendement du §3.5) : l'argument est en fait toujours servi.
> Sans purge automatique, rien ne RACCOURCIT la durée réelle — seule la borne haute
> **promise** change. On promet moins que ce qu'on garde, ce qui est le bon sens de
> l'erreur.

---

## Étape 5 — Poser la clé ✅ FAIT le 2026-08-18

- [x] Token d'ingestion `phc_…` récupéré (*Settings → Project → SDK setup*).
      **Write-only et public par conception** : l'inliner dans le bundle est normal.
- [x] **Secret de dépôt GitHub** `EXPO_PUBLIC_POSTHOG_KEY`, à côté des deux clés
      Supabase.
- [x] **Ajoutée au bloc `env:`** de l'étape `npx expo export -p web` dans
      `.github/workflows/deploy.yml` — sans ça elle ne part pas dans le bundle web.
- [x] **Variable EAS** sur les trois environnements (`production`, `preview`,
      `development`), vérifiée par `eas env:list` sur chacun.
- [x] Cases cochées dans `RGPD-REGISTRE.md` ; le bloc des trois verrous retiré de
      `.env.example`, qui explique désormais pourquoi le champ y reste **vide en
      local** (un `.env` de dev avec la vraie clé polluerait le projet de prod).

---

## Étape 6 — Les trois surfaces : où le lot est-il RÉELLEMENT arrivé ?

> 🔴 **Poser la clé ne la met pas partout.** Kyroz a trois surfaces de déploiement
> indépendantes, et à ce jour **une seule** porte le lot. Ne pas conclure de « c'est
> mergé » que c'est en ligne chez les utilisateurs.

| Surface | Comment elle se met à jour | État au 2026-08-18 |
|---|---|---|
| **Site web** (GitHub Pages) | automatique au merge sur `main` (`deploy.yml`) | ✅ **en ligne**, CI verte, vérifié en production |
| **OTA** (`eas update`) | manuel — atteint les binaires déjà installés | ✅ **publié le 2026-08-18** — groupe `f01b56ba`, runtime 1.0.0, iOS + Android |
| **Binaire** (`eas build`) | manuel — nouvelle soumission | ❌ pas nécessaire : le lot est 100 % JS |

**Ce que ça veut dire concrètement** : les binaires TestFlight en circulation (canal
`production`, runtime `1.0.0`) n'ont **ni les nouveaux textes légaux, ni la clé**.
⚠️ **Et ce n'est PAS une incohérence** : sans clé, `capture()` est un no-op, donc leur
ancien texte « aucun outil d'analyse tiers » reste **vrai pour eux**. La règle du dépôt
joue dans le bon sens — clé et textes sont absents ensemble. Rien ne ment nulle part.

### Le jour où l'OTA se publie

```bash
npx eas-cli update --branch production --clear-cache --message "…"
```

🔴 **`--clear-cache` N'EST PAS OPTIONNEL ICI.** Le cache de Metro **ne s'invalide pas**
quand la valeur d'une `EXPO_PUBLIC_*` change (CLAUDE.md §2, mesuré). C'est exactement
notre cas : une variable qui vient d'apparaître. Sans le drapeau, l'update peut partir
**sans la clé** — et ça ne se verrait pas, `capture()` ne plantant jamais.

**Vérifier l'ARTEFACT, pas la configuration** (même méthode qu'en CLAUDE.md §2) :
`eas env:exec production 'npx expo export …'` puis `strings -a` sur le `.hbc`. Le témoin
`phc_qELCvYG4…` est **ASCII pur**, donc `strings` le trouve — contrairement à toute
phrase accentuée, qui rendrait 0 à tort.

⚠️ **Et l'OTA ne déclenchera pas la mesure pour les comptes existants.** L'écran de
consentement ne vit que dans l'onboarding : qui l'a déjà terminé ne le reverra jamais,
donc son consentement reste `null`, donc `capture()` reste no-op. Il faudrait qu'il
bascule lui-même « Statistiques d'usage » dans les Réglages. Concrètement, la mesure
démarrera avec les **nouvelles installations**, pas d'un coup pour tout le parc.

---

## Ce que ces étapes ne sont pas

Elles ne rendent **pas** la mesure obligatoire : `capture()` reste un no-op sans
consentement « granted », et le refus n'a aucune conséquence sur l'usage de l'app.
Elles ne changent **pas** ce qui est mesuré : les 13 événements et leurs interdits sont
tenus par `lib/__tests__/analyticsPerimetre.test.ts`.
