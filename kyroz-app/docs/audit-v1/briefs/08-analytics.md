# Brief — Étape 8 : Analytics & consentement

Mission : vérifier qu'aucune donnée ne part vers PostHog sans consentement, que ce qui part est exactement ce qui a été décidé, et que le code tient les promesses de la politique de confidentialité.

**Condition de lancement** : timing du consentement (§4.1) tranché et instrumentation PostHog en place. Sinon : audite uniquement la section A (mécanisme de consentement tel qu'il existe) et B.1 (initialisation), commite en `(partiel)`, arrête.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ».
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier ou section traité : écris les constats, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si tu ne peux pas conclure, écris ce qui bloque.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo (trafic réseau réel, dashboard PostHog) va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 08 analytics"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 08 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Contexte produit — décisions validées

- PostHog Cloud **EU** (Francfort). Base légale : consentement. Régime de consentement unique. Conservation 18 mois et IP tronquée : réglages dashboard, hors repo, déjà faits.
- 13 événements définis par les questions auxquelles ils répondent. La spec est dans le repo : la localiser, elle fait foi. Vocabulaire public « appareils », jamais « personnes ».
- `distinct_id` = UUID appareil. Alias avec le Supabase ID **définitivement écarté**. Pseudonyme (pas « anonyme ») : une suppression ciblée par UUID est possible, donc promise.
- Aucun tracking cross-app. Aucune donnée de santé dans les propriétés, sauf bucketing explicitement prévu par la spec.

## Cadrage

```bash
git rev-parse --short HEAD
git ls-files | xargs grep -IlE 'posthog|PostHog|PostHogProvider|usePostHog'
git ls-files | xargs grep -InE '\.capture\(' > /tmp/kyroz-capture.txt ; wc -l /tmp/kyroz-capture.txt
git ls-files | xargs grep -IlE 'consent|consentement|optIn|optOut|analyticsEnabled'
git ls-files | grep -Ei 'docs/.*(analytics|posthog|events|consent)'
```

« Reste à couvrir » = fichier d'initialisation PostHog, écran / mécanisme de consentement, chaque fichier contenant un `capture`, la spec des 13 événements.

## Grille de contrôle

### A. Consentement — mécanisme

- Où est stocké le choix (clé, mécanisme) ; valeur par défaut = **non consenti** (défaut consenti = **P0**) ; version du consentement (si la politique change, redemande-t-on ?) ; retrait possible depuis les réglages, en un geste.
- Timing : à quel moment l'écran apparaît. Cite la décision §4.1 telle que tranchée et compare.
- Texte de l'écran : dit « appareil », pas « anonyme » ; explique la finalité en une phrase ; refus aussi facile que l'acceptation (même taille, même niveau visuel) ; le refus n'empêche rien. Boutons asymétriques = **P1** (consentement non libre).

### B. Initialisation et autocapture

1. Le SDK est-il initialisé avant le consentement ? Si oui : `optOut` par défaut et **aucun** appel réseau avant opt-in. Vérifie ce que l'init déclenche : `preloadFeatureFlags`, `sendFeatureFlagEvent`, `enableSessionReplay`, `captureAppLifecycleEvents`, `captureNativeAppLifecycleEvents`, `autocapture` du `PostHogProvider` (`captureScreens`, `captureTouches`). Tout appel sortant avant consentement = **P0**.
2. Événements automatiques (lifecycle `Application Opened / Installed / Updated / Backgrounded`, `$screen` via expo-router, touches) : désactivés, ou comptés parmi les 13 ? Un événement automatique non prévu par la spec = **P1** (« 13, ni plus ni moins »).
3. `host` = instance EU. Host US ou absent (défaut US) = **P0**.
4. Session replay, surveys, error tracking, feature flags : désactivés sauf décision documentée. Actifs sans décision = **P1** (flux de données non déclaré).
5. `distinct_id` : origine (UUID aléatoire persisté ? identifiant système ?), stabilité à la réinstallation (un nouvel UUID à la réinstallation est cohérent avec « appareils » ; un identifiant système persistant est à documenter). Jamais `identify(supabaseUserId)` ni `alias(` : présent = **P0** (contredit la politique publiée).
6. Propriétés `$set` / `$set_once` / person properties : aucune donnée de compte ou de santé.

### C. Événements — conformité à la spec

Tableau C : les 13 événements de la spec × trouvé dans le code (`fichier:ligne`) × propriétés envoyées vs propriétés spécifiées. Événement hors spec = **P1**. Événement spécifié absent = note (peut être volontaire). Propriété contenant e-mail, nom, poids brut, MG brute, objectif chiffré, âge exact = **P0**, sauf bucketing prévu par la spec. Nommage cohérent (une seule convention).

### D. Retrait du consentement

`optOut()` appelé ; file d'attente locale (`flushAt` / `flushInterval`) : les événements en attente sont-ils **supprimés** ou envoyés après le retrait ? Envoyés = **P1**. `reset()` (nouvel UUID) au retrait ou au sign-out ? Note le choix : après `reset()`, l'ancien UUID n'est plus affichable, donc la suppression ciblée promise devient impossible pour l'utilisateur. La politique doit être cohérente avec ce comportement : signale-le pour l'étape 9.

### E. Suppression ciblée

L'UUID appareil est-il affichable par l'utilisateur (réglages) pour qu'il puisse demander la suppression promise ? Absent = **P1** (promesse intenable).

### F. Prod et debug

`debug` désactivé en prod ; aucune clé `phx_` ; aucun `capture` dans des chemins de test ou de dev laissés actifs ; `flushInterval` raisonnable (batterie) ; aucun `capture` dans le flux d'achat qui ne soit pas dans la spec (signalé par l'étape 7 le cas échéant).

## Checklist humaine

- [ ] Sur appareil, via proxy (Proxyman / Charles / mitmproxy) : zéro requête vers `*.posthog.com` avant acceptation ; requêtes après ; zéro requête après retrait.
- [ ] Dashboard PostHog : projet en région EU, rétention 18 mois, IP discard actif, replay / surveys désactivés, aucune propriété identifiante sur les personnes.
- [ ] Un événement réel comparé propriété par propriété à la spec.

## Sortie : `docs/audit-v1/08-analytics.md`

```markdown
# Audit V1 — Étape 8 : Analytics & consentement
Date : … · Commit audité : … · Périmètre : … · §4.1 : <décision citée> · Instrumentation : en place / absente

## Reste à couvrir
- [ ] …

## Chemin init → consentement → premier événement
(pas-à-pas avec fichier:ligne, y compris ce que fait l'init avant tout consentement)

## C. Événements
| Événement (spec) | Trouvé (fichier:ligne) | Propriétés envoyées | Propriétés spécifiées | Écart |

## Constats
### 08-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Reprise

Session coupée : lis la sortie existante, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
