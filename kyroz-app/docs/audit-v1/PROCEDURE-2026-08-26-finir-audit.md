# Procédure — finir l'audit V1 : les coûts, les trois décisions, puis les formulaires
Écrite le 2026-08-26. **Une étape à la fois.** Chacune se termine par ce qu'il faut me redonner.

> **Pourquoi cet ordre.** Les formulaires (étape D) ne se remplissent pas avant les trois
> décisions de l'étape C : chacune change une case. Les remplir avant obligerait à
> re-remplir. Et l'étape B est indépendante — elle peut se faire en attendant.

---

## Étape A — les deux paliers, trente secondes chacun

### A1 · Supabase
1. Ouvre le tableau de bord Supabase → ton projet → **Settings → Billing**.
2. Relève **le nom du plan** (Free / Pro / Team) et, si tu es sur Pro, le **montant mensuel**.

> Repère : le plan Free couvre **50 000 utilisateurs actifs mensuels** et 500 Mo de base. À l'échelle actuelle, il tient.

### A2 · Le domaine `kyroz.app`
1. Ouvre ton registrar (Cloudflare, d'après la configuration DNS du dépôt).
2. Relève le **prix de renouvellement annuel** de `kyroz.app`.

**Ce que tu me redonnes :** deux lignes. « Supabase : `<plan>`, `<montant>` » · « Domaine : `<montant>`/an ».

---

## Étape B — le devis médiateur *(peut attendre, mais pas après la première vente)*

L'adhésion n'est **obligatoire que lorsque tu vends** (L.612-1) — constat **09-04**. Aujourd'hui Kyroz est gratuit, donc rien ne presse. Mais la phrase des CGU promet déjà un recours qui n'existe pas.

1. Demande un devis à un médiateur de la consommation référencé (CM2C, Medicys, AME Conso…).
2. Relève le **montant annuel** et le **nom + URL** à porter dans les CGU.

**Ce que tu me redonnes :** « Médiateur : `<nom>`, `<URL>`, `<montant>`/an » — ou « reporté ».

> ⚠️ Si tu reportes : je retire la phrase des CGU maintenant. Un recours promis et inexistant est un faux, et c'est plus coûteux qu'une phrase absente.

---

## Étape C — les trois décisions qui précèdent les formulaires

Aucune n'est technique. Chacune change une case de saisie.

### C1 · `identifyUser` — à chaque connexion, ou à l'ouverture du paywall ?
- **Aujourd'hui** : l'identifiant de ton compte Supabase part chez RevenueCat **dès la connexion**, abonné ou non.
- **Ce que ça coûte** : le §2 de la politique dit le contraire (« uniquement si vous souscrivez ») — c'est le constat **09-01** — et la base légale « exécution du contrat » se défend mal pour quelqu'un qui n'a rien souscrit.
- **Mesuré** : l'appel au démarrage est **inutile aujourd'hui**. `premiumAccess` sort avant même de lire `entitled` tant que `PAYWALL_LAUNCH` est `null`, et il n'est consommé qu'à trois endroits.
- ➡️ **Le différer rend le §2 ET le §5 vrais sans réécrire un mot.**

**Réponse attendue :** « différer » ou « laisser ».

### C2 · Les sauvegardes OS — qu'est-ce qu'on exclut ?
Constat **09-02**. Aujourd'hui **tout** part dans iCloud et Google, et cinq phrases de la politique le démentent, dont « Aucune donnée de santé ne quitte l'Union européenne ».

| Donnée | Recommandation | Pourquoi |
|---|---|---|
| Jeton de session | **exclure** | risque pur, aucun bénéfice |
| Profil, pesées | **exclure** | déjà au serveur, restaurés à la connexion |
| **Photos de progression** | **GARDER** | jamais transmises au serveur — la sauvegarde est leur **seul filet**. Les exclure les détruirait au changement de téléphone |
| Écarts hors plan | garder | local, enjeu moindre |

➡️ Puis on corrige les deux phrases (`legal.ts:218` et `:118`) et on déclare Apple et Google au registre **pour ce périmètre restreint**.

**Réponse attendue :** « recommandation retenue » ou ton arbitrage.

### C3 · `WRITE_EXTERNAL_STORAGE` — on la retire ?
Constat **03-02**. Elle est déclarée sans **aucun** usage : `lib/photos.ts` n'ouvre que la caméra et la photothèque, rien n'écrit hors du bac à sable. Une ligne dans `blockedPermissions`.

➡️ **À faire avant** de remplir Data Safety : on ne déclare pas une permission qu'on n'utilise pas.

**Réponse attendue :** « retirer » (recommandé) ou « garder ».

---

## Étape D — remplir les deux formulaires

**Ne commence pas avant que C1, C2 et C3 soient tranchées et appliquées.**

Ouvre `docs/audit-v1/09-BROUILLON-FORMULAIRES.md` : il est écrit **depuis le code**, ligne par ligne, avec la mesure de chacune. C'est ta checklist de saisie.

### D1 · App Store Connect → App Privacy
Section **A** du brouillon. Points de vigilance :
- **Health & Fitness**, collectée et **liée à l'identité** ;
- **Identifiers → User ID partagé avec un tiers** (RevenueCat) — la case dépend de **C1** ;
- **Usage Data : non** (la mesure est éteinte) ;
- **Tracking : non**.

### D2 · Play Console → Data Safety
Section **B** du brouillon. Points de vigilance :
- **chiffrées au repos sur l'appareil : NON** — AsyncStorage est en clair, la politique le dit déjà ;
- les **permissions résolues**, pas `app.json` — qui en déclare zéro alors qu'il y en a trois (constat **03-01**).

**Ce que tu me redonnes :** une capture de chaque formulaire une fois rempli.

---

## Étape D bis — avant de publier l'OTA qui portera ces textes

🔴 **Quatre révisions légales sont tombées le 26 août, aucune n'est encore servie.** Une date d'entrée en vigueur est celle de la **livraison**, pas du commit — au 27, « 26 août 2026 » est devenu faux.

⚠️ **`legal.test.ts` ne peut pas l'attraper** : il compare l'empreinte du *texte*, et le texte n'a pas bougé — seul le calendrier. Un garde-fou vert pendant que ce qu'il garde devient faux.

✅ **C'est `npm run check:ota` qui le dit maintenant**, section « Le texte légal » : il compare `constants/legal.ts` du commit **en tête du canal** à celui du dépôt. Tant qu'ils diffèrent, il rappelle de ré-arbitrer la date.

**Le geste, au moment de publier :**
1. `npm run check:ota` → lire la section « Le texte légal ».
2. Si elle avertit : mettre `effectiveDate` (`constants/legal.ts`) **et** `DERNIERE_REVISION.date` (`legal.test.ts`) à la date **du jour de publication**.
3. Reporter l'empreinte, `npm run gen:legal`, puis publier.

---

## Étape E — je relance l'étape 9

Avec les deux captures, l'étape 9 ne fait plus un audit : elle **compare** le brouillon à ce que tu as saisi. C'est le tiers qui manquait, et il devient mécanique.

Les cinq autres pièces sont déjà prêtes dans `docs/audit-v1/09-PIECES-A-ATTACHER.md`.

---

## Ce que cette procédure ne couvre pas

Le **lot du prochain binaire** (SDK 57 + `fingerprint` + crash reporting + build + captures de review). Il est chiffré dans `04-01-CHIFFRAGE-SDK57.md` et attend une seule décision de ta part. Il est indépendant de tout ce qui précède, sauf **C3**, qui doit être appliquée avant le build.
