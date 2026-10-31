import assert from 'node:assert/strict';
import test from 'node:test';
import { parseServerTime } from '../../src/utils/serverTime.ts';

test('SQL timestamps retain UTC meaning under a Vietnam browser timezone', () => {
  const instant = Date.UTC(2026, 9, 31, 8, 20, 52);
  assert.equal(parseServerTime('2026-10-31T08:20:52'), instant);
  assert.equal(parseServerTime('2026-10-31T08:20:52Z'), instant);
  assert.equal(parseServerTime('2026-10-31T15:20:52+07:00'), instant);
  assert.ok(parseServerTime('2026-10-31T09:20:52') > parseServerTime('2026-10-31T08:30:00Z'));
  assert.ok(Number.isNaN(parseServerTime('invalid')));
});
