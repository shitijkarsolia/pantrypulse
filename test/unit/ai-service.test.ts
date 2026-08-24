import type { ConverseCommand, ConverseCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import { describe, expect, it, vi } from 'vitest';
import type { Recipe, RecipeRequest, ScanCandidate } from '../../shared/contracts';
import { ModelResponseInvalidError } from '../../aws-blocks/ai/parse';
import { BedrockAiService } from '../../aws-blocks/ai/service';

const candidate: ScanCandidate = {
  name: 'Spinach',
  category: 'produce',
  quantity: 1,
  unit: 'bag',
  storage: 'fridge',
  expiryDate: '2026-08-24',
  confidence: 0.9,
};

const recipe: Recipe = {
  title: 'Spinach Rescue Pasta',
  summary: 'A quick dinner for using urgent ingredients.',
  ingredients: ['1 bag spinach', '200 g pasta'],
  steps: ['Boil the pasta.', 'Wilt the spinach and combine.'],
  estimatedMinutes: 20,
  servings: 2,
  pantryItemsUsed: ['Spinach'],
  pantryStaples: ['Olive oil'],
  substitutions: [],
};

const recipeRequest: RecipeRequest = {
  itemIds: ['item_urgent_spinach'],
  servings: 2,
  maxMinutes: 30,
  dietaryPreferences: ['vegetarian'],
};

function responseWith(value: unknown): ConverseCommandOutput {
  return {
    output: { message: { role: 'assistant', content: [{ text: JSON.stringify(value) }] } },
    stopReason: 'end_turn',
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    metrics: { latencyMs: 25 },
    $metadata: {},
  };
}

function commandInput(sender: { send: ReturnType<typeof vi.fn> }) {
  return (sender.send.mock.calls[0][0] as ConverseCommand).input;
}

describe('BedrockAiService', () => {
  it('sends image bytes and an extraction instruction with bounded inference settings', async () => {
    const sender = { send: vi.fn().mockResolvedValue(responseWith({ candidates: [candidate] })) };
    const service = new BedrockAiService(sender, 'amazon.nova-2-lite-v1:0');
    const bytes = new Uint8Array([1, 2, 3, 4]);

    await expect(service.extractIngredients({
      bytes,
      format: 'jpeg',
      currentDate: '2026-08-21',
    })).resolves.toEqual([candidate]);

    const input = commandInput(sender);
    expect(input.messages?.[0]?.content).toEqual(expect.arrayContaining([
      { image: { format: 'jpeg', source: { bytes } } },
      expect.objectContaining({ text: expect.stringContaining('2026-08-21') }),
    ]));
    expect(input.inferenceConfig).toEqual(expect.objectContaining({
      maxTokens: 1200,
      temperature: 0.2,
    }));
  });

  it('generates recipes without sending hidden user identifiers', async () => {
    const sender = { send: vi.fn().mockResolvedValue(responseWith(recipe)) };
    const service = new BedrockAiService(sender, 'amazon.nova-2-lite-v1:0');
    const inputWithHiddenIdentifier = {
      ...recipeRequest,
      userSub: 'cognito-sub-must-not-leave-the-service',
    } as RecipeRequest;

    await expect(service.generateRecipe(inputWithHiddenIdentifier)).resolves.toEqual(recipe);

    const serialized = JSON.stringify(commandInput(sender));
    expect(serialized).not.toContain('cognito-sub-must-not-leave-the-service');
    expect(commandInput(sender).inferenceConfig).toEqual(expect.objectContaining({
      maxTokens: 1600,
      temperature: 0.6,
    }));
  });

  it('rejects malformed model output with a safe parser error', async () => {
    const sender = { send: vi.fn().mockResolvedValue(responseWith({ title: 'Incomplete' })) };
    const service = new BedrockAiService(sender, 'amazon.nova-2-lite-v1:0');

    await expect(service.generateRecipe(recipeRequest)).rejects.toBeInstanceOf(ModelResponseInvalidError);
  });
});
