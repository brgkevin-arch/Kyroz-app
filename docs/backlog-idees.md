# Backlog d'idées — « Plus tard » et « Kyroz+ »

Source : brouillon du fondateur, 21 septembre 2026 à 02 h 11.
Rien n'est arbitré ici : cette page met le brouillon en cases à cocher, puis le range
selon **ce qu'il en coûte à livrer**. Le libellé d'origine est conservé.

`[K+]` = listé dans l'offre payante Kyroz+.

## La règle du partage

Kyroz est sous `runtimeVersion: fingerprint`. Concrètement :

- **Sans nouveau binaire (OTA)** : tout ce qui ne touche ni `package.json`,
  ni les `plugins` / permissions de `app.json`. Livré en quelques minutes,
  sans passer par la revue Apple.
- **Nouveau binaire** : dès qu'il faut une brique native, une permission iOS
  ou une entrée dans `app.json`. Coûte un build EAS **et** une revue App Store
  (plusieurs jours), et l'empreinte change → la ligne OTA se coupe pour les
  anciens binaires.

Ce qui est **déjà dans le binaire** et ne coûte donc rien de plus :
appareil photo et photothèque (`expo-image-picker`, permissions déjà déclarées),
notifications, achats intégrés, écriture de fichiers, feuille de partage iOS.

---

## Déjà livré

- [x] Objectif daté `[K+]`
- [x] Photo poids `[K+]`

---

## 1. Sans nouveau binaire — livrable en OTA

### Saisie d'un repas géré par l'utilisateur

- [ ] Rendre intuitif le cas « je gère mon repas du midi » (aujourd'hui ça ne l'est pas)
- [ ] À la saisie d'un repas répétitif (« je gère ce repas ») : choisir **soit** les macros **soit** les ingrédients
- [ ] Pouvoir y mettre une recette du catalogue
- [ ] Ajouter au plan en cours une recette qu'on aime, depuis l'écran Recettes

### Recettes et cuisine

- [ ] Demander quels outils de cuisine l'utilisateur possède, et adapter les plats à ce qui est réalisable
- [ ] « Proposez vos recettes » (recettes envoyées par les utilisateurs)
- [ ] Moteur « 0 gaspillage »

### Compte

- [ ] Changer mot de passe, nom, e-mail — *côté Supabase, pas côté binaire*
- [ ] Détecter qu'un e-mail a déjà un compte

### Suivi du résultat

- [ ] Boucle de suivi : « tu suis bien le plan ? » → si oui, résultat ? → oui : on continue ; non : on réévalue le plan (ou mauvaise saisie ?)
- [ ] Repérer quand la pesée ne va pas dans le sens de l'objectif, et demander à la personne ce qui ne va pas

### Sortie et partage

- [ ] Partager sa liste de courses / l'enregistrer dans Notes — *la feuille de partage iOS est déjà accessible*

### Kyroz+

- [ ] Batch cooking `[K+]`
- [ ] Plan 2 semaines / 1 mois `[K+]`
- [ ] Analyse des anciens plans `[K+]`
- [ ] Régénération d'un repas ou d'un plan `[K+]`
- [ ] Conseil : se peser à jeun le matin `[K+]`
- [ ] Option « couple » / « famille » `[K+]`
- [ ] Livraison via Leclerc, etc. `[K+]` — *si c'est un lien vers leur site ; un SDK partenaire ferait basculer en binaire*

### Divers

- [ ] Plus de phrases de bonjour
- [ ] Médiateur consommateurs — *mention légale : fiche store et site, sans doute rien dans l'app*

---

## 2. Nouveau binaire requis

- [ ] **Connecter Apple Health** — HealthKit est une brique native absente du binaire, avec une autorisation Apple à demander en plus (`com.apple.developer.healthkit`). Build **et** revue.
- [ ] **Icône d'app personnalisée** `[K+]` — les icônes de remplacement sont compilées dans le binaire : une icône non livrée n'existe pas. Chaque nouvelle icône = un nouveau build.
- [ ] **Avoir sa liste de courses en photo** — transformer un écran en image demande une brique native absente. *À l'inverse, « partager » et « enregistrer dans Notes » passent en OTA (section 1).*

---

## 3. Les deux scans — décision du fondateur, 21 septembre 2026

**Scan d'un repas** (façon Yazio) : **attend.** Pas de chantier ouvert.

**Scan du ticket de caisse** : voulu **assez vite**, pour que la réserve se
remplisse avec les quantités réellement achetées.

### Ce qui existe déjà

La réserve est complète : modèle (`lib/pantry.ts`), fusion des doublons,
classement frais/sec, déduction automatique après chaque repas mangé, recettes
réalisables avec ce qu'il reste. Elle a déjà **deux portes d'entrée** —
la clôture des courses (`courses.tsx:308`) et l'ajout à la main (`reserve.tsx:109`).
Les deux appellent le même `addOrMerge`.

Le scan serait une **troisième porte** sur la même plomberie. Il ne reste à écrire
que : photo → lignes `{ nom, quantité, unité }`.

### Ce qui reste à écrire — et où est vraiment la difficulté

- [ ] **Lire le ticket** — côté serveur (fonction Supabase), donc **OTA**.
      Une photo de ticket qui quitte le téléphone = fiche App Privacy et
      `RGPD-REGISTRE.md` à mettre à jour.
- [ ] **Traduire les libellés d'enseigne en ingrédients du catalogue** — le vrai
      chantier. `refDuNom()` exige aujourd'hui un nom **exactement** égal à celui
      du catalogue : « BANANE CAVEND. CAT1 » ne retrouve pas « Bananes ».
      Sans ce dictionnaire, la réserve se remplit d'articles qu'aucune recette
      ne sait consommer — le moteur « 0 gaspillage » irait dans le mur.
- [ ] **Écran de correction** — un ticket ne porte pas toujours le poids : il est
      dans le libellé quand il y est (« PATES 500G »), au kilo pour ce qui est pesé,
      absent le reste du temps. La couverture sera partielle par nature, donc
      l'utilisateur doit pouvoir corriger avant d'envoyer en réserve.

**Verdict de coût : OTA**, tant que la lecture se fait côté serveur.
Une lecture sur l'appareil (Vision d'Apple) ferait basculer en nouveau binaire.
