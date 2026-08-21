import {
  pantryItemSchema,
  type PantryItem,
  type PantryItemInput,
  type PantryItemPatch,
} from '../../shared/contracts';
import { newId } from '../../shared/ids';
import type { PantryEntity } from './schemas';

export interface PantryRepository {
  create(userSub: string, input: PantryItemInput): Promise<PantryItem>;
  list(userSub: string, includeArchived: boolean): Promise<PantryItem[]>;
  update(
    userSub: string,
    itemId: string,
    expectedVersion: number,
    patch: PantryItemPatch,
  ): Promise<PantryItem>;
  setOutcome(
    userSub: string,
    itemId: string,
    expectedVersion: number,
    outcome: 'consumed' | 'discarded',
  ): Promise<PantryItem>;
  restore(userSub: string, itemId: string, expectedVersion: number): Promise<PantryItem>;
}

type PantryPutOptions =
  | { ifNotExists: true; ifFieldEquals?: never }
  | { ifNotExists?: never; ifFieldEquals: { version: number } };

export interface PantryTable {
  get(key: { userSub: string; entityId: string }): Promise<PantryEntity | null>;
  put(
    item: PantryEntity,
    options?: PantryPutOptions,
  ): Promise<void>;
  queryPantryItems(userSub: string): AsyncIterable<PantryEntity>;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toPantryItem(entity: PantryEntity): PantryItem {
  return pantryItemSchema.parse({
    userSub: entity.userSub,
    itemId: entity.itemId,
    name: entity.name,
    normalizedName: entity.normalizedName,
    category: entity.category,
    quantity: entity.quantity,
    unit: entity.unit,
    storage: entity.storage,
    addedDate: entity.addedDate,
    expiryDate: entity.expiryDate,
    state: entity.state,
    source: entity.source,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function createPantryRepository(table: PantryTable): PantryRepository {
  async function load(userSub: string, itemId: string): Promise<PantryEntity> {
    const entity = await table.get({ userSub, entityId: `ITEM#${itemId}` });
    if (!entity || entity.entityType !== 'PANTRY_ITEM') {
      throw new Error('Pantry item not found');
    }
    return entity;
  }

  async function update(
    userSub: string,
    itemId: string,
    expectedVersion: number,
    patch: PantryItemPatch,
  ): Promise<PantryItem> {
    const currentEntity = await load(userSub, itemId);
    const current = toPantryItem(currentEntity);
    const now = Date.now();
    const nextItem = pantryItemSchema.parse({
      ...current,
      ...patch,
      normalizedName: patch.name === undefined ? current.normalizedName : normalizeName(patch.name),
      version: current.version + 1,
      updatedAt: now,
    });
    const nextEntity: PantryEntity = {
      ...currentEntity,
      ...nextItem,
      sortDate: now,
    };

    await table.put(nextEntity, { ifFieldEquals: { version: expectedVersion } });
    return nextItem;
  }

  return {
    async create(userSub, input) {
      const now = Date.now();
      const item = pantryItemSchema.parse({
        ...input,
        userSub,
        itemId: newId('item', now),
        normalizedName: normalizeName(input.name),
        state: 'active',
        source: 'manual',
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      const entity: PantryEntity = {
        ...item,
        entityId: `ITEM#${item.itemId}`,
        entityType: 'PANTRY_ITEM',
        sortDate: now,
      };

      await table.put(entity, { ifNotExists: true });
      return item;
    },

    async list(userSub, includeArchived) {
      const items: PantryItem[] = [];
      for await (const entity of table.queryPantryItems(userSub)) {
        const item = toPantryItem(entity);
        if (includeArchived || item.state === 'active') items.push(item);
      }
      return items.sort((left, right) => left.expiryDate.localeCompare(right.expiryDate));
    },

    update,

    async setOutcome(userSub, itemId, expectedVersion, outcome) {
      return update(userSub, itemId, expectedVersion, { state: outcome });
    },

    async restore(userSub, itemId, expectedVersion) {
      return update(userSub, itemId, expectedVersion, { state: 'active' });
    },
  };
}
