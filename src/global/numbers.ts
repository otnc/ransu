import * as core from "../numbers/index";
import { globalSource } from "./instance";

/**
 * A double in `[0, 1)`. The `Math.random` drop-in.
 *
 * @example
 * ```ts
 * random(); // 0.7401962...
 * ```
 */
export function random(): number {
  return core.random(globalSource());
}

/**
 * A double in `[min, max)`, or `[0, 1)` with no arguments.
 *
 * @example
 * ```ts
 * float();          // 0.3964157...
 * float(10);        // 6.2831853...  one argument is the upper bound
 * float(-1.5, 1.5); // 0.4142135...
 * ```
 */
export function float(min?: number, max?: number): number {
  return core.float(globalSource(), min, max);
}

/**
 * An integer in `[min, max]`, both ends included.
 *
 * @example
 * ```ts
 * integer(1, 6);      // 4
 * integer(-10, 10);   // -3
 * ```
 */
export function integer(min: number, max: number): number {
  return core.integer(globalSource(), min, max);
}

/**
 * An integer in `[0, n)`. The form array indices want.
 *
 * @example
 * ```ts
 * const items = ["a", "b", "c"];
 * items[below(items.length)]; // "c"
 * ```
 */
export function below(n: number): number {
  return core.below(globalSource(), n);
}

/**
 * Python's `randrange`: a member of `[start, stop)` stepping by `step`.
 *
 * @example
 * ```ts
 * range(10);         // 7      one argument is the upper bound
 * range(5, 10);      // 8
 * range(0, 100, 5);  // 45     multiples of five only
 * ```
 */
export function range(start: number, stop?: number, step?: number): number {
  return core.range(globalSource(), start, stop, step);
}

/**
 * A bigint in `[min, max]`, both ends included.
 *
 * @example
 * ```ts
 * bigint(0n, 2n ** 128n); // 214703556478...n
 * ```
 */
export function bigint(min: bigint, max: bigint): bigint {
  return core.randomBigInt(globalSource(), min, max);
}

/**
 * `true` or `false`, evenly.
 *
 * @example
 * ```ts
 * bool(); // true
 * ```
 */
export function bool(): boolean {
  return core.bool(globalSource());
}

/**
 * `true` with probability `p`.
 *
 * @example
 * ```ts
 * chance(0.25); // true a quarter of the time
 * ```
 */
export function chance(p: number): boolean {
  return core.chance(globalSource(), p);
}

/**
 * `true` with probability `1 / n`.
 *
 * @example
 * ```ts
 * oneIn(20); // a critical hit on a d20
 * ```
 */
export function oneIn(n: number): boolean {
  return core.oneIn(globalSource(), n);
}

/**
 * `-1` or `1`.
 *
 * @example
 * ```ts
 * sign() * 5; // -5
 * ```
 */
export function sign(): number {
  return core.sign(globalSource());
}

/**
 * An integer built from `n` random bits, up to 53.
 *
 * @example
 * ```ts
 * bits(8);  // 173   an integer in [0, 256)
 * bits(53); // 6519085048561357
 * ```
 */
export function bits(n: number): number {
  return core.bits(globalSource(), n);
}

/**
 * An integer built from `n` random bits, with no width limit.
 *
 * @example
 * ```ts
 * bigBits(256); // 8873184...n
 * ```
 */
export function bigBits(n: number): bigint {
  return core.bigBits(globalSource(), n);
}

/**
 * `n` random bytes.
 *
 * @example
 * ```ts
 * bytes(16); // Uint8Array(16) [ 57, 129, 123, ... ]
 * ```
 */
export function bytes(n: number): Uint8Array {
  return core.bytes(globalSource(), n);
}

/**
 * Fill an existing buffer, with no allocation.
 *
 * @example
 * ```ts
 * const buffer = new Uint8Array(32);
 * fillBytes(buffer);
 * ```
 */
export function fillBytes(out: Uint8Array): void {
  core.fillBytes(globalSource(), out);
}

/**
 * `n` doubles in `[0, 1)`.
 *
 * @example
 * ```ts
 * floats(1_000); // Float64Array(1000) [ 0.396..., 0.364..., ... ]
 * ```
 */
export function floats(n: number): Float64Array {
  return core.floats(globalSource(), n);
}

/**
 * `n` integers in `[min, max]`, with the bounds validated once.
 *
 * @example
 * ```ts
 * integers(1_000, 1, 6); // Float64Array(1000) [ 3, 5, 3, 1, ... ]
 * ```
 */
export function integers(n: number, min: number, max: number): Float64Array {
  return core.integers(globalSource(), n, min, max);
}

/**
 * An endless stream of doubles in `[0, 1)`.
 *
 * @example
 * ```ts
 * for (const value of stream()) {
 *   if (value > 0.99) break;
 * }
 * ```
 */
export function* stream(): Generator<number, never, unknown> {
  for (;;) yield core.random(globalSource());
}

/**
 * `count` distinct integers in `[min, max]`, without materialising the range.
 *
 * @example
 * ```ts
 * sampleIntegers(6, 1, 49);          // [ 12, 3, 41, 28, 7, 33 ]
 * sampleIntegers(3, 0, 1_000_000_000); // fine: the range is never built
 * ```
 */
export function sampleIntegers(
  count: number,
  min: number,
  max: number
): number[] {
  return core.sampleIntegers(globalSource(), count, min, max);
}
