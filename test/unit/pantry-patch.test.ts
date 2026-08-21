import { expect, it } from 'vitest';
import { pantryItemPatchSchema } from '../../shared/contracts';

it('allows a patch to change an item lifecycle state', () => {
  expect(pantryItemPatchSchema.parse({ state: 'consumed' })).toEqual({ state: 'consumed' });
});
