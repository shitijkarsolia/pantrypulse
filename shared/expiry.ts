export type Urgency = 'fresh' | 'use-soon' | 'urgent' | 'expired';

const DAY_MS = 86_400_000;

export function daysUntil(expiryDate: string, now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiry = Date.parse(expiryDate + 'T00:00:00Z');
  return Math.ceil((expiry - today) / DAY_MS);
}

export function urgencyFor(expiryDate: string, now = new Date()): Urgency {
  const days = daysUntil(expiryDate, now);
  if (days < 0) return 'expired';
  if (days <= 2) return 'urgent';
  if (days <= 5) return 'use-soon';
  return 'fresh';
}
