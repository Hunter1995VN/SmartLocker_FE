import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingQuote } from '../../src/utils/bookingQuote.ts';

const policies = [
  { size: 'S', pricePerBlock: 15000, blockHours: 1, minHours: 1, maxHours: 24 },
  { size: 'M', pricePerBlock: 25000, blockHours: 2, minHours: 1, maxHours: 24 },
  { size: 'L', pricePerBlock: 40000, blockHours: 3, minHours: 2, maxHours: 24 },
];
test('S/M/L use their own configured block price and round up partial blocks', () => {
  assert.equal(bookingQuote(policies, 'S', 3), 45000);
  assert.equal(bookingQuote(policies, 'M', 3), 50000);
  assert.equal(bookingQuote(policies, 'L', 4), 80000);
});
test('missing policy, invalid block, and out-of-policy duration cannot produce a quote', () => {
  for (const args of [[undefined, 'M', 3], [policies, 'XL', 3], [policies, 'L', 1], [policies, 'S', 25], [policies, 'S', NaN], [[{...policies[0], blockHours: 0}], 'S', 3]]) {
    assert.equal(bookingQuote(...args), null);
  }
});
