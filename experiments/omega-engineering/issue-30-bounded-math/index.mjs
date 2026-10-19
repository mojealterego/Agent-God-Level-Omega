export function clamp(value, lower, upper) {
  if (
    typeof value !== 'number' ||
    typeof lower !== 'number' ||
    typeof upper !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isFinite(lower) ||
    !Number.isFinite(upper) ||
    lower > upper
  ) {
    throw new RangeError('All arguments must be finite numbers and lower <= upper');
  }
  return Math.min(Math.max(value, lower), upper);
}
