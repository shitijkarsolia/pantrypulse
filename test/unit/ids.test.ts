import { expect, it } from 'vitest';
import { newId } from '../../shared/ids';

it('includes the supplied prefix and base-36 timestamp', () => {
  expect(newId('item', 1_787_011_200_000)).toMatch(/^item_msxwbuo0_[0-9a-z]+$/);
});
