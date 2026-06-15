import Anthropic from '@anthropic-ai/sdk';
import { Meal, MealPlan, MealType, UserProfile } from './types';
import { getEffectiveRecipes } from './recipes';
import { buildLocalPlan, computeDailyTotals, profileSignature } from './planEngine';
import { goalLabel } from './tdee';

// Mode gratuit par défaut : génération locale.
// L'API Claude n'est utilisée QUE si une vraie clé est configurée.
//
// ⚠️ SÉCURITÉ — NE JAMAIS mettre une vraie clé Anthropic dans cette variable
// pour un build WEB/public. Toute variable EXPO_PUBLIC_* est inlinée EN CLAIR
// dans le bundle JS servi sur GitHub Pages → clé volée + facturation détournée.
// Si la génération IA doit être activée, la déporter derrière une Edge Function
// Supabase (clé en variable SERVEUR, comme supabase/functions/delete-account),
// jamais côté client. Le garde HAS_VALID_KEY ci-dessous ne protège PAS la clé,
// il évite seulement un appel sans clé valide.
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const HAS_VALID_KEY = API_KEY.startsWith('sk-ant-');

const VALID_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const SYSTEM_PROMPT = `Tu es un algorithme de planification nutritionnelle pour sportifs.
Tu génères des plans repas macro-précis, adaptés à la cuisine française.

RÈGLES ABSOLUES :
- Respecte le nombre de jours et de repas demandés
- Utilise UNIQUEMENT les recettes fournies (référence par id)
- Respecte les macros cibles à ±5%
- Tiens compte des préférences et aliments à éviter
- Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après`;

/**
 * Génère un plan repas. Gratuit par défaut (moteur local).
 * Utilise Claude si une clé est configurée, avec fallback local automatique.
 */
export async function generateMealPlan(profile: UserProfile, seed: number = 0): Promise<MealPlan> {
  if (!HAS_VALID_KEY) {
    await new Promise((r) => setTimeout(r, 600)); // UX : transition fluide
    return buildLocalPlan(profile, seed);
  }
  try {
    return await generateWithClaude(profile);
  } catch (err) {
    console.error('Génération IA échouée — fallback moteur local', err);
    return buildLocalPlan(profile, seed);
  }
}

async function generateWithClaude(profile: UserProfile): Promise<MealPlan> {
  const client = new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
  const days = Math.min(Math.max(profile.plan_days, 1), 7);
  // Repli pour les profils créés avant l'option « repas à la carte »
  const mealsList = Array.isArray(profile.meals) && profile.meals.length > 0
    ? profile.meals
    : (['breakfast', 'lunch', 'dinner', 'snack'] as const);

  const recipePool = getEffectiveRecipes();
  const recipesJson = JSON.stringify(
    recipePool.map((r) => ({
      id: r.id,
      name: r.name_fr,
      meal_types: r.tags,
      macros: r.macros_per_portion,
      prep_time: r.prep_time_min,
    }))
  );

  const userMessage = `Profil :
- Objectif : ${goalLabel(profile.goal)}
- Cible : ${profile.target_kcal} kcal (P ${profile.target_protein_g}g / G ${profile.target_carbs_g}g / L ${profile.target_fat_g}g)
- Jours : ${days} · Repas/jour : ${mealsList.join(', ')}
- Emphase : ${profile.meal_emphasis ?? 'even'}
- Variété : ${profile.variety}
- À éviter : ${(profile.disliked_foods ?? []).join(', ') || 'aucun'}
- Régimes : ${(profile.dietary_restrictions ?? []).join(', ') || 'aucun'}

Recettes : ${recipesJson}

Génère le plan. JSON strict :
{"meals":[{"day":1,"meal_type":"breakfast","recipe_id":"r001","portions":1.5}]}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Réponse IA non textuelle');

  const parsed = JSON.parse(content.text);
  if (!Array.isArray(parsed.meals)) throw new Error('Format de plan invalide');

  const meals: Meal[] = parsed.meals
    .map((m: any): Meal | null => {
      const recipe = recipePool.find((r) => r.id === m.recipe_id);
      const day = Number(m.day);
      const portions = Number(m.portions);
      if (!recipe) return null;
      if (!Number.isInteger(day) || day < 1 || day > days) return null;
      if (!VALID_MEAL_TYPES.includes(m.meal_type)) return null;
      if (!(portions > 0)) return null;

      return {
        id: `${day}-${m.meal_type}`,
        day,
        meal_type: m.meal_type,
        recipe,
        portions,
        macros: {
          kcal: Math.round(recipe.macros_per_portion.kcal * portions),
          protein_g: Math.round(recipe.macros_per_portion.protein_g * portions),
          carbs_g: Math.round(recipe.macros_per_portion.carbs_g * portions),
          fat_g: Math.round(recipe.macros_per_portion.fat_g * portions),
        },
      };
    })
    .filter((m: Meal | null): m is Meal => m !== null);

  if (meals.length < days * mealsList.length * 0.5) {
    throw new Error('Plan IA incomplet');
  }

  return {
    id: `plan-${Date.now()}`,
    user_id: profile.id,
    week_start_date: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    days,
    meals,
    total_macros_per_day: computeDailyTotals(meals, days),
    profile_sig: profileSignature(profile),
  };
}
