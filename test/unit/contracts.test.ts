import { describe, expect, it } from 'vitest';
import {
  pantryItemInputSchema,
  recipeSchema,
  scanCandidateSchema,
} from '../../shared/contracts';

const pantryItemInput = {
  name: ' Spinach ',
  category: 'produce',
  quantity: 1,
  unit: ' bunch ',
  storage: 'fridge',
  addedDate: '2026-08-21',
  expiryDate: '2026-08-23',
};

const scanCandidate = {
  name: 'Mushrooms',
  category: 'produce',
  quantity: 8,
  unit: 'oz',
  storage: 'fridge',
  expiryDate: '2026-08-25',
  confidence: 0.84,
};

const recipe = {
  title: 'Crisp spinach skillet',
  summary: 'A quick skillet dinner for ingredients that need attention.',
  ingredients: ['1 bunch spinach', '8 oz mushrooms'],
  steps: ['Heat a skillet over medium heat.', 'Cook the vegetables until tender.'],
  estimatedMinutes: 20,
  servings: 2,
  pantryItemsUsed: ['Spinach', 'Mushrooms'],
  pantryStaples: ['Olive oil'],
  substitutions: ['Use kale in place of spinach.'],
};

describe('pantryItemInputSchema', () => {
  it('trims editable names and units', () => {
    const parsed = pantryItemInputSchema.parse(pantryItemInput);

    expect(parsed.name).toBe('Spinach');
    expect(parsed.unit).toBe('bunch');
  });

  it('rejects an impossible calendar date', () => {
    expect(pantryItemInputSchema.safeParse({ ...pantryItemInput, expiryDate: '2026-02-30' }).success).toBe(false);
  });

  it('rejects a zero quantity', () => {
    expect(pantryItemInputSchema.safeParse({ ...pantryItemInput, quantity: 0 }).success).toBe(false);
  });

  it('rejects a storage value outside the shared enum', () => {
    expect(pantryItemInputSchema.safeParse({ ...pantryItemInput, storage: 'counter' }).success).toBe(false);
  });
});

describe('scanCandidateSchema', () => {
  it('accepts a candidate confidence within the inclusive range', () => {
    expect(scanCandidateSchema.parse(scanCandidate).confidence).toBe(0.84);
  });

  it('rejects confidence above one', () => {
    expect(scanCandidateSchema.safeParse({ ...scanCandidate, confidence: 1.01 }).success).toBe(false);
  });
});

describe('recipeSchema', () => {
  it('accepts a recipe with one or more steps', () => {
    expect(recipeSchema.parse(recipe).steps).toEqual([
      'Heat a skillet over medium heat.',
      'Cook the vegetables until tender.',
    ]);
  });

  it('rejects a recipe with no steps', () => {
    expect(recipeSchema.safeParse({ ...recipe, steps: [] }).success).toBe(false);
  });
});
