# Brief — Étape 1 : Sécurité & données

Mission : établir ce que Kyroz fait réellement des données — côté Supabase, côté appareil, côté sous-traitants — et où ça expose l'utilisateur ou Kévin. Tu audites, tu ne corriges pas.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ».
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier ou section traité : écris les constats, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si tu ne peux pas conclure, écris ce qui bloque.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 01 sécurité & données"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 01 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Contexte produit

- Stack : Expo / React Native, Supabase (auth + base), moteur de calcul 100 % local, PostHog EU (base légale : consentement), RevenueCat (base légale : exécution du contrat).
- Engagements déjà publics : pas de tracking cross-app, pas d'attribution Meta/TikTok, données PostHog pseudonymes (UUID appareil, jamais aliasé au Supabase ID), suppression ciblée possible par UUID.
- Données manipulées : poids, taille, âge, sexe, masse grasse, objectif, niveau d'activité. À traiter comme des données de santé, même si la qualification Article 9 des données locales non persistées reste une zone grise (question avocat, hors audit).
- Règle produit : zéro malhonnêteté. Un comportement du code qui contredit la politique de confidentialité ou `RGPD-REGISTRE.md` est un constat, pas une nuance.

## Cadrage (avant tout constat)

Commandes read-only. La liste résultante devient « Reste à couvrir », un fichier par ligne.

```bash
git rev-parse --short HEAD
git ls-files | grep -Ei '^supabase/|\.sql$'
git ls-files | xargs grep -IlE '@supabase/supabase-js|createClient\('
git ls-files | xargs grep -IlE 'AsyncStorage|expo-secure-store|SecureStore|react-native-mmkv|expo-file-system'
git ls-files | grep -E '(^|/)(\.env[^/]*|app\.json|app\.config\.(js|ts)|eas\.json|\.gitignore)$'
git ls-files | xargs grep -IlE 'deleteUser|auth\.admin|\.rpc\(|functions\.invoke'
git ls-files | xargs grep -IlE 'onAuthStateChange|signInWith|signOut|resetPasswordForEmail|verifyOtp'
git ls-files | grep -E '^supabase/(functions|config\.toml)'
```

Périmètre attendu : migrations SQL, `supabase/config.toml` s'il existe, client Supabase, couche auth, couche stockage local, config Expo/EAS, Edge Functions, `RGPD-REGISTRE.md` (lecture seule, pour confronter les promesses au code).

## Grille de contrôle

### A. Supabase — RLS et exposition

Pour chaque table trouvée dans les migrations, remplis le tableau A de la sortie.

- RLS activée (`enable row level security`) ? Table sans RLS dans un schéma exposé par l'API = **P0**.
- Policies par opération (SELECT / INSERT / UPDATE / DELETE) : toutes filtrent sur `auth.uid()` ? UPDATE a `using` **et** `with check` ? Policy `using (true)` sur une table utilisateur = **P0**.
- Vues : `security_invoker = true` ? Une vue sans, lisant une table sous RLS, contourne la RLS = **P0**.
- Fonctions `security definer` : `set search_path` fixé ? Exposées via RPC ? Vérifient `auth.uid()` en interne ? Sans garde = **P0**.
- Grants : `anon` a-t-il des droits sur des tables (`grant … to anon`) ?
- Triggers : lesquels écrivent dans d'autres tables. Cascade de suppression (`on delete cascade` depuis `auth.users`) présente sur toutes les tables liées à l'utilisateur ? Absente = orphelins après suppression de compte = **P1**.
- Storage : buckets et policies, bucket public ?
- Edge Functions : `verify_jwt`, garde `auth.uid()` interne, secrets via variables d'environnement uniquement.
- Colonnes : quelles données de santé sont persistées côté serveur, exactement (table, colonne). C'est l'inventaire qu'utilisera l'étape 9.

### B. Clés et secrets

- Liste toutes les `EXPO_PUBLIC_*` : `git ls-files | xargs grep -IhoE 'EXPO_PUBLIC_[A-Z0-9_]+' | sort -u`. Chaque valeur est bundlée dans l'app, donc publique. Acceptable : URL Supabase, clé anon / `sb_publishable_`, clé SDK RevenueCat (`appl_` / `goog_`), clé projet PostHog (`phc_`). **P0** si présente : `service_role`, `sb_secret_`, clé secrète RevenueCat (`sk_`), clé personnelle PostHog (`phx_`), tout token de dashboard.
- `.env*` committé ? `.gitignore` les couvre ?
- Historique : `git log --all --oneline -S'sb_secret_'`, puis idem pour `service_role`, `phx_`, `sk_`. Un secret poussé un jour reste dans l'historique même retiré depuis : constat **P0** + rotation dans la checklist humaine. La clé anon (JWT `eyJ…`) dans l'historique est normale, ne la signale pas.
- `eas.json` : secrets en clair dans `env` ?

### C. Stockage sur l'appareil

- Inventaire clé par clé de tout ce qui est persisté (AsyncStorage / MMKV / SecureStore / FileSystem) : tableau C de la sortie.
- Session Supabase : quel `storage` est passé à `createClient` ? AsyncStorage brut = refresh token lisible sur appareil rooté et présent dans les backups. Pattern attendu : clé AES dans SecureStore, session chiffrée dans AsyncStorage (SecureStore a une limite de taille par valeur). AsyncStorage brut = **P1** si les backups OS incluent ces données, **P2** sinon.
- Données profil locales (poids, MG…) : où, chiffrées ou non.
- Backups OS : `android.allowBackup` dans la config Expo, inclusion iCloud des fichiers locaux. Ce n'est pas forcément un bug, c'est une décision à documenter dans le registre RGPD (les backups transfèrent des données de santé vers Apple/Google). Non documenté = **P1**.
- Sign-out : nettoyage complet ? Un second compte sur le même appareil peut-il voir les données du premier ? Oui = **P0**.

### D. Suppression de compte (Apple 5.1.1(v), RGPD art. 17)

- Existe in-app, initiée depuis l'app, trouvable depuis les réglages ? Absente = **P0** (rejet certain).
- Chemin technique : `auth.admin.deleteUser` exige le service role, donc Edge Function ou fonction `security definer` appelée via RPC. Vérifie : garde `auth.uid()`, suppression des lignes de toutes les tables (cascade ou explicite), objets Storage, puis effacement local.
- Sous-traitants : que se passe-t-il chez RevenueCat (suppression client via API, ou procédure manuelle documentée ?) et PostHog (`reset()` côté appareil ; suppression ciblée par UUID = procédure manuelle promise par la politique ?). Non traité = **P1**.
- Abonnement actif : l'app prévient-elle que supprimer le compte n'annule pas l'abonnement (à faire dans les réglages du store) ? Absence = **P1**.
- Confirmation, délai, irréversibilité clairement dits (zéro malhonnêteté).

### E. Portabilité (art. 20)

Export existe ? Sinon, procédure manuelle documentée quelque part ? Rien = **P2** (faisable à la main pour une micro-entreprise, mais doit être possible sous un mois).

### F. Logs et messages d'erreur

- `git ls-files | xargs grep -InE 'console\.(log|info|debug|warn|error)\(' | wc -l`. Les logs sont-ils retirés en production (plugin babel `transform-remove-console` ou équivalent) ? Log de payload utilisateur atteignable en prod = **P1**.
- Erreurs affichées à l'utilisateur : exposent-elles des détails internes (message Postgres, stack) ? = **P2**.
- Aucun crash reporter n'est attendu ici (décision traitée en étape 3) : note seulement s'il y en a un et ce qu'il envoie.

### G. Auth et sessions

- Providers actifs ; flux PKCE ; `detectSessionInUrl: false` ; `autoRefreshToken` + gestion `AppState` (start/stop du refresh en arrière-plan).
- Deep link de retour (magic link / OTP / OAuth) : scheme unique, pas de scheme générique qu'une autre app pourrait capter.
- `supabase/config.toml` si présent : `enable_signup`, confirmations e-mail, `jwt_expiry`, OTP expiry — note les valeurs.
- Suppression de compte et changement de mot de passe : ré-authentification exigée ?

### H. Réseau

Aucune URL `http://` (`git ls-files | xargs grep -InE '"http://'`). ATS non désactivé dans la config iOS.

## Checklist humaine (à recopier dans la sortie)

- [ ] RLS testée avec deux comptes réels, pour chaque table : `curl -H "apikey: <anon>" -H "Authorization: Bearer <JWT compte A>" "<url>/rest/v1/<table>?select=*"` ne retourne que les lignes de A.
- [ ] Dashboard Supabase : schémas exposés à l'API, protection contre les mots de passe compromis, captcha, rate limits, expiration OTP.
- [ ] Rotation de tout secret trouvé dans l'historique git (même retiré depuis).
- [ ] Procédures de suppression chez RevenueCat et PostHog écrites noir sur blanc (où, comment, délai).
- [ ] Restauration d'un backup sur un autre appareil : les données profil y sont-elles ? Cohérent avec la décision prise ?

## Sortie : `docs/audit-v1/01-securite-donnees.md`

```markdown
# Audit V1 — Étape 1 : Sécurité & données
Date : … · Commit audité : … · Périmètre : …

## Reste à couvrir
- [ ] …

## A. Tables et RLS
| Table | Données santé | RLS | SELECT | INSERT | UPDATE (using / with check) | DELETE | Cascade depuis auth.users | Constat |

## B. Clés
| Variable | Nature | Publique acceptable ? | Constat |

## C. Stockage appareil
| Clé | Contenu | Mécanisme | Chiffré | Effacé au sign-out | Effacé à la suppression | Constat |

## D. Suppression de compte — chemin réel
(pas-à-pas avec fichier:ligne, du bouton jusqu'à la dernière ligne effacée)

## Constats
### 01-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Reprise

Session coupée : lis la sortie existante, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
