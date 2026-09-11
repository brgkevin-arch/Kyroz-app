# Rejet Apple du 2026-09-10 (build 20) — ✅ CLOS, renvoyé en revue le 2026-09-10

> **Une étape à la fois.** Chaque étape se termine par *« ce que tu dois voir »* : tant
> que tu ne le vois pas, on ne passe pas à la suivante. Reviens me dire ce que tu as vu,
> même quand c'est différent de ce qui est écrit ici — surtout quand c'est différent.

**Soumission** `fddc0394-b69a-41c5-b2cd-0edc471eb610` · révisée le **10 septembre 2026**
sur **iPad Air 11" (M3)** · version **1.0 (20)**.

Trois motifs. **Les deux premiers sont corrigés dans le code** (PR #252, mergée) et
n'attendent qu'un binaire ; le troisième ne se corrigeait pas dans le dépôt du tout —
c'est une **métadonnée**, et elle est **posée depuis le 2026-09-10**.

> ✅ **LES CINQ ÉTAPES SONT FAITES. RIEN N'ATTEND PLUS PERSONNE.**
> Voie A tranchée ; description et notes écrites par l'API et relues ; capture tournée
> et envoyée par le fondateur dans la Resolution Center ; **build (22) compilé, vérifié
> DANS SON IPA, téléversé et `VALID` chez Apple** ; (22) attaché à la version 1.0 et
> **renvoyé en revue le 2026-09-10 à 19 h 58** (heure de Paris).
> ➡️ **La balle est chez Apple.** Ce fichier n'est plus une carte, c'est une trace :
> il part à l'archive dès le verdict rendu.

| Motif | Nature | Où ça se règle |
|---|---|---|
| **4 — Design** · Sign in with Apple redemande le prénom | code | ✅ fait — attend un build |
| **1.4.1 — Physical Harm** · citations sans lien, et introuvables | code | ✅ fait — attend un build |
| **3.1.2(c) — Subscriptions** · pas de lien vers les CGU (EULA) dans les métadonnées | **fiche App Store** | ✅ **posé le 2026-09-10** (voie A) |

---

## Ce que la MESURE a dit, et qui n'était pas évident

Le motif 3.1.2(c) se lit comme « il manque le prix / la durée / les liens ». **C'est
faux, et c'est la fiche vivante qui le dit** — relevée par l'API le 2026-09-10 :

| Ce qu'exige 3.1.2(c) | État réel |
|---|---|
| Titre de l'abonnement | ✅ « KYROZ+ », dans la description |
| Durée | ✅ « /mois ou /an » |
| Prix | ✅ « 3,99 €/mois ou 29,99 €/an » |
| Renouvellement automatique + gestion | ✅ dit en toutes lettres |
| **Politique de confidentialité** dans le champ ASC | ✅ `https://kyroz.app/legal.html` |
| Lien dans la description | ✅ **présent** — `https://kyroz.app/legal.html` |
| **Conditions d'utilisation (EULA)** au sens d'Apple | 🔴 **le seul trou** |

🔴 **Le trou n'est pas l'absence d'un lien, c'est sa NATURE.** Apple ne reconnaît que
deux formes, et le dit dans son propre message :

> *« if you are using the standard Apple Terms of Use (EULA), include a link in the App
> Description, and if you are using a custom EULA, add it in App Store Connect »*

Kyroz est **entre les deux**, et c'est exactement ce qui se fait refuser :

- le champ **License Agreement** d'App Store Connect est **VIDE** — mesuré,
  `GET /v1/apps/6796427402/endUserLicenseAgreement` rend `data: null`. Aux yeux
  d'Apple, Kyroz emploie donc l'**EULA standard**… ;
- …mais la description ne renvoie pas vers l'EULA standard : elle renvoie vers les
  **CGU de Kyroz**, c'est-à-dire un EULA personnalisé qui n'a jamais été déclaré.

➡️ Le relecteur cherche l'une des deux formes, ne trouve ni l'une ni l'autre, et rejette.
La page `kyroz.app/legal.html` est pourtant en ligne (HTTP 200) et porte bien les
« Conditions générales d'utilisation » : **ce n'est pas un lien cassé, c'est un lien qui
n'est pas celui qu'Apple attend.**

---

## ✅ Étape 1 — la forme est choisie : VOIE A (2026-09-10)

**Deux voies, et elles ne coûtent pas la même chose.**

### Voie A — l'EULA standard d'Apple, lien ajouté à la description *(recommandée)*

On ajoute une ligne à la description :

```
Conditions d'utilisation (EULA) : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

- **Ce que ça coûte** : rien. Pas de rédaction juridique, pas de nouveau binaire, pas de
  nouvelle revue du binaire — une métadonnée se change seule.
- **Ce que ça change juridiquement** : rien de ce qui existe. L'EULA standard d'Apple
  régit la **licence du logiciel** ; les CGU de Kyroz régissent le **service** (le tarif
  bloqué à la souscription, la gratuité à vie des comptes d'avant le 2026-08-27). Les
  deux coexistent — l'EULA standard prévoit lui-même le cas, en cédant la place à
  « a valid end user license agreement entered into between you and the Application
  Provider ». Les deux liens restent donc dans la description, côte à côte.
- **C'est la voie qu'Apple cite en premier dans son propre message.**

### Voie B — déclarer les CGU comme EULA personnalisé dans App Store Connect

App Store Connect → **Général → Informations sur l'app → Contrat de licence** → coller le
texte des CGU, choisir les territoires. Un lien « Contrat de licence » apparaît alors sur
la fiche produit.

- **Ce que ça coûte** : un EULA personnalisé **doit respecter les *Minimum Terms* d'Apple**
  (`apple.com/legal/internet-services/itunes/appstore/dev/minterms/`) — clauses de
  bénéficiaire tiers, restrictions d'export, utilisateurs finaux du gouvernement
  américain… **Les CGU de Kyroz ne les portent pas aujourd'hui.** Les déclarer telles
  quelles, c'est publier un contrat incomplet et rouvrir un motif de rejet ailleurs.
- **Ce que ça apporte en plus** : un lien officiel sur la fiche produit.
- ⚠️ Pas de nouvelle revue ni de nouvelle version non plus — mais **une relecture
  juridique**, elle, est nécessaire.

➡️ **Recommandation : la voie A maintenant**, la voie B plus tard si tu veux un lien
« Contrat de licence » sur la fiche — c'est un chantier juridique, pas un correctif de
rejet.

> ✅ **TRANCHÉ : voie A.** L'EULA standard d'Apple, lien ajouté à la description.
> La voie B reste ouverte pour plus tard — elle n'est pas un correctif de rejet mais un
> chantier juridique, et rien ne presse.

---

## ✅ Étape 2 — la description est posée (2026-09-10)

**Écrite par l'API, et relue après écriture** — version 1.0 `REJECTED`, locale `fr-FR`,
**1 301 → 1 386 caractères**, les deux liens présents.

⚠️ **Elle n'a pas été retapée depuis le dépôt** : elle a été RELUE chez Apple puis
modifiée par substitution du seul bloc concerné. Recopier le texte d'ici aurait été
exactement le défaut que ce chantier venait de corriger — le dossier annonçait une
description périmée depuis treize jours.

✅ **Et les notes de revue ont suivi**, parce qu'Apple le demande nommément et parce
qu'une de leurs lignes était devenue FAUSSE : elle donnait le chemin enterré vers les
sources, celui-là même que le rejet 1.4.1 refuse. **3 952 → 3 926 / 4 000.** Ce qu'il a
fallu retrancher pour faire entrer les liens — 301 caractères, tous du doublon ou de la
mise en forme — est détaillé dans `STORE-RELEASE.md` §11.

*(Historique — ce qu'il fallait faire :)*
**À la main** : App Store Connect → l'app → la version **1.0** → **Description**.

Le texte complet à servir vit dans `STORE-RELEASE.md` §3, bloc « Description ». La seule
chose qui change par rapport à ce qui est en ligne aujourd'hui, c'est le remplacement de
la ligne :

```
Conditions d'utilisation et politique de confidentialité :
https://kyroz.app/legal.html
```

par :

```
Conditions d'utilisation (EULA) :
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
CGU Kyroz et politique de confidentialité :
https://kyroz.app/legal.html
```

> **Ce que tu dois voir** : la description enregistrée, et le compteur de caractères
> sous 4 000. *(Elle en fait 1 301 aujourd'hui ; l'ajout en met ~150.)*

---

## ✅ Étape 3 — le build (22) est fait, vérifié et téléversé

| | |
|---|---|
| Build | **(22)** · `FINISHED` · commit `2529c2c` · runtime `823c89db…` |
| Pré-vol | vert sur six points ; **et le contrôle d'APRÈS-build** a confirmé que `origin/main` valait toujours `2529c2c` — le binaire n'est pas né périmé |
| Correctifs dans l'IPA | ✅ vérifiés (voir ci-dessous) |
| Chez Apple | **`(22) VALID`**, téléversé le 2026-09-10 |

🔴 **LE (21) A ÉTÉ ANNULÉ ET SON NUMÉRO EST CONSOMMÉ** — `autoIncrement` s'incrémente à
la CRÉATION. Aucun (21) valide n'existera jamais.

### La vérification qui compte : DANS l'IPA, pas dans le dépôt

Le relecteur ouvre le binaire. Recette employée :

```
curl -sSL -o app.ipa "<artifacts.applicationArchiveUrl>"     # eas build:list --json
unzip -q app.ipa -d x
strings -a x/Payload/Kyroz.app/main.jsbundle | grep -c "<témoin>"
```

| Témoin | Attendu | Trouvé |
|---|---|---|
| les 7 DOI + `ciqual.anses.fr` | présents | **8 / 8** |
| `FULL_NAME`, `AppleAuthenticationScope` | présents | ✅ |
| `app_metadata`, `providers` | présents | ✅ |
| « Renseigné par ton compte Apple » *(UTF-16)* | présent | ✅ |
| « reportées sur tes jours » *(paragraphe retiré)* | **absent** | **0** |
| un faux DOI | **absent** | **0** — la sonde sait dire non |

⚠️ **Piège d'encodage, commis puis corrigé** : Hermes range en **UTF-16** toute chaîne
portant un seul accent. `strings` rend donc 0 sur « reportées sur tes jours » **quoi
qu'il arrive** — un témoin de contrôle qui ne prouve rien. Refait en `utf-16le`/`be`,
avec un témoin POSITIF du même encodage pour prouver que la mesure fonctionne.

### Le téléversement — 42 minutes perdues sur un faux diagnostic

`eas submit` **planifie le travail chez EAS** : le processus local n'a ni socket ni CPU,
et ressemble trait pour trait à un processus mort. Il ne l'était pas — la soumission
`27e64181` était `IN_QUEUE`, et elle a fini. En la croyant morte, j'ai tué et relancé,
donc créé un **doublon** (`8dd07372`, annulé depuis avec `eas submit:cancel`).
➡️ Le seul juge d'un travail distant est `npx eas-cli submit:list --platform ios` —
**pas** `build.submissions`, qui rend `[]` même quand une soumission tourne.
➡️ Et ne jamais canaliser une commande longue dans `tail` : il ne rend rien avant la
fin. Détail : CLAUDE.md §11.

---

## ✅ Étape 4 — la réponse et la capture sont ENVOYÉES (2026-09-10)

**Tournée le 2026-09-10 à 15 h 56** — 40 s, iPhone, build (20), un seul plan continu.
Vérifiée image par image : les deux formules avec titre, durée et prix (plus le prix par
unité de l'annuel), les mentions de renouvellement, « Restaurer mes achats », **le lien
légal TAPÉ** et l'écran « Confidentialité & CGU » parcouru, **un achat sandbox qui
aboutit**, puis l'écran une fois le droit accordé.

✅ Elle couvre donc `3.1.2(c)` **et** éteint tout reste de `2.1(b)`.
✅ Les prix en dollars ne sont pas un défaut : mêmes paliers Apple, autre territoire —
la démonstration et le paragraphe d'explication sont dans `STORE-RELEASE.md` §11-bis.

### ✅ Envoyé par le fondateur — et c'est le seul geste que l'API ne permet pas

**La Resolution Center n'existe pas dans l'API App Store Connect.** Aucun point d'entrée
ne permet de lire le message d'Apple ni d'y répondre : c'est le seul geste de ce dossier
que je ne peux poser ni vérifier.

1. App Store Connect → l'app → **Resolution Center** (le fil du rejet du 10/09).
2. **Coller le texte de réponse** — `STORE-RELEASE.md` §11-bis, bloc « Texte de réponse ».
3. **Joindre la vidéo** (`~/Desktop/ScreenRecording_09-10-2026 15-56-05_1.mp4`, 30 Mo).
4. Envoyer.

> **Ce que tu dois voir** : ta réponse dans le fil, avec la pièce jointe visible.

⚠️ **Répondre ne resoumet PAS l'app.** Les motifs 4 et 1.4.1 attendent le binaire
(étape 3) ; la réponse ne les couvre pas, elle ne couvre que `3.1.2(c)`.
⚠️ **Et le lien vidéo n'a pas sa place dans les notes de revue** : elles sont à
3 926 / 4 000, il reste 74 caractères, et Apple demande une réponse au MESSAGE, pas une
note.

---

### Ce qu'Apple demande, mot pour mot

> *« reply to this message with a screen recording to confirm. Include this information
> in the Notes field of the App Review Information section »*

*(La seconde phrase est faite : les liens sont dans les notes depuis le 2026-09-10.
La première attend ton envoi ci-dessus.)*

---

## ✅ Étape 5 — le (22) est attaché et renvoyé en revue (2026-09-10)

Fait par le fondateur dans la console, le dernier geste du dossier.

1. App Store Connect → l'app → version **1.0** → section **Build** → choisir le **(22)**.
2. Vérifier les abonnements joints à la soumission :

   | Produit | Doit | Mesuré après envoi |
   |---|---|---|
   | `kyroz_plus_monthly_early` · `kyroz_plus_yearly_early` | **partir** | ✅ `WAITING_FOR_REVIEW` |
   | `kyroz_plus_monthly` · `kyroz_plus_yearly` | **rester dehors** | ✅ `READY_TO_SUBMIT` |

   🔴 Les recocher rejouerait le rejet `2.1(b)` du 03/09 — produits créés chez Apple,
   **absents du binaire**. Un abonnement configuré ne se supprime jamais : ils resteront
   là, à ne pas cocher, indéfiniment.

   🔴 **ET CETTE LIGNE ANNONÇAIT `DEVELOPER_REJECTED` POUR LES DEUX DU BAS — C'ÉTAIT
   PÉRIMÉ**, mesuré le 2026-09-10 juste avant l'envoi : ils étaient repassés à
   `READY_TO_SUBMIT`, donc **proposés à la coche, pas grisés**. Le conseil ne change pas,
   le danger si : je le croyais rendu impossible par Apple, il ne tenait qu'à un clic.
   ➡️ *Ne jamais déduire « c'est verrouillé » de l'état d'hier.* Le binaire, lui, ne
   connaît QUE les deux `_early` — comptage strict dans le bytecode du (22), en excluant
   le piège du préfixe (`kyroz_plus_monthly` est contenu dans `kyroz_plus_monthly_early`) :
   0 occurrence pour chacun des deux du palier standard.
3. **Envoyer pour vérification.**

> **Ce que tu dois voir** : la version en `WAITING_FOR_REVIEW`, avec le build (22).

### ✅ Ce qui a été vu, et mesuré par l'API (2026-09-10, 19 h 58, heure de Paris)

| | |
|---|---|
| version 1.0 | `WAITING_FOR_REVIEW` |
| build attaché | **(22)** — commit `2529c2c`, runtime `823c89db…` |
| soumission | `fddc0394-b69a-41c5-b2cd-0edc471eb610` |
| abonnements partis | les deux `_early`, et eux seuls |

⚠️ **Le contenu d'une soumission ne se lit PAS dans ses `items`.** Ils n'ont ni attribut
nommé ni relation exploitable (`include=subscription` → `400 'subscription' is not a
valid relationship name`), et leur id en base64 se décode en `<soumission>|<code>|<id
INTERNE>` — cet id rend `404` sur `/v1/subscriptions/{id}`. J'ai bâti un recoupement sur
cette hypothèse et il a rendu **quatre lignes fausses**, dont deux rassurantes.
➡️ **Le juge est le champ `state` de l'abonnement lui-même.** Cf. `CLAUDE.md` §11.

⚠️ **L'API sait attacher la version à une soumission, pas les abonnements** — le chemin
console est obligatoire pour l'étape 2 (`STORE-RELEASE.md` §3-bis).
