import type { LedgerEntry } from "./api";

export interface CreditDay {
  key: string;
  label: string;
  /** Balance at the end of that day, derived back from today's balance. */
  balance: number;
  spent: number;
  gained: number;
}

const short = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Turns the 50-row ledger into a 14-day balance curve. The end-of-day balance
 * is walked backwards from the real current balance, so the curve is anchored
 * to the ledger rather than to a fresh sum that could drift from it.
 */
export function buildCreditSeries(
  currentBalance: number,
  entries: LedgerEntry[],
  days = 14
): CreditDay[] {
  const now = new Date();
  const keys = Array.from({ length: days }, (_, i) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1 - i))
    );
    return utcDayKey(date);
  });

  const buckets = new Map(keys.map((key) => [key, { spent: 0, gained: 0 }]));
  for (const entry of entries) {
    const bucket = buckets.get(entry.createdAt.slice(0, 10));
    if (!bucket) continue;
    if (entry.delta < 0) bucket.spent += -entry.delta;
    else bucket.gained += entry.delta;
  }

  const net = keys.map((key) => {
    const bucket = buckets.get(key)!;
    return bucket.gained - bucket.spent;
  });

  const balances = new Array<number>(days).fill(0);
  let after = 0;
  for (let i = days - 1; i >= 0; i--) {
    balances[i] = currentBalance - after;
    after += net[i];
  }

  return keys.map((key, i) => {
    const bucket = buckets.get(key)!;
    return {
      key,
      label: short.format(new Date(`${key}T00:00:00Z`)),
      balance: balances[i],
      spent: bucket.spent,
      gained: bucket.gained,
    };
  });
}
