import type { z } from 'zod';

export class ModelResponseInvalidError extends Error {
  constructor() {
    super('The AI service returned an invalid response');
    this.name = 'ModelResponseInvalidError';
  }
}

export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T {
  try {
    const withoutFence = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace < firstBrace) throw new Error('No JSON object');
    return schema.parse(JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)));
  } catch {
    throw new ModelResponseInvalidError();
  }
}
