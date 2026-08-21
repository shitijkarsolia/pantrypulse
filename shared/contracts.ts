import { z } from 'zod';

const categorySchema = z.enum(['produce', 'dairy', 'protein', 'grain', 'pantry', 'frozen', 'other']);
const storageSchema = z.enum(['fridge', 'freezer', 'pantry']);
const stateSchema = z.enum(['active', 'consumed', 'discarded']);
const sourceSchema = z.enum(['manual', 'scan', 'demo']);

export const pantryItemSchema = z.object({
  userSub: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  normalizedName: z.string().min(1).max(80),
  category: categorySchema,
  quantity: z.number().positive().max(999),
  unit: z.string().trim().min(1).max(24),
  storage: storageSchema,
  addedDate: z.string().date(),
  expiryDate: z.string().date(),
  state: stateSchema,
  source: sourceSchema,
  version: z.number().int().positive(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const pantryItemInputSchema = pantryItemSchema.omit({
  userSub: true,
  itemId: true,
  normalizedName: true,
  state: true,
  source: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});

export const pantryItemPatchSchema = pantryItemSchema
  .pick({
    name: true,
    category: true,
    quantity: true,
    unit: true,
    storage: true,
    addedDate: true,
    expiryDate: true,
    state: true,
  })
  .partial();

export const scanCandidateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: categorySchema,
  quantity: z.number().positive().max(999),
  unit: z.string().trim().min(1).max(24),
  storage: storageSchema,
  expiryDate: z.string().date(),
  confidence: z.number().min(0).max(1),
});

export const scanRecordSchema = z.object({
  userSub: z.string().min(1),
  scanId: z.string().min(1),
  objectKey: z.string().min(1),
  state: z.enum(['pending', 'complete', 'failed']),
  candidates: z.array(scanCandidateSchema).optional(),
  failureSummary: z.string().trim().min(1).max(500).optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  cleanupAt: z.number().int(),
});

export const recipeRequestSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(20),
  servings: z.number().int().min(1).max(12),
  maxMinutes: z.number().int().min(5).max(480),
  dietaryPreferences: z.array(z.string().trim().min(1).max(40)).max(10),
});

export const recipeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  ingredients: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  steps: z.array(z.string().trim().min(1).max(1_000)).min(1).max(20),
  estimatedMinutes: z.number().int().positive().max(480),
  servings: z.number().int().positive().max(12),
  pantryItemsUsed: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  pantryStaples: z.array(z.string().trim().min(1).max(80)).max(20),
  substitutions: z.array(z.string().trim().min(1).max(200)).max(20),
});

export type PantryItem = z.infer<typeof pantryItemSchema>;
export type PantryItemInput = z.infer<typeof pantryItemInputSchema>;
export type PantryItemPatch = z.infer<typeof pantryItemPatchSchema>;
export type ScanCandidate = z.infer<typeof scanCandidateSchema>;
export type ScanRecord = z.infer<typeof scanRecordSchema>;
export type RecipeRequest = z.infer<typeof recipeRequestSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
