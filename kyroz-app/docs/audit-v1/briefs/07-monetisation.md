# Brief — Étape 7 : Monétisation & entitlement

Mission : vérifier que le modèle Kyroz+ est implémenté comme décidé, qu'aucun utilisateur payant ne peut être bloqué à tort, qu'aucun utilisateur gratuit n'est trompé, et que le paywall passe la review.

**Condition de lancement** : l'entitlement à trois états (free / trial / plus) est implémenté. S'il ne l'est pas, ou partiellement : ne fais que la section A (écart vs stratégie), commite en `(partiel)`, arrête. Ne juge pas du code en cours d'écriture.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ».
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier ou section traité : écris les constats, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si tu ne peux pas conclure, écris ce qui bloque.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo (sandbox, dashboard RevenueCat) va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 07 monétisation"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 07 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Contexte produit — décisions validées

- Freemium. Essai Kyroz+ de 14 jours **sans carte**, déclenché après la génération du premier plan. Un essai sans carte est géré par l'app (pas une offre d'introduction StoreKit / Play) : pas de moyen de paiement, donc aucun prélèvement à la fin. Si l'implémentation utilise en fait une offre d'introduction du store, le mot « sans carte » est faux dans tous les textes = **P0** texte.
- Gate par portée temporelle : gratuit = 1 jour de plan, Kyroz+ = 7 jours. Avertissements de sécurité et précision des calculs (TDEE, macros) **toujours gratuits**.
- Trois états : free / trial / plus. Matrice de gating par écran attendue en source unique.
- Abonnement annuel uniquement. Deux SKU : lancement (retiré à une date annoncée publiquement) et standard. Prix bloqué tant que l'abonnement reste actif. Montants encore à définir : ce n'est pas un constat.
- RevenueCat en remote config dès le départ ; déclaré sous-traitant, base légale exécution du contrat.
- PostHog n'est pas audité ici (étape 8), mais signale tout `capture` dans le flux d'achat pour l'étape 8.
- Zéro malhonnêteté : le paywall et les textes de gate disent exactement ce que fait l'app.

## Cadrage

```bash
git rev-parse --short HEAD
git ls-files | grep -Ei 'premium|entitlement|paywall|subscription|purchases|revenuecat|trial|offering'
git ls-files | xargs grep -IlE 'react-native-purchases|Purchases\.|getCustomerInfo|restorePurchases|getOfferings|logIn\('
git ls-files | xargs grep -IlE 'isPremium|isPlus|isTrial|entitlement|canAccess|gate'
git ls-files | xargs grep -IlE 'trial_started|trialStart|trial_end|trialEnd'
git ls-files | grep -Ei '\.sql$' | xargs grep -IlE 'trial' 2>/dev/null
```

« Reste à couvrir » = `lib/premium.ts`, la configuration RevenueCat, le paywall, chaque écran contenant un check d'entitlement, les migrations / colonnes liées à l'essai.

## Grille de contrôle

### A. Écart vs stratégie (toujours)

Tableau A : chaque décision ci-dessus → implémentée / partielle / absente / divergente, `fichier:ligne`. Divergence sur « sécurité et précision toujours gratuits » = **P0**.

### B. Source de vérité de l'entitlement

- Où sont calculés les trois états ? Une fonction unique, ou des checks dispersés (`git ls-files | xargs grep -IcE 'isPremium|isPlus|isTrial' | grep -v ':0$'`) ? Dispersé = **P1** (incohérences garanties).
- `plus` = `customerInfo.entitlements.active[<id>]` : l'identifiant d'entitlement est une constante unique, cohérente avec le dashboard (checklist humaine) ?
- `trial` = fenêtre calculée depuis un horodatage **serveur** (colonne Supabase écrite avec `now()`), pas depuis l'horloge de l'appareil ni un flag local seul. Flag local seul = **P1** (réinstallation = nouvel essai ; changement d'horloge = essai infini). Horodatage client = **P1**.
- Déclencheur : après la première génération de plan, une seule fois (idempotent : deux générations rapides, deux appareils) ; fuseau horaire.
- Fin d'essai : ce que voit l'utilisateur (le jour 7 disparaît proprement, texte honnête, aucun blocage des écrans gratuits) ; aucun texte ne laisse entendre un prélèvement.

### C. Résilience

- Démarrage hors ligne ou RevenueCat injoignable : quel état par défaut ? Dernier état connu (attendu : cache du SDK + cache propre). Défaut à `free` = **P1** (payant bloqué). Défaut à `plus` = **P1** (premium gratuit).
- `getOfferings` en échec : le paywall affiche quoi ? Paywall sans prix = **P0** (rejet + malhonnête). Fallback attendu : message + réessayer, jamais un prix codé en dur.
- Remote config : quels paramètres sont distants (jours d'essai, portée du gate, SKU affiché ?) et quelle valeur par défaut embarquée pour chacun quand le distant est indisponible. Valeur par défaut absente = **P1**.

### D. Paywall — exigences review (Apple 3.1.2, Play)

Sur l'écran même, sans scroll caché : prix depuis `product.priceString` (localisé ; string codée en dur = **P0**) ; durée (« par an ») ; mention du renouvellement automatique et de l'annulation via les réglages du store ; lien Conditions d'utilisation (EULA) et lien Politique de confidentialité ; bouton **Restaurer les achats** fonctionnel (`restorePurchases`) — absent = **P0** ; lien « Gérer l'abonnement » (`https://apps.apple.com/account/subscriptions` / Play `https://play.google.com/store/account/subscriptions?sku=…&package=…`) — absent = **P2** ; bouton de fermeture visible (pas de paywall bloquant sans issue) — sinon **P1**.

### E. Deux SKU

Les deux produits sont-ils lus depuis l'offering courant (pas depuis un identifiant codé dans l'app) ? Quand le SKU de lancement sera retiré côté dashboard, l'app affiche-t-elle le standard sans mise à jour ? Identifiant de SKU codé en dur = **P1**. Le texte early bird dit-il exactement « prix conservé tant que l'abonnement reste actif », et rien de plus (pas « à vie ») ?

### F. Identité RevenueCat

`Purchases.configure({ appUserID })` : anonyme, ou `logIn(supabaseUserId)` ? Note le choix et ses conséquences : anonyme = entitlement lié à l'appareil, restauration par reçu seulement, transfert selon le réglage « restore behavior » du dashboard ; identifié = entitlement suit le compte, et la politique de confidentialité doit dire que l'ID Supabase est transmis à RevenueCat (vérifié en étape 9 — signale seulement le fait). `logOut` au sign-out ?

### G. Transitions et cas

Tableau G, comportement observé dans le code pour chaque transition : trial → expiré ; plus → expiré (fin de période) ; plus → problème de facturation (grace period, `billingIssueDetectedAt`) ; remboursement (entitlement révoqué par RevenueCat) ; réinstallation ; nouvel appareil ; changement de compte sur le même appareil (entitlement de l'ancien encore visible = **P0**) ; achat pendant l'essai (essai coupé ? prix ?) ; horloge de l'appareil avancée d'un an.

### H. Matrice de gating par écran

Tableau H : écran / composant × free / trial / plus, avec `fichier:ligne` du check. Vérifie par grep que les avertissements de sécurité et les valeurs TDEE / macros n'ont aucun check d'entitlement autour d'eux. Feature gratuite gatée = **P1** ; 7 jours visibles en free = **P2** ; sécurité ou précision gatée = **P0**.

### I. Android

`react-native-purchases` : version et clé Google ; comportement identique à iOS pour restore et gestion ; textes du paywall sans mention « App Store » sur Android.

## Checklist humaine

- [ ] Sandbox iOS + testeurs Play : achat, restauration sur second appareil, annulation, expiration accélérée, remboursement via dashboard RevenueCat, problème de facturation.
- [ ] Identifiant d'entitlement et offerings identiques entre code et dashboard RevenueCat ; SKU de lancement présent dans l'offering courant.
- [ ] Horloge de l'appareil avancée d'un an : l'essai et l'entitlement ne changent pas.
- [ ] Paywall relu contre Apple 3.1.2 sur capture d'écran réelle (petit iPhone, Dynamic Type élevé).
- [ ] Version de Play Billing exigée vs version RevenueCat (cf. étape 3).

## Sortie : `docs/audit-v1/07-monetisation.md`

```markdown
# Audit V1 — Étape 7 : Monétisation & entitlement
Date : … · Commit audité : … · Périmètre : … · Entitlement 3 états : implémenté / partiel / absent

## Reste à couvrir
- [ ] …

## A. Décision → code
| Décision | Statut | Fichier:ligne | Écart |

## G. Transitions
| Transition | Comportement observé | Fichier:ligne | Constat |

## H. Gating par écran
| Écran / composant | free | trial | plus | Check (fichier:ligne) | Conforme ? |

## Constats
### 07-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Reprise

Session coupée : lis la sortie existante, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
