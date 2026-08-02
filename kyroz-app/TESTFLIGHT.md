# TestFlight — Kyroz

> Mémo de procédure. Sert à ne PAS re-expliquer le contexte à chaque session.

## Repères fixes

| | |
|---|---|
| App ID App Store Connect | `6796427402` |
| Bundle ID | `app.kyroz.mobile` |
| Apple Team ID | `8F2ZSM5NSY` |
| Apple ID de connexion | `brgkevin@icloud.com` (l'e-mail affiché sur le portail, `bergerkevin33@yahoo.com`, est un e-mail de CONTACT — ce n'est pas un identifiant) |
| TestFlight | https://appstoreconnect.apple.com/apps/6796427402/testflight/ios |

## Accès relecteur Apple

Le bouton « Continuer en invité » est masqué en prod. Le relecteur passe par
`lib/reviewAccess.ts` : e-mail sentinelle **`review@kyroz.app`** + un code secret.

🔑 **Le code n'est PAS dans ce dépôt** (le dépôt est public). Le récupérer avec :

```bash
cd kyroz-app && npx eas env:list production --include-sensitive
```
→ variable `EXPO_PUBLIC_REVIEW_CODE`.

⚠️ Dépend de l'**auth anonyme Supabase** (Authentication → Providers → Anonymous).
Vérifiée activée le 2026-08-03. Si elle est coupée, la connexion du relecteur échoue
et la revue est refusée — sans que le motif soit évident.

## Ce qui est déjà en place

- [x] Certificat de distribution App Store + profil de provisioning
- [x] Clé API App Store Connect → `~/.eas-credentials/` (hors dépôt, `600`)
- [x] `eas.json` : profil `device` (ad hoc), env Supabase sur `device`/`preview`/`production`,
      bloc `submit.production.ios` (ascAppId + clé API)
- [x] Build `production` **1.0.0 (3)** envoyé et traité par Apple
- [x] Groupe de testeurs **externes** « Bêta » (`b15d3e76-ac4d-43a6-9359-c0675cec8ffc`)
      ⚠️ un groupe INTERNE « Bêta » traîne aussi (`1757668c-…`) — à supprimer, inutile
- [x] Infos de test remplies (connexion requise + notes)
- [x] 1 testeuse externe ajoutée
- [ ] **Revue bêta en cours** — `WAITING_FOR_REVIEW`, soumis le 2026-08-03 à 00h58 (Paris)

Une fois cette revue passée, elle est **acquise** : builds suivants et nouveaux testeurs
sans repasser par Apple.

## Commandes (je peux les lancer seul depuis la clé API)

```bash
# Build production
npx eas build --profile production --platform ios --non-interactive --no-wait

# Envoi TestFlight (remplacer l'ID)
npx eas submit --platform ios --id <BUILD_ID> --non-interactive

# Build ad hoc (installation directe par lien, sans TestFlight)
npx eas build --profile device --platform ios --non-interactive --no-wait
```

## Distribution ad hoc — l'autre voie, déjà fonctionnelle

Appareils enregistrés (2) : l'iPhone du fondateur + celui d'une testeuse.
Ajouter un appareil = `npx eas device:create` (interactif) **puis un nouveau build**.

⚠️ Limite constatée le 2026-08-03 : à distance, l'ad hoc échoue **en silence** si la
personne ouvre le lien dans un navigateur intégré (WhatsApp/Messages) au lieu de Safari.
C'est la raison du passage à TestFlight.

## Notes pour la revue bêta (à coller dans App Store Connect)

```
Kyroz generates macro-precise 7-day meal plans.

SIGN-IN: use the credentials above on the "Connexion" tab.
This unlocks a guest session (no email confirmation needed).

The app is intended for healthy adults aged 18+. Users under 18,
or with a BMI below 18.5 combined with a weight-loss goal, are
blocked during onboarding by design (health safety guardrails).

The app is in French. All features are free; no purchase required.
```
