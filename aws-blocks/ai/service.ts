import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';
import {
  recipeRequestSchema,
  recipeSchema,
  scanCandidateSchema,
  type Recipe,
  type RecipeRequest,
  type ScanCandidate,
} from '../../shared/contracts';
import { parseModelJson } from './parse';
import {
  RECIPE_SYSTEM_PROMPT,
  SCAN_SYSTEM_PROMPT,
  recipeInstruction,
  scanInstruction,
} from './prompts';

const candidatesResponseSchema = z.object({ candidates: z.array(scanCandidateSchema) });

export interface AiService {
  extractIngredients(input: {
    bytes: Uint8Array;
    format: 'jpeg' | 'png' | 'webp' | 'gif';
    currentDate: string;
  }): Promise<ScanCandidate[]>;
  generateRecipe(input: RecipeRequest): Promise<Recipe>;
}

export interface BedrockSender {
  send(command: ConverseCommand): Promise<ConverseCommandOutput>;
}

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-2',
  maxAttempts: 5,
  retryMode: 'adaptive',
});

function responseText(response: ConverseCommandOutput): string {
  return response.output?.message?.content
    ?.flatMap((block) => block.text === undefined ? [] : [block.text])
    .join('\n') ?? '';
}

export class BedrockAiService implements AiService {
  constructor(
    private readonly sender: BedrockSender,
    private readonly modelId: string,
  ) {}

  async extractIngredients(input: {
    bytes: Uint8Array;
    format: 'jpeg' | 'png' | 'webp' | 'gif';
    currentDate: string;
  }): Promise<ScanCandidate[]> {
    const response = await this.sender.send(new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: SCAN_SYSTEM_PROMPT }],
      messages: [{
        role: 'user',
        content: [
          { image: { format: input.format, source: { bytes: input.bytes } } },
          { text: scanInstruction(input.currentDate) },
        ],
      }],
      inferenceConfig: { maxTokens: 1200, temperature: 0.2 },
    }));

    return parseModelJson(responseText(response), candidatesResponseSchema).candidates;
  }

  async generateRecipe(input: RecipeRequest): Promise<Recipe> {
    const parsedInput = recipeRequestSchema.parse(input);
    const response = await this.sender.send(new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: RECIPE_SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: recipeInstruction(parsedInput) }] }],
      inferenceConfig: { maxTokens: 1600, temperature: 0.6 },
    }));

    return parseModelJson(responseText(response), recipeSchema);
  }
}

export class LocalAiService implements AiService {
  async extractIngredients(input: {
    bytes: Uint8Array;
    format: 'jpeg' | 'png' | 'webp' | 'gif';
    currentDate: string;
  }): Promise<ScanCandidate[]> {
    const expiry = new Date(`${input.currentDate}T00:00:00.000Z`);
    expiry.setUTCDate(expiry.getUTCDate() + 3);
    return [scanCandidateSchema.parse({
      name: 'Spinach',
      category: 'produce',
      quantity: 1,
      unit: 'bag',
      storage: 'fridge',
      expiryDate: expiry.toISOString().slice(0, 10),
      confidence: 0.9,
    })];
  }

  async generateRecipe(input: RecipeRequest): Promise<Recipe> {
    const parsedInput = recipeRequestSchema.parse(input);
    return recipeSchema.parse({
      title: 'Pantry Rescue Skillet',
      summary: 'A deterministic local recipe for using selected pantry ingredients.',
      ingredients: parsedInput.itemIds.map((itemId) => `1 portion ${itemId}`),
      steps: ['Prepare the selected ingredients.', 'Cook together until tender and serve.'],
      estimatedMinutes: Math.min(parsedInput.maxMinutes, 25),
      servings: parsedInput.servings,
      pantryItemsUsed: parsedInput.itemIds,
      pantryStaples: ['Olive oil', 'Salt'],
      substitutions: [],
    });
  }
}

export function createAiService(): AiService {
  if (!process.env.BLOCKS_STACK_NAME) return new LocalAiService();
  return new BedrockAiService(client, process.env.PANTRY_MODEL_ID || 'amazon.nova-2-lite-v1:0');
}
