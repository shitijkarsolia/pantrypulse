import {
  ApiNamespace,
  AuthCognito,
  DistributedTable,
  Logger,
  Metrics,
  Scope,
} from '@aws-blocks/blocks';
import type { AuthCognitoMockOptions } from '@aws-blocks/bb-auth-cognito';
import { z } from 'zod';
import {
  pantryItemInputSchema,
  pantryItemPatchSchema,
  type PantryItemInput,
  type PantryItemPatch,
} from '../shared/contracts';
import { createPantryRepository } from './storage/pantry';
import { entitySchema } from './storage/schemas';

const scope = new Scope('pantrypulse');

const logger = new Logger(scope, 'logger', {
  level: process.env.BLOCKS_STACK_NAME ? 'info' : 'debug',
  retention: 14,
  defaultContext: { application: 'PantryPulse' },
});

const metrics = new Metrics(scope, 'metrics', {
  namespace: 'PantryPulse',
  defaultDimensions: { Environment: process.env.BLOCKS_STACK_NAME ? 'aws' : 'local' },
});

let lastCode: { username: string; code: string; purpose: string } | null = null;

const authOptions = {
  crossDomain: process.env.BLOCKS_SANDBOX === 'true',
  signInWith: 'email' as const,
  authFlowType: 'USER_PASSWORD_AUTH' as const,
  passwordPolicy: {
    minLength: 12,
    requireDigits: true,
    requireLowercase: true,
    requireUppercase: true,
    requireSymbols: true,
  },
  mfa: 'off' as const,
  selfSignUp: true,
  sessionTtlSeconds: 3600,
  removalPolicy: process.env.BLOCKS_SANDBOX === 'true' ? 'destroy' as const : 'retain' as const,
  codeDelivery: async (username, code, purpose) => {
    if (!process.env.BLOCKS_STACK_NAME) lastCode = { username, code, purpose };
  },
} satisfies AuthCognitoMockOptions;

const auth = new AuthCognito(scope, 'auth', authOptions);
export const authApi = auth.createApi();

const data = new DistributedTable(scope, 'pantry-data', {
  schema: entitySchema,
  key: { partitionKey: 'userSub', sortKey: 'entityId' },
  indexes: {
    byType: { partitionKey: 'userSub', sortKey: 'entityType' },
    byDate: { partitionKey: 'userSub', sortKey: 'sortDate' },
  },
  ttl: 'cleanupAt',
});

const pantry = createPantryRepository({
  get: (key) => data.get(key),
  put: (item, options) => data.put(item, options),
  queryPantryItems: (userSub) => data.query({
    index: 'byType',
    where: {
      userSub: { equals: userSub },
      entityType: { equals: 'PANTRY_ITEM' },
    },
  }),
});

const itemIdSchema = z.string().min(1).max(200);
const versionSchema = z.number().int().positive();
const outcomeSchema = z.enum(['consumed', 'discarded']);

export const api = new ApiNamespace(scope, 'api', (context) => ({
  async ping() {
    return { status: 'ok' as const };
  },

  /**
   * @blocksSkipCodegen
   */
  async getLastCode() {
    if (process.env.BLOCKS_STACK_NAME) return null;
    return lastCode;
  },

  async createPantryItem(input: PantryItemInput) {
    const user = await auth.requireAuth(context);
    const userSub = user.userId;
    const parsedInput = pantryItemInputSchema.parse(input);
    const item = await pantry.create(userSub, parsedInput);
    logger.info('Pantry operation', {
      operation: 'createPantryItem',
      itemId: item.itemId,
      status: 'success',
    });
    metrics.emit('PantryItemCreated', 1, { unit: 'Count' });
    return item;
  },

  async listPantryItems(includeArchived?: boolean) {
    const user = await auth.requireAuth(context);
    const userSub = user.userId;
    const parsedIncludeArchived = z.boolean().default(false).parse(includeArchived);
    const items = await pantry.list(userSub, parsedIncludeArchived);
    logger.info('Pantry operation', {
      operation: 'listPantryItems',
      status: 'success',
    });
    return items;
  },

  async updatePantryItem(itemId: string, expectedVersion: number, patch: PantryItemPatch) {
    const user = await auth.requireAuth(context);
    const userSub = user.userId;
    const parsedItemId = itemIdSchema.parse(itemId);
    const parsedVersion = versionSchema.parse(expectedVersion);
    const parsedPatch = pantryItemPatchSchema.parse(patch);
    const item = await pantry.update(userSub, parsedItemId, parsedVersion, parsedPatch);
    logger.info('Pantry operation', {
      operation: 'updatePantryItem',
      itemId: item.itemId,
      status: 'success',
    });
    metrics.emit('PantryItemUpdated', 1, { unit: 'Count' });
    return item;
  },

  async setPantryOutcome(
    itemId: string,
    expectedVersion: number,
    outcome: 'consumed' | 'discarded',
  ) {
    const user = await auth.requireAuth(context);
    const userSub = user.userId;
    const parsedItemId = itemIdSchema.parse(itemId);
    const parsedVersion = versionSchema.parse(expectedVersion);
    const parsedOutcome = outcomeSchema.parse(outcome);
    const item = await pantry.setOutcome(userSub, parsedItemId, parsedVersion, parsedOutcome);
    logger.info('Pantry operation', {
      operation: 'setPantryOutcome',
      itemId: item.itemId,
      status: 'success',
    });
    metrics.emit(parsedOutcome === 'consumed' ? 'PantryItemConsumed' : 'PantryItemDiscarded', 1, {
      unit: 'Count',
    });
    return item;
  },

  async restorePantryItem(itemId: string, expectedVersion: number) {
    const user = await auth.requireAuth(context);
    const userSub = user.userId;
    const parsedItemId = itemIdSchema.parse(itemId);
    const parsedVersion = versionSchema.parse(expectedVersion);
    const item = await pantry.restore(userSub, parsedItemId, parsedVersion);
    logger.info('Pantry operation', {
      operation: 'restorePantryItem',
      itemId: item.itemId,
      status: 'success',
    });
    metrics.emit('PantryItemUpdated', 1, { unit: 'Count' });
    return item;
  },
}));
