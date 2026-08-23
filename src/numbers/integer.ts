import { assertInteger, assertOrder } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";

// Bounded integers with no modulo bias, unlike `floor(random() * n)`. Ranges up
// to 2^32 use Lemire's nearly-divisionless method, larger ones rejection over
// two words. Beyond 2^53 is refused rather than silently rounded.

const TWO_32 = 0x100000000;

/**
 * Uniform integer in `[0, s)` for `2 <= s <= 2^32`.
 *
 * The 32x32 multiply is written out rather than routed through the shared u64
 * helper: this is the hottest function in the library, and the round trip
 * through a scratch array costs more than the multiply.
 */
function boundedUint32(src: Source, s: number): number {
  if (s === TWO_32) return src.u32();

  const sHigh = s >>> 16;
  const sLow = s & 0xffff;

  let x = src.u32();

  for (;;) {
    const xHigh = x >>> 16;
    const xLow = x & 0xffff;
    const bottom = xLow * sLow;
    // Fits exactly in a double: at most 2^33, so `>>>` must not be used here.
    const middle = xHigh * sLow + xLow * sHigh + (bottom >>> 16);
    const low = (((middle & 0xffff) << 16) | (bottom & 0xffff)) >>> 0;
    const high = (xHigh * sHigh + Math.floor(middle / 0x10000)) >>> 0;

    if (low >= s) return high;
    // Only now is a division needed, and only for the rare rejection.
    if (low >= (TWO_32 - s) % s) return high;
    x = src.u32();
  }
}

/** Uniform integer in `[0, range)` for `2^32 < range <= 2^53`. */
function boundedLarge(src: Source, range: number): number {
  const highRange = Math.ceil(range / TWO_32);
  for (;;) {
    const value = boundedUint32(src, highRange) * TWO_32 + src.u32();
    if (value < range) return value;
  }
}

/** Uniform integer in `[0, range)`. `range` must be a positive safe integer. */
export function bounded(src: Source, range: number): number {
  if (range === 1) return 0;
  return range <= TWO_32 ? boundedUint32(src, range) : boundedLarge(src, range);
}

/** A uniform integer in `[min, max]`, both ends included. See {@link below}. */
export function integer(src: Source, min: number, max: number): number {
  assertInteger(min, "min");
  assertInteger(max, "max");
  assertOrder(min, max, "integer");

  const span = max - min;
  if (span >= Number.MAX_SAFE_INTEGER) {
    raise(
      "RANGE_TOO_LARGE",
      `integer(${min}, ${max}) spans more than 2^53 values, which a JavaScript number ` +
        "cannot represent exactly. Use bigint(min, max) instead."
    );
  }
  return min + bounded(src, span + 1);
}

/** A uniform integer in `[0, n)`. The half-open form, for indices and counts. */
export function below(src: Source, n: number): number {
  assertInteger(n, "n");
  if (n <= 0) {
    raise("INVALID_RANGE", `below(${n}): n must be >= 1.`);
  }
  return bounded(src, n);
}

/**
 * Python's `randrange`: a member of `[start, stop)` stepping by `step`.
 * With one argument it means `range(0, stop)`.
 */
export function range(
  src: Source,
  start: number,
  stop?: number,
  step = 1
): number {
  const from = stop === undefined ? 0 : start;
  const to = stop === undefined ? start : stop;

  assertInteger(from, "start");
  assertInteger(to, "stop");
  assertInteger(step, "step");
  if (step === 0) {
    raise("INVALID_ARGUMENT", "range(): step must not be 0.");
  }

  const width = step > 0 ? to - from : from - to;
  const count = Math.ceil(width / Math.abs(step));
  if (count <= 0) {
    raise(
      "INVALID_RANGE",
      `range(${from}, ${to}, ${step}) is empty. Check the direction of step.`
    );
  }
  return from + step * bounded(src, count);
}
