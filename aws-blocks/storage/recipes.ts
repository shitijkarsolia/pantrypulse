import { randomBytes } from 'node:crypto';
import { recipeSchema, type Recipe } from '../../shared/contracts';
import type { PantryEntity } from './schemas';

export interface SavedRecipe {
  recipeId: string;
  recipe: Recipe;
  createdAt: number;
}

export interface RecipeTable {
  put(item: PantryEntity, options?: { ifNotExists: true }): Promise<void>;
  queryRecipes(userSub: string): AsyncIterable<PantryEntity>;
}

export interface RecipeRepository {
  save(userSub: string, recipe: Recipe): Promise<SavedRecipe>;
  list(userSub: string): Promise<SavedRecipe[]>;
}

function toSavedRecipe(entity: PantryEntity): SavedRecipe {
  if (entity.entityType !== 'RECIPE' || !entity.recipeId || !entity.recipe || !entity.createdAt) {
    throw new Error('Saved recipe record is invalid');
  }
  return {
    recipeId: entity.recipeId,
    recipe: recipeSchema.parse(entity.recipe),
    createdAt: entity.createdAt,
  };
}

export function createRecipeRepository(input: {
  table: RecipeTable;
  now?: () => number;
}): RecipeRepository {
  const now = input.now ?? Date.now;

  return {
    async save(userSub, recipeInput) {
      const recipe = recipeSchema.parse(recipeInput);
      const recipeId = randomBytes(16).toString('hex');
      const createdAt = now();
      await input.table.put({
        userSub,
        entityId: `RECIPE#${recipeId}`,
        entityType: 'RECIPE',
        sortDate: createdAt,
        recipeId,
        recipe,
        createdAt,
        updatedAt: createdAt,
      }, { ifNotExists: true });
      return { recipeId, recipe, createdAt };
    },

    async list(userSub) {
      const recipes: SavedRecipe[] = [];
      for await (const entity of input.table.queryRecipes(userSub)) {
        recipes.push(toSavedRecipe(entity));
      }
      return recipes.sort((left, right) => right.createdAt - left.createdAt);
    },
  };
}
