import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bigBits } from "./bits";

/**
 * A uniform bigint in `[min, max]`, both ends included. Rejection sampling over
 * the exact bit width, so arbitrarily large ranges stay unbiased.
 */
export function randomBigInt(src: Source, min: bigint, max: bigint): bigint {
  if (typeof min !== "bigint" || typeof max !== "bigint") {
    raise("INVALID_ARGUMENT", "bigint(min, max): both bounds must be bigints.");
  }
  if (min > max) {
    raise("INVALID_RANGE", `bigint(${min}, ${max}): min must be <= max.`);
  }

  const range = max - min + 1n;
  if (range === 1n) return min;

  const width = (range - 1n).toString(2).length;
  for (;;) {
    const value = bigBits(src, width);
    if (value < range) return min + value;
  }
}
