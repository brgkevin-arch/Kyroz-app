# Registre des activités de traitement — Kyroz

> Document obligatoire (RGPD art. 30). Modèle simplifié CNIL pour TPE/micro-entreprise.
> À tenir à jour à chaque évolution du traitement des données. Dernière mise à jour : **11 août 2026**.
>
> 🔴 **Ce registre a eu DEUX JOURS DE RETARD sur la production, et le motif vaut d'être
> gardé.** L'expéditeur e-mail (Resend) est branché depuis le 2026-08-09 — il traite
> l'adresse e-mail de chaque inscription — et il n'apparaissait ni ici, ni au §5 de la
> politique de confidentialité. La checklist qui l'a trouvé le rangeait au FUTUR
> (« avant d'activer PostHog / Resend »), en le mettant dans le même sac qu'un outil
> encore dormant. ➡️ **Un sous-traitant se déclare le jour où il TRAITE, pas le jour où
> on avait prévu de l'activer** — et un registre ne se relit jamais tout seul : c'est le
> jour où l'on branche un prestataire qu'il faut l'ouvrir.

## Responsable de traitement

| Champ | Valeur |
|---|---|
| Nom | Kévin Berger |
| Statut | Entrepreneur individuel (micro-entreprise) |
| SIREN | **106386162** |
| Adresse | 2 rue du moulin, 64570 Arette |
| Contact / DPO | contact@kyroz.app |

> Pas de délégué à la protection des données (DPO) formellement désigné : non obligatoire à ce stade
> (traitement non « à grande échelle » au sens de l'art. 37). Le contact RGPD ci-dessus fait office de point d'entrée.
> À réévaluer si le volume d'utilisateurs croît fortement.

---

## Traitement n°1 — Comptes utilisateurs & génération de plans nutritionnels

| Rubrique | Détail |
|---|---|
| **Finalités** | Création et gestion du compte ; calcul des besoins nutritionnels (calories, macros) ; génération des plans repas, listes de courses et suivi associé. |
| **Catégories de personnes** | Utilisateurs de l'application (adultes, 18 ans et plus — âge minimum bloqué à l'inscription, `lib/safety.ts::MIN_AGE`). |
| **Catégories de données** | • Identification : adresse email.<br>• **Données de santé (art. 9)** : sexe, âge, poids, taille, taux de masse grasse, niveau d'activité, sport, objectif, restrictions et préférences alimentaires.<br>• Usage : plans générés, suivi du poids, série (streak), favoris, frigo (garde-manger). |
| **Base légale** | Consentement explicite (art. 9-2-a), recueilli à l'inscription et horodaté (`consent_health_data`, `consent_at`). |
| **Destinataires** | Le responsable de traitement, et les sous-traitants listés ci-dessous dans la stricte limite de leur mission. Aucun partage commercial, aucune revente, aucun traceur publicitaire ou outil d'analyse tiers. |
| **Sous-traitants** | • **Supabase Inc.** — hébergement de la base et de l'authentification (données de santé comprises).<br>• **Resend** — envoi des e-mails de service (confirmation d'inscription, réinitialisation de mot de passe), branché en SMTP dédié le 2026-08-09. Reçoit l'**adresse e-mail** et le contenu de ces messages, **aucune donnée de santé**. |
| **Transferts hors UE** | Données de santé : **aucun** — hébergement Supabase dans l'Union européenne (`eu-central-1`). ⚠️ **À VÉRIFIER pour Resend** : le cadre du transfert (clauses contractuelles types / Data Privacy Framework) ne peut se lire que dans son DPA, qui n'a pas encore été consulté. Tant qu'il ne l'est pas, cette ligne ne dit pas « aucun » pour ce sous-traitant — voir le suivi des actions en fin de document. |
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

## Suivi des actions (côté responsable)

- [x] **DPA Supabase** accepté et signé le 2026-06-15 (données de santé déclarées en catégorie spéciale, rôle Controller). PDF conservé hors dépôt.
- [x] **Région UE** confirmée (`eu-central-1`, Frankfurt).
- [x] **2FA** activée sur le compte Supabase.
- [x] Adresse + email de contact renseignés (2 rue du moulin, 64570 Arette · contact@kyroz.app).
- [x] **SIREN complété** (106386162) ici, dans `constants/legal.ts` (objet `LEGAL`) et `public/legal.html`.
- [ ] 🧑 **DPA Resend — à consulter et à conserver** (branché le 2026-08-09, déclaré ici
  le 2026-08-11). Deux choses en dépendent, et elles ne peuvent pas s'écrire sans lui :
  le **cadre du transfert hors UE** (clauses contractuelles types / Data Privacy
  Framework, art. 13-1-f) et la ligne « Transferts hors UE » ci-dessus, qui reste
  volontairement en suspens. ⚠️ Ne pas la compléter au jugé : une politique de
  confidentialité n'est pas l'endroit où supposer (même règle que le prestataire
  d'abonnement, `constants/legal.ts` §5).
- [ ] (Idéal) Relecture du texte légal par un juriste avant lancement à grande échelle.
