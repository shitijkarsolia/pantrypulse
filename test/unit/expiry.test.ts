import { describe, expect, it } from 'vitest';
import { daysUntil, urgencyFor } from '../../shared/expiry';

const now = new Date('2026-08-21T12:00:00Z');

describe('urgencyFor', () => {
  it.each([
    ['2026-08-28', 'fresh'],
    ['2026-08-26', 'use-soon'],
    ['2026-08-23', 'urgent'],
    ['2026-08-20', 'expired'],
  ])('maps %s to %s', (date, expected) => {
    expect(urgencyFor(date, now)).toBe(expected);
  });

  it('uses UTC date boundaries', () => {
    expect(daysUntil('2026-08-22', now)).toBe(1);
  });
});
