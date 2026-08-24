import type { RecipeRequest } from '../../shared/contracts';

export const SCAN_SYSTEM_PROMPT = [
  'You identify visible grocery ingredients from one user-provided image.',
  'Return exactly one JSON object with a candidates array and no markdown.',
  'Each candidate must include name, category, quantity, unit, storage, expiryDate, and confidence.',
  'Use conservative shelf-life estimates, do not invent brands, and omit uncertain non-food objects.',
].join(' ');

export function scanInstruction(currentDate: string): string {
  return `Today is ${currentDate}. Analyze the image and return only the required candidates JSON object.`;
}

export const RECIPE_SYSTEM_PROMPT = [
  'You create one practical rescue recipe from selected urgent pantry ingredients.',
  'Return exactly one JSON recipe object and no markdown.',
  'Use every selected ingredient reference.',
  'Additional pantry staples are allowed only when listed explicitly in pantryStaples.',
  'Include title, summary, ingredients, steps, estimatedMinutes, servings, pantryItemsUsed, pantryStaples, and substitutions.',
].join(' ');

export function recipeInstruction(input: RecipeRequest): string {
  return JSON.stringify({
    selectedIngredientReferences: input.itemIds,
    servings: input.servings,
    maxMinutes: input.maxMinutes,
    dietaryPreferences: input.dietaryPreferences,
  });
}
