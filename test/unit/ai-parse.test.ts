import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  recipeSchema,
  scanCandidateSchema,
  type Recipe,
  type ScanCandidate,
} from '../../shared/contracts';
import { ModelResponseInvalidError, parseModelJson } from '../../aws-blocks/ai/parse';

const candidate: ScanCandidate = {
  name: 'Spinach',
  category: 'produce',
  quantity: 1,
  unit: 'bag',
  storage: 'fridge',
  expiryDate: '2026-08-24',
  confidence: 0.91,
};

const recipe: Recipe = {
  title: 'Spinach Rescue Pasta',
  summary: 'A quick pasta for using spinach.',
  ingredients: ['1 bag spinach', '200 g pasta'],
  steps: ['Boil the pasta.', 'Wilt the spinach and combine.'],
  estimatedMinutes: 20,
  servings: 2,
  pantryItemsUsed: ['Spinach'],
  pantryStaples: ['Olive oil'],
  substitutions: [],
};

const candidatesResponseSchema = z.object({
  candidates: z.array(scanCandidateSchema),
});

describe('parseModelJson', () => {
  it('parses a plain valid JSON object', () => {
    expect(parseModelJson(JSON.stringify({ candidates: [candidate] }), candidatesResponseSchema))
      .toEqual({ candidates: [candidate] });
  });

  it('parses valid JSON wrapped in a markdown code fence', () => {
    const response = `\`\`\`json\n${JSON.stringify({ candidates: [candidate] })}\n\`\`\``;

    expect(parseModelJson(response, candidatesResponseSchema)).toEqual({ candidates: [candidate] });
  });

  it('extracts a valid JSON object after introductory text', () => {
    const response = `Here is the requested result:\n${JSON.stringify({ candidates: [candidate] })}`;

    expect(parseModelJson(response, candidatesResponseSchema)).toEqual({ candidates: [candidate] });
  });

  it('rejects a candidate missing required fields without exposing the response', () => {
    const raw = JSON.stringify({ candidates: [{ name: 'Spinach' }] });

    expect(() => parseModelJson(raw, candidatesResponseSchema)).toThrow(ModelResponseInvalidError);
    try {
      parseModelJson(raw, candidatesResponseSchema);
    } catch (error) {
      expect((error as Error).message).not.toContain(raw);
    }
  });

  it('rejects confidence above one', () => {
    const raw = JSON.stringify({ candidates: [{ ...candidate, confidence: 1.01 }] });

    expect(() => parseModelJson(raw, candidatesResponseSchema)).toThrow(ModelResponseInvalidError);
  });

  it('rejects a recipe with no steps', () => {
    const raw = JSON.stringify({ ...recipe, steps: [] });

    expect(() => parseModelJson(raw, recipeSchema)).toThrow(ModelResponseInvalidError);
  });
});
