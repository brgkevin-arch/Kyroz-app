# Procédure — ajouter les colonnes « sucré / salé » dans Supabase

**Pourquoi** : l'app enregistre désormais le goût préféré du matin et de la collation
(fiche D28 d'`AGENTS.md`). Ces deux réponses sont synchronisées avec le compte, donc la
base doit connaître leurs deux colonnes **avant** que la mise à jour arrive chez les
utilisateurs. Sans elles, la synchronisation du profil entier échoue en silence.

**Quand** : après la fusion de la PR, **avant** de publier la mise à jour OTA.

**Durée** : 2 minutes. Aucune donnée existante n'est modifiée ; la commande peut être
relancée sans risque.

---

## Étape 1 — Ouvrir l'éditeur SQL

1. Va sur <https://supabase.com/dashboard> et ouvre le projet Kyroz.
2. Dans le menu de gauche, clique sur **SQL Editor**.
3. Clique sur **New query**.

➡️ Dis-moi quand l'éditeur vide est ouvert, je te donne l'étape 2.

---

## Étape 2 — Coller et lancer la migration

1. Ouvre le fichier `kyroz-app/supabase/migrations/2026-09-13_profiles_gouts.sql`.
2. Copie **tout** son contenu et colle-le dans l'éditeur.
3. Clique sur **Run**.

✅ Résultat attendu : « Success. No rows returned ».

➡️ Dis-moi ce qui s'affiche.

---

## Étape 3 — Vérifier (je le fais pour toi)

Je lance `npm run check:migrations`, qui interroge la base et confirme que
`gout_petit_dej` et `gout_collation` existent. Tu n'as rien à faire.

---

## Si ça ne se passe pas comme prévu

- **Erreur rouge** : ne relance rien, copie-moi le message.
- **Tu ne trouves pas SQL Editor** : envoie-moi une capture du menu de gauche.
