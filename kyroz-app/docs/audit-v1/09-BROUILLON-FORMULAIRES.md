# Brouillon des formulaires App Privacy & Data Safety — **écrit depuis le CODE**
Préparé par Claude Code le 2026-08-26, commit `c850512`. Chaque ligne cite sa mesure.

> **Pourquoi ce document renverse l'ordre.** L'étape 9 attendait les captures des deux formulaires pour
> les comparer au code. L'hypothèse la plus probable est qu'ils **ne sont pas encore remplis** (D-U-N-S et
> compte Play Organisation non faits). Attendre rendrait l'étape 9 structurellement inachevable.
>
> ➡️ On inverse : ce document **est le brouillon de saisie**, dérivé du code. La vérification ultérieure
> se réduit alors à une comparaison ligne à ligne, au lieu d'un audit.
>
> 🔴 **Et c'est le bon sens de lecture** : le constat **09-01** existe précisément parce que le §2 de la
> politique — la section qu'on lit d'ordinaire pour remplir ces formulaires — est **faux** sur RevenueCat.
> Remplir depuis les textes reproduit leurs erreurs. Remplir depuis le code ne le peut pas.

⚠️ **Ce document n'est pas un avis juridique.** Il dit ce que le code fait ; la qualification des catégories
et des finalités reste à valider — en particulier la base légale du point 3.

---

## A · App Store Connect — App Privacy

### Données COLLECTÉES et LIÉES à l'identité de l'utilisateur

| Catégorie Apple | Ce que c'est, concrètement | Finalité | Mesure |
|---|---|---|---|
| **Health & Fitness → Santé** | sexe, âge, date de naissance, poids, taille, %MG et sa provenance, objectif, cibles caloriques et macros, restrictions alimentaires, historique de pesées, registres d'exposition | Fonctionnalité de l'app | tableau A de `01-securite-donnees.md` — colonnes de `profiles` et `weight_logs` |
| **Health & Fitness → Forme physique** 🔴 | `activity_level`, `training_days_per_week`, `sports` (`[{type, sessions_per_week, minutes_per_session}]`), `neat_level` | Fonctionnalité de l'app | `supabase/schema.sql`, table `profiles` |

> 🔴 **La console coupe cette catégorie en DEUX cases, ce tableau n'en donnait qu'une** (relevé le
> 2026-08-28, après publication : seul *Santé* était coché). Écrire la catégorie plutôt que ses
> sous-types laisse le formulaire choisir à ta place — et il choisit celui qui vient en premier.
> **Sous-déclarer est le sens dangereux** : c'est la Guideline 5.1.1(i), et l'écart se voit à l'œil
> nu dès l'onboarding, qui demande le nombre de séances par semaine.
| **Contact Info → Email Address** | l'adresse est dans `auth.users` **et dupliquée** dans `profiles.email` | Fonctionnalité de l'app · Authentification | `supabase/schema.sql:274` (`handle_new_user`) |
| **Identifiers → User ID** | l'identifiant de compte Supabase | Fonctionnalité de l'app | `lib/supabase.ts`, `profiles.id` |

### 🔴 Donnée transmise à un TIERS — la ligne que le §2 de la politique fait manquer

| Catégorie | Destinataire | Quand | Mesure |
|---|---|---|---|
| **Identifiers → User ID** | **RevenueCat** | ✅ **uniquement quand le verdict d'accès en dépend** — donc, en pratique, pour les comptes postérieurs au paywall ; et à l'ouverture de l'écran d'achat | `hooks/usePremium.ts` → `entitlementNecessaire()` |

✅ **DÉCISION C1 PRISE ET APPLIQUÉE (2026-08-26)** : `identifyUser` a été **différé**. L'identifiant ne part plus à chaque connexion — seulement si `premiumAccess` doit consulter `entitled` (paywall lancé **et** compte non grand-péré), plus l'écran d'achat qui le force, parce qu'acheter exige de savoir à quel compte rattacher la transaction.
➡️ **Cocher « uniquement pour les abonnés »** est désormais exact, et **le §2 comme le §5 de la politique disent vrai** — sans qu'une ligne de texte ait été réécrite. Constat **09-01 résolu**.

### Données NON collectées — à cocher explicitement « non »

| Catégorie | Pourquoi non | Mesure |
|---|---|---|
| **Usage Data / Analytics** | éteint le 2026-08-26 : trois gardes en amont du `fetch`, clé retirée des trois environnements EAS, données des huit jours supprimées à la source | `08-analytics.md` · `RGPD-REGISTRE.md:73` |
| **Tracking** (au sens ATT) | aucun `expo-tracking-transparency`, aucun IDFA, `NSPrivacyTracking: false`, aucun `NSPrivacyTrackingDomains` | `03-store-readiness.md` |
| **Location, Contacts, Browsing History, Search History, Purchases*** | aucun code ne les touche | — |
| **User Content → Photos** | ⚠️ **les photos existent** mais **ne quittent jamais l'appareil** vers un serveur Kyroz. À déclarer « non collectées » — voir la réserve « sauvegardes » ci-dessous | `legal.ts:118`, `@kyroz:weightPhotos` |

\* **`Purchases` deviendra « oui »** le jour de la mise en vente, lié à l'identité, via RevenueCat.

### 🟠 La réserve que ni Apple ni Google ne demandent, et qui doit être tranchée avant

Les données locales — **jeton de session, profil de santé, pesées, photos** — partent dans les **sauvegardes iCloud et Google** : `allowBackup` n'est déclaré nulle part (défaut Android `true`), AsyncStorage est en clair, aucune exclusion iCloud. Ce n'est pas une case des formulaires, mais **ça rend fausses cinq phrases de la politique** (constat **09-02**) et ça ajoute Apple et Google comme destinataires au registre. **Décider d'abord, remplir ensuite.**

### Classification d'âge

**18+.** Le produit bloque en dessous à trois endroits (`MIN_AGE = 18`, `basicsValid`, `checkEligibility → MINOR`) et les CGU l'affirment (`legal.ts:246`). ⚠️ Vérifier que la classification déclarée dans la console **correspond** — c'est le genre d'écart qui ne se voit qu'en les mettant côte à côte.

---

## B · Play Console — Data Safety

Mêmes catégories, plus trois points propres à Android.

### Données collectées

| Type Play | Collectée | Partagée | Obligatoire | Finalité |
|---|---|---|---|---|
| **Health and fitness → Health info** | oui | non | oui | App functionality |
| **Health and fitness → Fitness info** 🔴 | oui | non | oui | App functionality | *(même angle mort qu'Apple — `activity_level`, `training_days_per_week`, `sports`)* |
| **Personal info → Email address** | oui | non | oui | App functionality · Account management |
| **Personal info → User IDs** | oui | **OUI → RevenueCat** | oui | App functionality |
| **Photos and videos → Photos** | **non** (jamais transmises) | non | non | — |
| **App activity / App info and performance** | **non** | non | — | mesure éteinte |

### Sécurité des données — les trois réponses

| Question Play | Réponse **mesurée** | Nuance à ne pas oublier |
|---|---|---|
| Les données sont-elles **chiffrées en transit** ? | **Oui** — ATS actif, `NSAllowsArbitraryLoads: false`, aucune URL `http://` | ✅ |
| L'utilisateur peut-il **demander la suppression** ? | **Oui** — suppression in-app, Edge Function `delete-account`, cascade sur les 6 tables | ✅ chemin complet vérifié à l'étape 1 |
| Les données sont-elles **chiffrées au repos sur l'appareil** ? | **NON** | 🔴 AsyncStorage brut, y compris le jeton de session. `legal.ts:232` le dit déjà à l'utilisateur. **Répondre non.** |

### 🔴 Les permissions — remplir depuis la config RÉSOLUE, jamais depuis `app.json`

`app.json` déclare `"permissions": []`. La config **résolue** en porte **trois** :

```
READ_EXTERNAL_STORAGE      injectée par expo-image-picker
INTERNET                   Expo
✅ WRITE_EXTERNAL_STORAGE retirée le 2026-08-26 (blockedPermissions)
```

➡️ **Un formulaire rempli depuis `app.json` déclarerait zéro permission.** C'est le constat **03-01**, et c'est exactement la forme d'erreur que ce brouillon existe pour éviter. ⚠️ Idéalement, **retirer `WRITE_EXTERNAL_STORAGE`** (une ligne dans `blockedPermissions`) **avant** de remplir : on ne déclare pas une permission qu'on n'utilise pas.

---

## C · Ordre de saisie recommandé

Trois décisions **précèdent** la saisie. **Une est prise.** Les prendre après obligerait à re-remplir.

| # | Décision | Effet sur les formulaires |
|---|---|---|
| 1 | ~~`identifyUser` à chaque connexion ?~~ | ✅ **TRANCHÉ le 2026-08-26 : différé.** La ligne « User ID partagé » se coche « uniquement pour les abonnés » |
| 2 | ~~Sauvegardes OS : exclure quoi ?~~ | ✅ **TRANCHÉ le 2026-08-26.** Android exclu (`allowBackup: false`) ; iOS dans le lot binaire. Les photos n'y étaient pas — prémisse corrigée |
| 3 | ~~`WRITE_EXTERNAL_STORAGE` : la retirer ?~~ | ✅ **TRANCHÉ le 2026-08-26 : retirée.** Data Safety ne déclare plus que `READ_EXTERNAL_STORAGE` et `INTERNET` — mesuré par `npm run check:permissions` |

Puis remplir, puis **relancer l'étape 9** avec les captures — qui ne servira plus qu'à comparer ce brouillon à ce qui a été saisi.

## Ce qui reste hors de ce brouillon

- **La déclaration Health d'Apple** (formulaire distinct, si applicable) : les données relèvent de l'article 9 du RGPD, ce qui ne préjuge pas du formulaire Apple.
- **Les URL** de support, politique et CGU à saisir dans les consoles : rien n'est versionné (`store.config.json` absent, constat **03-08**), donc rien ne les compare. À noter au moment de la saisie.
- **La qualification juridique** des catégories et la base légale du point 3 : à valider par l'avocat, avec la question de **09-01** (« exécution du contrat » pour un non-abonné).
