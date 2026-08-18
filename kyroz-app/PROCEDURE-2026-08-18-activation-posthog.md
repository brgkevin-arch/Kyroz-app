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

## Étape 1 — L'URL de politique, dans les deux consoles

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

## Étape 2 — App Store Connect → App Privacy

⚠️ **C'est une PREMIÈRE déclaration, pas un ajout** — constaté à l'écran le
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

Ajouter **un** type de données (tout le reste est déjà déclaré et ne bouge pas) :

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

## Étape 3 — Play Console → Sécurité des données

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

**Rien ne se pose tant que les trois ne sont pas faits.** Ce sont les conditions
écrites dans `RGPD-REGISTRE.md` et rappelées dans `.env.example`.

### 4.1 — Couper la collecte d'adresse IP

*Settings → Project → **IP data capture*** → activer **Discard client IP data**.
Un défaut existe aussi au niveau organisation : *Settings → Organization → General*.

⚠️ **VÉRIFIER AVANT DE BASCULER — le réglage est peut-être déjà bon.** La doc PostHog
dit que « les organisations EU ont par défaut la capture d'IP désactivée pour la
conformité RGPD ». Si c'est le cas ici, le commentaire de `lib/analytics.ts` (« le
comportement PAR DÉFAUT de PostHog s'applique : collecte + géolocalisation ») est
**faux**, et c'est lui qu'il faudra corriger — ainsi que la ligne « Adresse IP » du
registre. Regarder l'état réel avant de conclure : cette prémisse a été écrite d'après
le défaut *général* de PostHog, jamais re-mesurée sur un projet EU.

**Pourquoi c'est bloquant** : PostHog collecte et géolocalise l'IP **par défaut**, côté
serveur. Le client de Kyroz n'envoie rien pour la neutraliser — le défaut s'applique
donc entièrement. La politique de confidentialité ne parle pas d'IP : sans la coupure,
elle devient fausse **par omission** dès le premier événement. Tant qu'aucune clé n'est
posée, ce silence n'est pas une omission ; le jour de la clé, si.

Une fois coupée : supprimer la ligne « Adresse IP » du traitement n°2 dans
`RGPD-REGISTRE.md`.

### 4.2 — Signer le DPA

*Settings → Organization → **Data processing agreement***.

**Deux lignes du registre en dépendent** et ne peuvent pas s'écrire sans lui :
- le **périmètre des sous-traitants internes** — la page publique de PostHog a une
  section « Internal Subprocessors » dont le contenu n'a pas pu être lu (deux
  tentatives). Nature présumée : entités affiliées et filiales. **Présumé, pas lu.**
- le **cadre applicable à Cloudflare**, seul sous-traitant de leur liste dont la
  localisation est « points de présence mondiaux ».

Conserver le PDF hors dépôt, comme celui de Supabase.

### 4.3 — Configurer la rétention à 18 mois

🔴 **Ce verrou n'est pas un réglage à cocher — il demande un arbitrage.**

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

---

## Étape 5 — Poser la clé

Seulement une fois 4.1, 4.2 et 4.3 faits.

1. Récupérer le token d'ingestion `phc_…` (*Project → Settings → Project API key*).
   Il est **write-only et public par conception** : l'inliner dans le bundle web est
   normal.
2. Le poser en secret de dépôt GitHub, à côté des deux clés Supabase déjà là
   (`deploy.yml` les injecte à l'export) :
   `EXPO_PUBLIC_POSTHOG_KEY`.
3. Ajouter la variable au bloc `env:` de l'étape `npx expo export -p web` dans
   `.github/workflows/deploy.yml` — sinon elle ne part pas dans le bundle web.
4. Pour les binaires : la poser aussi dans les variables d'environnement EAS.

**Le jour où elle est posée** : cocher les cases du suivi des actions dans
`RGPD-REGISTRE.md`, et retirer de `.env.example` le bloc des trois verrous — il aura
fait son travail.

---

## Ce que ces étapes ne sont pas

Elles ne rendent **pas** la mesure obligatoire : `capture()` reste un no-op sans
consentement « granted », et le refus n'a aucune conséquence sur l'usage de l'app.
Elles ne changent **pas** ce qui est mesuré : les 13 événements et leurs interdits sont
tenus par `lib/__tests__/analyticsPerimetre.test.ts`.
