import * as core from "../numbers/index";
import { globalSource } from "./instance";

/** A double in `[0, 1)`. The `Math.random` drop-in. */
export function random(): number {
  return core.random(globalSource());
}

/** A double in `[min, max)`, or `[0, 1)` with no arguments. */
export function float(min?: number, max?: number): number {
  return core.float(globalSource(), min, max);
}

/** A double in `[0, 1)` from a single word: 24 bits instead of 53. */
export function float32(): number {
  return core.float32(globalSource());
}

/** An integer in `[min, max]`, both ends included. */
export function integer(min: number, max: number): number {
  return core.integer(globalSource(), min, max);
}

/** An integer in `[0, n)`. The form array indices want. */
export function below(n: number): number {
  return core.below(globalSource(), n);
}

/** Python's `randrange`: a member of `[start, stop)` stepping by `step`. */
export function range(start: number, stop?: number, step?: number): number {
  return core.range(globalSource(), start, stop, step);
}

/** A bigint in `[min, max]`, both ends included. */
export function bigint(min: bigint, max: bigint): bigint {
  return core.randomBigInt(globalSource(), min, max);
}

/** `true` with probability `p` (default 0.5). */
export function bool(p?: number): boolean {
  return core.bool(globalSource(), p);
}

/** `true` with probability `p`. Reads better inside an `if`. */
export function chance(p: number): boolean {
  return core.chance(globalSource(), p);
}

/** `true` with probability `1 / n`. */
export function oneIn(n: number): boolean {
  return core.oneIn(globalSource(), n);
}

/** `-1` or `1`. */
export function sign(): number {
  return core.sign(globalSource());
}

/** An integer built from `n` random bits, up to 53. */
export function bits(n: number): number {
  return core.bits(globalSource(), n);
}

/** An integer built from `n` random bits, with no width limit. */
export function bigBits(n: number): bigint {
  return core.bigBits(globalSource(), n);
}

export function bytes(n: number): Uint8Array {
  return core.bytes(globalSource(), n);
}

/** Fill an existing buffer, with no allocation. */
export function fillBytes(out: Uint8Array): void {
  core.fillBytes(globalSource(), out);
}

/** `n` doubles in `[0, 1)`. */
export function floats(n: number): Float64Array {
  return core.floats(globalSource(), n);
}

/** `n` integers in `[min, max]`, with the bounds validated once. */
export function integers(n: number, min: number, max: number): Float64Array {
  return core.integers(globalSource(), n, min, max);
}

/** An endless stream of doubles in `[0, 1)`. */
export function* stream(): Generator<number, never, unknown> {
  for (;;) yield core.random(globalSource());
}
