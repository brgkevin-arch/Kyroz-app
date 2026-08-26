# Brief — Étape 2 : Moteur — implémentation vs règles validées

Mission : vérifier que le moteur local fait ce qui a été décidé, ni plus ni moins. La science est tranchée : tu ne rouvres pas Mifflin vs Katch, tu mesures la dérive entre décisions et code, et tu cherches les cas où le moteur produit un plan faux ou dangereux.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ». Exception de cette étape : un script ou fichier de test **temporaire** pour exécuter les cas limites est toléré s'il est supprimé avant la fin de session ; `git status` doit être propre (hors `docs/audit-v1`) avant le commit.
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier ou section traité : écris les constats, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si tu ne peux pas conclure, écris ce qui bloque.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 02 moteur"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 02 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Contexte produit — règles validées (référence)

Localise d'abord le brief consolidé déficit / objectifs dans le repo : `git ls-files | xargs grep -IlE 'Alpert|Katch|R6'`. S'il existe, il fait foi et tu le cites. S'il n'existe pas dans le repo, audite contre la liste ci-dessous et signale son absence en **P2** (traçabilité des décisions).

1. BMR : Mifflin-St Jeor par défaut. Katch-McArdle uniquement si la règle R6 est satisfaite : ΔTDEE entre les deux formules supérieur à un seuil pondéré au poids corporel. Recommandation validée : fonction de lissage à la bascule pour éviter un saut discontinu.
2. Katch est structurellement moins précis à adiposité élevée (le tissu adipeux a un métabolisme d'environ 4,5–7,7 kcal/kg/j que Katch compte à zéro) : le sélecteur ne doit jamais retenir Katch pour ces profils.
3. Planchers caloriques et plafond de déficit existants confirmés (valeurs : celles du code, à reporter dans la sortie).
4. Plafonds de rythme de perte par tier de masse grasse.
5. Floors FFM conditionnels, désactivés au-dessus de 20 % MG chez l'homme (seuil femme : celui du brief).
6. Cibles protéiques en g/kg de FFM.
7. Plafond Alpert : signal consultatif, pas une contrainte dure.
8. Paliers obligatoires si objectif > 15 kg ou > 6 mois.
9. Calorie bank : maintenue dans le moteur, hors gate premium, rythme hebdomadaire (pas événementiel), `uncompensatedKcal` affiché en phrase. Question ouverte à trancher ici, avec preuve : le cycling entraînement / repos couvre-t-il déjà le même chemin dans `dayTargetKcal` ?
10. NEAT : incohérence connue entre le doc produit et la note développeur, à localiser précisément.

## Cadrage

```bash
git rev-parse --short HEAD
git ls-files | grep -Ei 'planEngine|calorieBank|recalcProfile|engine|bmr|tdee|macro'
git ls-files | grep -Ei '\.(test|spec)\.tsx?$'
git ls-files | xargs grep -IlE 'planEngine|calorieBank|recalcProfile|dayTargetKcal'
git ls-files | grep -Ei 'docs/.*(moteur|engine|deficit|objectif|neat|calorie)'
```

Périmètre : fichiers moteur, leurs tests, les documents de règles, et les consommateurs uniquement pour la section K (d'un écran, tu ne lis que les lignes qui appellent le moteur ou affichent ses résultats).

## Grille de contrôle

### A. Matrice règle → code (tableau A de la sortie)

Pour chacune des 10 règles : fonction et `fichier:ligne`, statut **implémentée / partielle / absente / divergente**, description de l'écart. Règle de sécurité (3, 4, 5, 8) absente ou divergente = **P0**. Autre règle absente = **P1**.

### B. R6 et continuité

- Condition exacte de bascule, seuil, unité, pondération au poids : recopie le code.
- Lissage présent ? Sinon, quantifie le saut : deux profils identiques de part et d'autre du seuil, écart en kcal/j. Saut > 100 kcal/j sans lissage = **P1**.
- Le sélecteur peut-il retenir Katch pour un profil à MG élevée (homme > 25 %, femme > 35 %) ? Oui = **P0**.

### C. Ordre d'application floors / plafonds / déficit

Écris la chaîne réelle : TDEE → déficit → plafonds de rythme → floors → arrondi. Qui gagne quand un floor contredit un plafond ? Un floor appliqué avant un plafond peut-il être ré-écrasé ? Floor contournable = **P0**.

### D. Paliers

Déclenchement (> 15 kg OU > 6 mois : `>` ou `>=` ? bornes testées ?), découpage, recalcul entre paliers, ce que voit l'utilisateur.

### E. Protéines et FFM inconnue

Sans MG saisie : FFM estimée comment ? Fallback protéines ? Floors FFM bien désactivés ? `undefined` propagé = **P0** (voir H).

### F. Calorie bank vs cycling

Lis `calorieBank.ts` et le calcul de `dayTargetKcal`. Les deux mécanismes peuvent-ils s'additionner sur la même journée ? Un jour d'entraînement avec bank créditée peut-il dépasser le TDEE de maintien ? Double comptage = **P0**. Réponds explicitement à la question ouverte (oui / non / partiellement) avec preuve.

### G. NEAT

Comment le niveau d'activité entre dans le TDEE (multiplicateurs, valeurs, source). Compare mot à mot avec le doc produit. Cite les deux passages contradictoires.

### H. Cas limites — à exécuter, pas à raisonner

Exécute réellement le moteur (tests existants, ou script / test temporaire, cf. règle 1). Si impossible, mets le cas en checklist humaine avec les valeurs d'entrée. Reporte entrées et sorties dans le tableau H.

| Cas | Attendu |
|---|---|
| Femme 45 kg / 160 cm / MG 18 % / perte 5 kg | floor atteint, message, aucun déficit sous le floor |
| Homme 140 kg / MG 45 % / perte 40 kg | Mifflin (jamais Katch), déficit plafonné, paliers obligatoires |
| MG saisie 3 % et 70 % | rejetée en entrée ou bornée, jamais calculée |
| Âge 16 et 85 | comportement défini (la question mineurs est traitée en étape 9 ; ici seulement le moteur) |
| Objectif = poids actuel | déficit 0, aucune division par la durée |
| Objectif prise de masse | surplus plafonné |
| Profil sans MG | Mifflin, floors FFM désactivés, protéines fallback |
| Profil exactement au seuil R6 (± 0,1 kg) | continuité |
| Date objectif passée / durée 0 jour | erreur propre, pas NaN |
| Champ manquant (`undefined`) sur chaque entrée, une à la fois | erreur propre, pas NaN |
| Unités impériales si supportées | conversion exacte |

`NaN`, `Infinity` ou `undefined` en sortie sur un cas = **P0**.

### I. Déterminisme

Même entrée → même sortie ? Dépendance à `Date.now()` ou au fuseau ? Deux appels de `recalcProfile` = résultat identique ?

### J. Tests existants

Matrice règle × test (tableau J). Règle de sécurité sans test = **P1**. Cas H non testé = **P2**.

### K. Cohérence affichage

Les écrans affichent-ils les valeurs du moteur ou recalculent-ils (seconde implémentation) ? Arrondis : kcal et macros arrondis où ? La somme des macros affichées (× 4 / 4 / 9) recolle-t-elle aux kcal affichées, à l'arrondi près ? Écart visible = **P1** (zéro malhonnêteté).

## Checklist humaine

- [ ] Trois profils (cas H1, H2, H7) recalculés à la main dans un tableur et comparés aux sorties du moteur.
- [ ] Décision produit NEAT tranchée (doc ou code : lequel fait foi).
- [ ] Décision lissage R6 (implémenter, ou accepter le saut et le documenter).

## Sortie : `docs/audit-v1/02-moteur.md`

```markdown
# Audit V1 — Étape 2 : Moteur
Date : … · Commit audité : … · Périmètre : …

## Reste à couvrir
- [ ] …

## A. Règle → code
| # | Règle | Fonction (fichier:ligne) | Statut | Écart |

## Chaîne d'application (section C)
TDEE → … → arrondi, avec fichier:ligne à chaque maillon

## F. Réponse à la question calorie bank vs cycling
oui / non / partiellement — preuve

## H. Cas limites exécutés
| Cas | Entrées | Sortie obtenue | Attendu | OK ? |

## J. Règle × test
| Règle | Test (fichier:ligne) | Couvre les bornes ? |

## K. Affichage
| Écran | Valeur affichée | Source (moteur / recalcul local) | Arrondi | Constat |

## Constats
### 02-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Reprise

Session coupée : lis la sortie existante, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
