import { z } from 'zod';
import {
  pantryItemSchema,
  recipeRequestSchema,
  recipeSchema,
  scanCandidateSchema,
} from '../../shared/contracts';

export const entityTypeSchema = z.enum(['PANTRY_ITEM', 'SCAN', 'PREFERENCE', 'RECIPE']);

export const entitySchema = z.object({
  userSub: z.string().min(1),
  entityId: z.string().min(1),
  entityType: entityTypeSchema,
  sortDate: z.number().int(),
  cleanupAt: z.number().int().nullish(),

  itemId: pantryItemSchema.shape.itemId.nullish(),
  name: pantryItemSchema.shape.name.nullish(),
  normalizedName: pantryItemSchema.shape.normalizedName.nullish(),
  category: pantryItemSchema.shape.category.nullish(),
  quantity: pantryItemSchema.shape.quantity.nullish(),
  unit: pantryItemSchema.shape.unit.nullish(),
  storage: pantryItemSchema.shape.storage.nullish(),
  addedDate: pantryItemSchema.shape.addedDate.nullish(),
  expiryDate: pantryItemSchema.shape.expiryDate.nullish(),
  state: z.enum(['active', 'consumed', 'discarded', 'pending', 'complete', 'failed']).nullish(),
  source: pantryItemSchema.shape.source.nullish(),
  version: pantryItemSchema.shape.version.nullish(),

  scanId: z.string().min(1).nullish(),
  objectKey: z.string().min(1).nullish(),
  candidates: z.array(scanCandidateSchema).nullish(),
  failureSummary: z.string().trim().min(1).max(500).nullish(),

  theme: z.enum(['light', 'dark', 'system']).nullish(),
  reduceMotion: z.boolean().nullish(),
  dietaryPreferences: recipeRequestSchema.shape.dietaryPreferences.nullish(),
  preferredServings: recipeRequestSchema.shape.servings.nullish(),
  preferredMaxMinutes: recipeRequestSchema.shape.maxMinutes.nullish(),

  recipeId: z.string().min(1).nullish(),
  recipe: recipeSchema.nullish(),
  inputItemIds: z.array(z.string().min(1)).max(20).nullish(),
  createdAt: z.number().int().nullish(),
  updatedAt: z.number().int().nullish(),
});

export type PantryEntity = z.infer<typeof entitySchema>;
