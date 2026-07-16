# Kyroz — Dossier de sortie stores (App Store + Google Play)

> Playbook de première soumission. **Ce qui est codable est fait** (config, icônes,
> splash, `eas.json`, URL de confidentialité). Il te reste des actions qui demandent
> ton **identité, ton argent, ou un device** (comptes, screenshots, build). Tout est
> ci-dessous, dans l'ordre.

---

## 0. État — prêt vs à toi

| Élément | État |
|---|---|
| Identité app (`bundleIdentifier`/`package` = `app.kyroz.mobile`, version 1.0.0) | ✅ code |
| Icône (1024², sans alpha), icône adaptative Android, splash sombre | ✅ code |
| `eas.json` (profils dev/preview/production + submit) | ✅ code |
| Permission micro parasite retirée ; photos = local-only | ✅ code |
| URL politique de confidentialité (HTTP 200) | ✅ en ligne |
| Textes de fiche (FR), réponses confidentialité, classification | ✅ ci-dessous (§3–6) |
| **Comptes développeur Apple + Google** | ⛔ **toi** (§1) |
| **Screenshots + feature graphic** | ⛔ **toi** (§7) |
| **Compte de test pour le reviewer** | ⛔ **toi** (§9 — piège classique) |
| **Lancer le build EAS** | ⛔ **toi** (§8) |

---

## 1. Comptes développeur (bloquant — argent + identité, prévoir des délais)

- **Apple Developer Program** — 99 €/an — https://developer.apple.com/programs/
  - Compte individuel : Apple vérifie ton **identité** (pièce d'identité). Compte
    micro-entreprise possible mais demande un **numéro D-U-N-S** (gratuit, ~1–2 sem
    de délai). Le plus rapide pour démarrer = **compte individuel**.
- **Google Play Console** — 25 € une fois — https://play.google.com/console/signup
  - ⚠️ **Piège délai** : depuis nov. 2023, un **compte personnel** neuf doit faire
    tester l'app par **au moins 12–20 testeurs pendant 14 jours** avant de pouvoir
    passer en production. **À anticiper** (recrute tes testeurs tôt). Un compte
    **organisation** (entreprise) n'a pas cette contrainte.

Sans ces deux comptes, rien ne peut être soumis. Le reste (§2–7) peut se préparer en parallèle.

---

## 2. Identité technique (déjà dans le code — pour référence)

| Champ | Valeur |
|---|---|
| Nom | Kyroz |
| Bundle iOS / package Android | `app.kyroz.mobile` |
| Version | 1.0.0 |
| EAS projectId | `28dc4c7e-cace-4fa2-80ba-7b503804d18e` (owner `kevinberger`) |
| Thème | Sombre (splash + UI) |
| Orientation | Portrait |

> **Décision à prendre — iPad.** `app.json` a `supportsTablet: true`. Conséquence :
> **Apple exige des screenshots iPad** en plus de l'iPhone, et testera la mise en
> page tablette. Kyroz est pensé **téléphone d'abord**. Reco : passer à
> `supportsTablet: false` pour le 1er lancement (moins de friction). **Dis-le-moi,
> je le change en 10 s.**

---

## 3. Fiche store — textes FR (à copier-coller)

**Nom** (30 car. max) : `Kyroz`

**Sous-titre Apple / titre court** (30 car. max) :
`Repas calés sur tes macros`

**Texte promotionnel Apple** (170 car., modifiable sans review) :
`Ton plan de repas hebdo, précis au gramme, adapté à ton objectif et ton sport. Gratuit, sans compte requis pour démarrer.`

**Description** (App Store + Google Play) :
```
Kyroz calcule ton plan de repas de la semaine, précis à la macro près, à partir
de ton profil : objectif (sèche, maintien, prise de masse), sport, préférences et
régime. Pas de blabla : un plan crédible dès le premier jour.

• Plan 7 jours généré automatiquement, ajusté à tes calories et tes protéines
• 264 recettes, adaptées à ton régime (végétarien, vegan, sans gluten, sans
  lactose, sans porc, halal, pescétarien)
• Quantités ajustées automatiquement pour tomber sur tes macros
• Liste de courses (qui déduit ce que tu as déjà) + garde-manger
• « Recale ma journée » : un imprévu, un repas sauté ? Le plan se réajuste
• Suivi de série pour tenir le rythme
• 100 % gratuit sur le cœur, fonctionne hors-ligne

Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent
pas l'avis d'un médecin ou d'un diététicien-nutritionniste.
```

**Mots-clés Apple** (100 car., séparés par des virgules, sans espaces) :
`macros,nutrition,repas,fitness,muscu,prise de masse,seche,calories,proteine,meal prep,regime,sport`

**Catégorie** : Santé et forme (Health & Fitness). Secondaire (Google) : Nutrition.

**URL politique de confidentialité** (obligatoire, déjà en ligne, HTTP 200) :
`https://brgkevin-arch.github.io/Kyroz-app/legal.html`

**Support / contact** : `contact@kyroz.app`

---

## 4. Confidentialité — réponses aux formulaires (fondées sur le vrai flux de données)

> Base factuelle : compte Supabase (UE), profil = données de santé, photos
> **local-only jamais envoyées**, **aucune analytics active** (PostHog câblé mais
> DORMANT, sans clé), pas de pub, pas de tracking tiers. Suppression du compte +
> données possible **dans l'app** (Profil → supprimer le compte).

### Apple — « App Privacy »
| Donnée | Collectée ? | Usage | Liée à l'identité ? | Tracking ? |
|---|---|---|---|---|
| Adresse e-mail | Oui | Fonctionnement de l'app (compte) | Oui | Non |
| Santé & forme (poids, objectif, régime) | Oui | Fonctionnement de l'app | Oui | Non |
| Identifiant utilisateur (ID compte) | Oui | Fonctionnement de l'app | Oui | Non |
| Photos (progression) | **Non collectée** | — | — | — (restent sur l'appareil) |
| Données d'usage / analytics | **Non** (dormant) | — | — | — |
| **Suivi (tracking)** | **NON** — pas d'ATT, pas de pub, pas de partage tiers | | | |

### Google Play — « Sécurité des données »
- **Collectées** : e-mail ; infos de santé (poids, objectif, régime) ; ID compte.
- **Chiffrées en transit** : oui. **Stockage** : UE (Supabase Frankfurt).
- **Partagées avec des tiers** : **NON**.
- **L'utilisateur peut demander la suppression** : **OUI, dans l'app** (Profil →
  supprimer le compte → cascade + purge locale). Indiquer aussi `contact@kyroz.app`.
- **Photos** : non collectées (restent sur l'appareil).

> ⚠️ **Le jour où tu actives PostHog** (analytics), il faudra **mettre à jour ces
> deux formulaires** (ajouter « Données d'usage », consenties). Tant que la clé
> n'est pas posée, rien n'est collecté → déclarer « non » est exact aujourd'hui.

---

## 5. Santé — conformité (éviter le rejet « app médicale »)

- Le **disclaimer** est déjà affiché in-app (onboarding, réglages, chaque plan) :
  *« Kyroz est conçu pour des adultes en bonne santé… ne remplace pas l'avis d'un
  médecin ou diététicien-nutritionniste. »* — garde-le visible.
- **Ne revendique AUCUN bénéfice médical/thérapeutique** dans la fiche (pas de
  « soigne », « guérit », « perte de poids garantie ») → sinon catégorie médicale
  + exigences de preuves.
- Recettes : `validated_by_dietitian = false` aujourd'hui. On ne prétend donc
  **pas** de validation par un professionnel — cohérent, ne l'écris pas dans la fiche.
- Hard-blocks déjà en place (min 1500/1200 kcal, pas de <16 ans, pas de pathologie/
  grossesse) : c'est ce qui te protège en review.

---

## 6. Classification d'âge

- Réponds au questionnaire **honnêtement** : pas de violence, pas de contenu sexuel,
  pas de jeu d'argent. Thème = **gestion du poids / régime**.
- Attendu : **Apple 12+** (référence au poids/régime), **Google PEGI 3 / « Tout
  public »** avec la mention diététique. L'app **bloque déjà les <16 ans** à
  l'inscription — cohérent avec un classement 12+.

---

## 7. Visuels à produire (à toi — impossible sans device/design)

- **Screenshots iPhone 6.7"** (1290×2796) : **min 1, jusqu'à 10**. Montre les écrans
  forts : (1) plan du jour, (2) une recette + macros, (3) liste de courses,
  (4) onboarding/objectif, (5) série. *(iPad requis seulement si `supportsTablet:true` — cf. §2.)*
- **Google Play** : min **2 screenshots** téléphone + un **feature graphic 1024×500**
  (bannière — à faire sur Canva/Figma) + l'icône 512×512 (déjà en asset).
- **Comment capturer** : lance l'app (simulateur iOS, ou la version web pour le
  cadrage) et fais les captures aux bonnes dimensions. Je peux te générer des
  captures de cadrage depuis le web si tu veux.

---

## 8. Build & soumission (commandes)

```bash
# 1. Outil EAS (une fois)
npm i -g eas-cli        # ou préfixer les commandes par: npx eas-cli@latest

# 2. Connexion (compte Expo "kevinberger")
eas login

# 3. Build de production (eas.json est déjà configuré)
eas build --platform ios     --profile production
eas build --platform android --profile production

# 4. Soumission
eas submit --platform ios     --latest    # nécessite le compte Apple + App créée dans App Store Connect
eas submit --platform android --latest    # 1re fois : créer l'app dans Play Console, puis uploader le .aab
```

- **iOS** : laisse EAS gérer certificats + provisioning (le plus simple).
- **Android** : à la **1re** soumission, crée d'abord l'app dans la Play Console et
  uploade le `.aab` à la main (ou configure un *service account* Google pour
  automatiser `eas submit` ensuite). La clé de signature : laisse **Google Play App
  Signing** la gérer.
- `eas.json` production a `autoIncrement: true` + `appVersionSource: "remote"` → les
  numéros de build s'incrémentent tout seuls, tu n'y touches pas.

---

## 9. Checklist finale avant « Submit for review »

- [ ] ⚠️ **Compte de test pour le reviewer Apple.** Le bouton « Continuer en invité »
      est **masqué en production** (`__DEV__`), et créer un compte demande une
      confirmation e-mail. **Le reviewer Apple sera bloqué au login.** → Crée un
      **compte de démo** (e-mail + mot de passe, profil déjà rempli) et mets les
      identifiants dans **App Review Information → Sign-In required**. (Idem note de
      test côté Google.) *Alternative : je peux exposer un accès de review dédié dans
      le build — dis-moi si tu préfères ça.*
- [ ] Disclaimer santé visible (déjà le cas).
- [ ] URL de confidentialité renvoie 200 (déjà le cas).
- [ ] Screenshots aux bonnes dimensions uploadés (§7).
- [ ] Formulaires confidentialité remplis (§4).
- [ ] Décision iPad tranchée (§2).
- [ ] Pas d'allégation médicale dans la fiche (§5).
- [ ] (Android) Testeurs recrutés pour la période de 14 jours si compte perso (§1).

---

## 10. Ce que je peux encore faire pour toi (dis-moi)

- Passer `supportsTablet` à `false` (retire l'exigence iPad).
- Générer des **captures de cadrage** depuis la version web (pour préparer tes
  screenshots).
- Ajouter un **accès de review** propre (compte démo pré-rempli, ou bouton invité
  visible seulement pour un identifiant de test) — plus sûr que de bricoler `__DEV__`.
- Rédiger la **note pour le reviewer** (parcours guidé + identifiants) une fois le
  compte de démo créé.

*Playbook préparé le 2026-07-17. Config technique prête ; le chemin critique = comptes
développeur (§1) + compte de test reviewer (§9).*
