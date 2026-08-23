import { assertFinite, assertOrder } from "../internal/assert";
import type { Source } from "../internal/source";

/** A uniform double in `[0, 1)`, full 53-bit mantissa. The `Math.random` drop-in. */
export function random(src: Source): number {
  return src.f64();
}

/** A uniform double in `[min, max)`. With no arguments, `[0, 1)`. */
export function float(src: Source, min?: number, max?: number): number {
  if (min === undefined) return src.f64();
  const to = max === undefined ? min : max;
  const from = max === undefined ? 0 : min;

  assertFinite(from, "min");
  assertFinite(to, "max");
  assertOrder(from, to, "float");

  return from + src.f64() * (to - from);
}
