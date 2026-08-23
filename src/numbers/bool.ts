import { assertProbability } from "../internal/assert";
import type { Source } from "../internal/source";

/** `true` or `false`, evenly. Reads one bit. */
export function bool(src: Source): boolean {
  return src.u32() >>> 31 === 1;
}

/** `true` with probability `p`. */
export function chance(src: Source, p: number): boolean {
  assertProbability(p, "p");
  if (p <= 0) return false;
  if (p >= 1) return true;
  return src.f64() < p;
}

/** `true` with probability `1 / n`. */
export function oneIn(src: Source, n: number): boolean {
  return chance(src, 1 / n);
}

/** `-1` or `1`, with equal probability. */
export function sign(src: Source): number {
  return src.u32() >>> 31 === 1 ? 1 : -1;
}
