import { assertInteger, assertLength, assertOrder } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "./integer";

/** `n` random bytes. */
export function bytes(src: Source, n: number): Uint8Array {
  assertLength(n, "n");
  const out = new Uint8Array(n);
  src.fillBytes(out);
  return out;
}

/** Fill an existing buffer — the allocation-free form. */
export function fillBytes(src: Source, out: Uint8Array): void {
  src.fillBytes(out);
}

/** `n` uniform doubles in `[0, 1)`. */
export function floats(src: Source, n: number): Float64Array {
  assertLength(n, "n");
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = src.f64();
  return out;
}

/**
 * `n` uniform integers in `[min, max]`, with the bounds validated once rather
 * than per element. `Float64Array` holds every safe integer exactly.
 */
export function integers(
  src: Source,
  n: number,
  min: number,
  max: number
): Float64Array {
  assertLength(n, "n");
  assertInteger(min, "min");
  assertInteger(max, "max");
  assertOrder(min, max, "integers");

  const span = max - min;
  if (span >= Number.MAX_SAFE_INTEGER) {
    raise(
      "RANGE_TOO_LARGE",
      `integers(): the range ${min}..${max} exceeds 2^53 values.`
    );
  }

  const size = span + 1;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = min + bounded(src, size);
  return out;
}
