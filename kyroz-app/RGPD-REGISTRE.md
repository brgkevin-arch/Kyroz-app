# Registre des activités de traitement — Kyroz

> Document obligatoire (RGPD art. 30). Modèle simplifié CNIL pour TPE/micro-entreprise.
> À tenir à jour à chaque évolution du traitement des données. Dernière mise à jour : **15 juin 2026**.

## Responsable de traitement

| Champ | Valeur |
|---|---|
| Nom | Kévin Berger |
| Statut | Entrepreneur individuel (micro-entreprise) |
| SIREN | **[À COMPLÉTER — 9 chiffres]** |
| Adresse | **[À COMPLÉTER]** |
| Contact / DPO | dpo@kyrozz.app |

> Pas de délégué à la protection des données (DPO) formellement désigné : non obligatoire à ce stade
> (traitement non « à grande échelle » au sens de l'art. 37). Le contact RGPD ci-dessus fait office de point d'entrée.
> À réévaluer si le volume d'utilisateurs croît fortement.

---

## Traitement n°1 — Comptes utilisateurs & génération de plans nutritionnels

| Rubrique | Détail |
|---|---|
| **Finalités** | Création et gestion du compte ; calcul des besoins nutritionnels (calories, macros) ; génération des plans repas, listes de courses et suivi associé. |
| **Catégories de personnes** | Utilisateurs de l'application (adultes, 16 ans et plus). |
| **Catégories de données** | • Identification : adresse email.<br>• **Données de santé (art. 9)** : sexe, âge, poids, taille, taux de masse grasse, niveau d'activité, sport, objectif, restrictions et préférences alimentaires.<br>• Usage : plans générés, suivi du poids, série (streak), favoris, garde-manger. |
| **Base légale** | Consentement explicite (art. 9-2-a), recueilli à l'inscription et horodaté (`consent_health_data`, `consent_at`). |
| **Destinataires** | Le responsable de traitement uniquement. Aucun partage commercial, aucune revente, aucun traceur publicitaire ou outil d'analyse tiers. |
| **Sous-traitant** | Supabase Inc. (hébergement de la base et de l'authentification). |
| **Transferts hors UE** | Aucun. Données hébergées dans l'Union européenne. |
| **Durée de conservation** | Pendant toute la durée de vie du compte. Suppression définitive (serveur + appareil) à la suppression du compte ou sur demande. |
| **Mesures de sécurité** | • Cloisonnement par utilisateur (Row Level Security PostgreSQL — un utilisateur n'accède qu'à ses données).<br>• Chiffrement des échanges en transit (HTTPS).<br>• Droit à l'effacement self-service (suppression de compte + cascade).<br>• Purge des données locales à la déconnexion.<br>• Aucun SDK de tracking/publicité embarqué.<br>• Photos de progression **stockées uniquement sur l'appareil**, jamais transmises au serveur. |

---

## Droits des personnes — moyens d'exercice

| Droit | Moyen |
|---|---|
| Accès / Portabilité | Bouton « Exporter mes données » (Profil) → fichier JSON complet. |
| Rectification | Édition du profil dans l'app. |
| Effacement | « Supprimer mon compte » (Profil) → suppression serveur + locale. |
| Retrait du consentement | Suppression du compte. |
| Réclamation | CNIL — www.cnil.fr. |

---

## À faire / points ouverts (côté responsable)

- [ ] Compléter SIREN + adresse (ci-dessus et dans `constants/legal.ts`).
- [ ] Confirmer l'adresse DPO (`dpo@kyrozz.app` — vérifier l'orthographe du domaine).
- [ ] Accepter le **DPA (Data Processing Agreement)** de Supabase et confirmer la **région UE** du projet.
- [ ] Activer la 2FA sur le compte Supabase (seul accès en clair aux données).
- [ ] (Idéal) Relecture du texte légal par un juriste avant lancement à grande échelle.
