import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp } from './index.mjs';

test('clamp below range returns lower bound', () => {
  assert.equal(clamp(-5, 0, 10), 0);
});

test('clamp above range returns upper bound', () => {
  assert.equal(clamp(15, 0, 10), 10);
});

test('clamp within range returns value', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test('clamp with invalid bounds or non-finite inputs throws RangeError', () => {
  assert.throws(() => clamp(5, 10, 0), RangeError);
  assert.throws(() => clamp(NaN, 0, 10), RangeError);
  assert.throws(() => clamp(5, 0, Infinity), RangeError);
  assert.throws(() => clamp('5', 0, 10), RangeError);
});
