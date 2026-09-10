# Rejet Apple du 2026-09-10 (build 20) — ce qui reste à faire à la main

> **Une étape à la fois.** Chaque étape se termine par *« ce que tu dois voir »* : tant
> que tu ne le vois pas, on ne passe pas à la suivante. Reviens me dire ce que tu as vu,
> même quand c'est différent de ce qui est écrit ici — surtout quand c'est différent.

**Soumission** `fddc0394-b69a-41c5-b2cd-0edc471eb610` · révisée le **10 septembre 2026**
sur **iPad Air 11" (M3)** · version **1.0 (20)**.

Trois motifs. **Les deux premiers sont corrigés dans le code** (PR #252, mergée) et
n'attendent qu'un binaire ; le troisième ne se corrigeait pas dans le dépôt du tout —
c'est une **métadonnée**, et elle est **posée depuis le 2026-09-10**.

> ✅ **ÉTAPES 1 ET 2 FAITES.** Voie A tranchée par le fondateur ; description et notes
> de revue écrites par l'API et **relues après écriture**. Il reste les étapes 3 et 4 :
> un build, puis la réponse au relecteur avec sa capture vidéo.

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

## Étape 3 — un build, et il en faut un  🔴 LE (21) A ÉTÉ ANNULÉ

Les motifs **4** et **1.4.1** sont corrigés et mergés, mais **le relecteur ouvre le
binaire, pas le dépôt** — une OTA ne l'atteint pas (il lance l'app une fois, et une mise
à jour ne s'applique qu'au lancement **suivant**).

🔴 **Le (21) a été lancé le 2026-09-10 à 16 h 18 sur le commit `8d25047`, puis ANNULÉ
sur décision fondateur.** Son numéro est **consommé** — `autoIncrement` s'incrémente à la
CRÉATION : **le prochain sortira en (22)**, et aucun (21) valide n'existera jamais.
Chercher un « (21) » sur TestFlight ferait perdre du temps.

### Le pré-vol, à REFAIRE avant de relancer

Il avait été passé et il était vert. Il se refait quand même, parce que `main` bouge :
**quatre PR ont été mergées par d'autres sessions pendant ce chantier**, et cinq
worktrees étaient actifs.

```
git status --short                 # vide
git fetch origin && git rev-parse HEAD origin/main   # identiques
gh pr list --state open            # rien en vol
git worktree list                  # qui travaille en parallèle
npx tsc --noEmit && npm test       # muet, et tout au vert
```

Puis, **et c'est celle qu'on saute** :

```
npx expo-updates fingerprint:generate --platform ios      # l'empreinte de main
npx eas-cli build:list --platform ios --limit 2 --json --non-interactive
  → build.runtime.version                                  # celle du binaire
```

🔴 **ÉTAT MESURÉ LE 2026-09-10 : la ligne OTA vers le (20) est COUPÉE.** Le (20) tourne
sur `5118d1bd…`, `main` vaut `823c89db…`. **Ce n'est pas ce chantier** — l'empreinte lui
était restée identique. C'est **#249**, qui a ajouté `"mesure:instructions"` aux `scripts`
de `package.json`. Un script de mesure qui ne part jamais dans l'app, et qui coupe la
ligne. Sans conséquence ici (on fabrique un binaire neuf), mais **aucune OTA n'atteint
les testeurs du (20) d'ici là**.

### Lancer

```
npx eas-cli build --platform ios --profile production --non-interactive
```

> **Ce que tu dois voir** : `FINISHED`, et **le COMMIT du build égal à `origin/main`** —
> pas sa date. Un binaire se périme PENDANT qu'il compile ; c'est ce contrôle-là, APRÈS
> le build, qui a sauvé le (6) en août.

⚠️ **Et à la soumission** : les deux produits `_early` partent (`READY_FOR_REVIEW`), les
deux du palier standard restent dehors (`DEVELOPER_REJECTED`) — les recocher rejouerait
le rejet `2.1(b)` du 03/09. Cf. `STORE-RELEASE.md` §11-bis.

---

## Étape 4 — répondre au relecteur ✅ la capture est FAITE, reste à l'envoyer

**Tournée le 2026-09-10 à 15 h 56** — 40 s, iPhone, build (20), un seul plan continu.
Vérifiée image par image : les deux formules avec titre, durée et prix (plus le prix par
unité de l'annuel), les mentions de renouvellement, « Restaurer mes achats », **le lien
légal TAPÉ** et l'écran « Confidentialité & CGU » parcouru, **un achat sandbox qui
aboutit**, puis l'écran une fois le droit accordé.

✅ Elle couvre donc `3.1.2(c)` **et** éteint tout reste de `2.1(b)`.
✅ Les prix en dollars ne sont pas un défaut : mêmes paliers Apple, autre territoire —
la démonstration et le paragraphe d'explication sont dans `STORE-RELEASE.md` §11-bis.

### 🧑 Ce qui reste, et c'est à toi — je ne peux pas le faire

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
