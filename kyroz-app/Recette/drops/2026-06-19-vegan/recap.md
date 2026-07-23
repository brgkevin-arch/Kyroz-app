# Récap — Catalogue Kyroz augmenté

**Ajouts : 164 recettes** — petit_dej 38, collation 34, repas_complet 92.
**Nouveaux ingrédients : 11** (tous vegan + sans gluten + sans lactose → aucune entrée VIOLATIONS requise).
**Total catalogue après merge : 264** (100 existantes + 164).

## Couverture par régime — AJOUTS SEULS vs planchers §6 (totaux)

La colonne « ajouts » compte mes recettes seules. Les planchers sont des **totaux** (existantes + ajouts).
Pour tous les régimes contraints, **mes ajouts seuls dépassent déjà le plancher** (aucune dépendance aux 100 existantes).

| Régime | pdej (ajout/plancher) | coll | repas | seul ≥ plancher ? |
|---|---|---|---|---|
| omnivore | 38/30 | 34/30 | 92/120 | pdej+coll ✓ ; repas via existantes (60 omni → 152) ✓ |
| vegetarian | 37/18 | 34/22 | 53/50 | ✅ tout couvert par les ajouts seuls |
| pescatarian | 38/18 | 34/22 | 72/55 | ✅ tout couvert par les ajouts seuls |
| no_pork | 38/28 | 34/28 | 92/100 | repas via existantes |
| lactose_free | 27/18 | 23/22 | 82/55 | ✅ tout couvert par les ajouts seuls |
| gluten_free | 19/18 | 25/22 | 64/55 | ✅ tout couvert par les ajouts seuls |
| vegan | 24/14 | 22/18 | 41/40 | ✅ tout couvert par les ajouts seuls |

## Sous-exigences §6 par régime (sur les repas complets)

Requis : **3 objectifs** présents, **≥1 forte capacité** (≥880 kcal/≥58 g prot au max), **≥1 maigre**, **≥3 combats**, **≥3 endurance**.

| Régime | forte capacité | maigre (cut) | combats | endurance |
|---|---|---|---|---|
| omnivore | 69 | 32 | 17 | 30 |
| vegetarian | 41 | 14 | 15 | 19 |
| pescatarian | 52 | 27 | 16 | 26 |
| no_pork | 69 | 32 | 17 | 30 |
| lactose_free | 65 | 25 | 15 | 29 |
| gluten_free | 48 | 20 | 9 | 20 |
| vegan | 39 | 4 | 14 | 17 |

Tous ≥ seuils requis (forte capacité ≥1, maigre ≥1, combats ≥3, endurance ≥3).

## Note capacité masse

Chaque régime dispose de **nombreux** repas « forte capacité » (vegan 39, GF 48, … jusqu'à omni 69), bien au-delà du « ≥1 » requis. 
Une seule recette (`rep77`, riz–PST–maïs) plafonne à 944 kcal / 52 g protéines au max : la PST est bornée par `abs_max_qty=70`. 
C'est un repas masse légitime (calorique), simplement sous la barre haute 60-70 g — laissé tel quel.