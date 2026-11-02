export interface SizePricing {
  size: 'S' | 'M' | 'L';
  pricePerBlock: number;
  blockHours: number;
  minHours: number;
  maxHours: number;
}

export function bookingQuote(policies: SizePricing[] | undefined, size: string | null, hours: number): number | null {
  const policy = policies?.find(p => p.size === size);
  if (!policy || !Number.isFinite(hours) || !Number.isFinite(policy.pricePerBlock)
    || policy.pricePerBlock < 0 || !(policy.blockHours > 0) || !(hours > 0)
    || hours < policy.minHours || hours > policy.maxHours) return null;
  return Math.ceil(hours / policy.blockHours) * policy.pricePerBlock;
}
