import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp } from './index.mjs';

test('clamp handles below min, within range, and above max', () => {
  assert.strictEqual(clamp(2, 5, 10), 5);
  assert.strictEqual(clamp(7, 5, 10), 7);
  assert.strictEqual(clamp(12, 5, 10), 10);
});
