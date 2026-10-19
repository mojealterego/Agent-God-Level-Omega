import test from 'node:test';
import assert from 'node:assert/strict';
import { isEven } from './index.mjs';

test('isEven identifies even integers', () => {
  assert.equal(isEven(0), true);
  assert.equal(isEven(42), true);
  assert.equal(isEven(-8), true);
});

test('isEven rejects non-even and non-integer values', () => {
  assert.equal(isEven(7), false);
  assert.equal(isEven(-3), false);
  assert.equal(isEven(4.2), false);
  assert.equal(isEven('4'), false);
  assert.equal(isEven(null), false);
  assert.equal(isEven(NaN), false);
});
