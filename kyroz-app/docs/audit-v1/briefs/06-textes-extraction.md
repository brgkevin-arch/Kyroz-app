# Brief — Étape 6a : Extraction des textes utilisateur

Mission : produire l'inventaire **verbatim** de tout ce que l'utilisateur peut lire dans Kyroz, dans l'ordre où il le rencontre. Tu extrais et tu mesures, tu ne juges pas : le jugement (zéro charge mentale, zéro malhonnêteté) se fait en Claude.ai sur ton dump (étape 6b).

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les deux fichiers listés dans « Sortie ».
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée les deux fichiers de sortie et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier traité : ajoute ses chaînes au dump, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Jamais `node_modules`.
4. **Verbatim absolu.** Aucune reformulation, aucune correction, même d'une faute évidente. Un texte modifié fausserait l'audit 6b.
5. **Pas de vérification fictive.** Les textes hors repo (fiches store, e-mails Supabase, paywall distant) vont dans « Checklist humaine », pas dans le dump.
6. **Sévérités limitées.** Cette étape ne produit que des constats mécaniques (section « Rapport »). Aucun jugement de sens, de ton ou d'honnêteté.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 06a extraction textes"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans les fichiers. Le chat ne contient qu'une ligne finale : `Étape 06a — chaînes: n · écrans: n · ⚑: n · reste à couvrir: n`.

## Cadrage

```bash
git rev-parse --short HEAD
git ls-files | grep -Ei 'i18n|locales?/|strings|translations|fr\.json|messages'
git ls-files | grep -E '^app/.*\.tsx$'
git ls-files | grep -E '^components/.*\.tsx$'
git ls-files | grep -E 'constants/legal|legal\.(ts|html)'
git ls-files | grep -E 'store\.config\.json'
git ls-files | xargs grep -IlE 'Alert\.alert\(|Toast|showMessage|expo-notifications|scheduleNotification'
```

« Reste à couvrir » = un écran par ligne dans l'ordre de l'arbre `app/` (onboarding → profil → plan → paywall → réglages → légal), puis les composants partagés, puis alertes / toasts / notifications, puis `store.config.json` s'il existe.

## Méthode

1. S'il existe un fichier de chaînes (i18n) : dumpe-le intégralement (clé, texte), puis pour chaque clé, le ou les lieux d'usage ; les clés jamais utilisées et les textes en dur hors i18n vont dans le rapport.
2. Sinon (textes en dur) : pour chaque fichier du périmètre, extrais chaque nœud texte JSX et chaque prop textuelle (`title`, `label`, `placeholder`, `accessibilityLabel`, `helperText`, `message`, `subtitle`, `description`, arguments d'`Alert.alert`, contenus de notifications). Inclus les textes construits dynamiquement en notant les variables : `Il te reste {n} kcal`.
3. Flag `⚑` (sans jugement) sur tout texte contenant un chiffre, un pourcentage, ou l'un des mots : précis, précision, scientifique, garanti, recommandé, médecin, médical, santé, sécurité, optimal, perte, rapide, jamais, toujours, anonyme.
4. Écris dans le dump après chaque fichier, pas à la fin.

## Sortie 1 — dump : `docs/audit-v1/06-textes-dump.md`

```markdown
# Textes Kyroz — dump verbatim (commit <sha>)

## <Écran ou flux> (`app/onboarding/step1.tsx`)
| # | fichier:ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | app/onboarding/step1.tsx:42 | titre | … | |
| 2 | app/onboarding/step1.tsx:58 | bouton | … | |
| 3 | app/onboarding/step1.tsx:71 | erreur | … | ⚑ |
```

Rôles autorisés : titre, sous-titre, corps, bouton, lien, placeholder, label, aide, erreur, alerte, toast, vide (état vide), a11y, notification, légal, store.

## Sortie 2 — rapport : `docs/audit-v1/06-textes-extraction.md`

Faits mécaniques uniquement :

- Compteurs : chaînes totales, par écran, hors i18n (si i18n), clés inutilisées, textes marqués ⚑.
- Doublons approximatifs : même action, mots différents (`Enregistrer` / `Sauvegarder` / `Valider` ; `Masse grasse` / `Taux de MG` / `MG`). Tableau par familles. **P2**.
- Typographie française, vérifiable par grep : apostrophes droites `'` vs typographiques `’`, absence d'espace insécable avant `: ; ? ! %`, `...` vs `…`, majuscule initiale incohérente sur les boutons, point final présent / absent sur un même rôle. Compte par catégorie, cinq exemples chacun. Sévérité unique **P3** (à corriger en lot).
- Textes légaux : `constants/legal.ts` et `public/legal.html` — même source ou deux copies ? Deux copies = **P1** (divergence certaine à terme ; l'étape 9 compare le contenu).
- Chaînes anglaises résiduelles : `git ls-files | grep -E '\.tsx$' | xargs grep -InE '\b(Save|Cancel|Loading|Error|Next|Back|Submit|OK)\b'` = **P2**.
- Aucune autre sévérité dans ce rapport.

```markdown
# Audit V1 — Étape 6a : Extraction des textes
Date : … · Commit audité : … · Périmètre : …

## Reste à couvrir
- [ ] …

## Compteurs
| Mesure | Valeur |

## Doublons approximatifs
| Famille | Variantes (fichier:ligne) |

## Typographie
| Catégorie | Nombre | Exemples |

## Constats
### 06-01 <titre>
- Sévérité · Preuve · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Checklist humaine

- [ ] Textes hors repo à ajouter au dump avant 6b : fiches store (si pas de `store.config.json`), templates d'e-mails Supabase (auth), paywall côté RevenueCat si paywall distant, écrans de consentement s'ils sont générés hors code.

## Pour l'étape 6b (Claude.ai) — mémo

Attacher `06-textes-dump.md` et `06-textes-extraction.md`. Le brief 6b est fourni dans Claude.ai.

## Reprise

Session coupée : lis les deux sorties, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
