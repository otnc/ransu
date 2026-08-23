import * as collections from "./collections/index";
import type { Collection } from "./collections/pick";
import { cryptoRandom } from "./engine/crypto";
import { raise } from "./internal/errors";
import { sourceFor } from "./internal/source";
import * as core from "./numbers/index";
import { randomHex, randomString } from "./strings/random-string";

/**
 * The same API as the root, always backed by the platform CSPRNG, for cases
 * where prediction would matter. It cannot be seeded.
 */
const src = () => sourceFor(cryptoRandom);

/**
 * Always throws: a secure generator must not be made reproducible.
 *
 * Present so the mistake fails loudly at the call site instead of quietly
 * producing predictable secrets.
 *
 * @example
 * ```ts
 * try {
 *   seed(42);
 * } catch (error) {
 *   error.code; // "UNSEEDABLE_ENGINE"
 * }
 *
 * // Import from "ransu" when you want reproducible values.
 * ```
 */
export function seed(): never {
  return raise(
    "UNSEEDABLE_ENGINE",
    "ransu/secure cannot be seeded — a predictable stream would defeat its purpose. " +
      "Import from 'ransu' if you want reproducible values."
  );
}

/**
 * A double in `[0, 1)`, from the platform CSPRNG.
 *
 * @example
 * ```ts
 * random(); // 0.7401962...
 * ```
 */
export function random(): number {
  return core.random(src());
}

/**
 * A double in `[min, max)`, or `[0, 1)` with no arguments.
 *
 * @example
 * ```ts
 * float(0, 100); // 62.831...
 * ```
 */
export function float(min?: number, max?: number): number {
  return core.float(src(), min, max);
}

/** An integer in `[min, max]`, both ends included. */
/**
 * An integer in `[min, max]`, both ends included.
 *
 * @example
 * ```ts
 * integer(1, 6); // 4
 * ```
 */
export function integer(min: number, max: number): number {
  return core.integer(src(), min, max);
}

/**
 * An integer in `[0, n)`.
 *
 * @example
 * ```ts
 * below(52); // 17
 * ```
 */
export function below(n: number): number {
  return core.below(src(), n);
}

/**
 * A member of `[start, stop)` stepping by `step`.
 *
 * @example
 * ```ts
 * range(0, 100, 5); // 45
 * ```
 */
export function range(start: number, stop?: number, step?: number): number {
  return core.range(src(), start, stop, step);
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
  return core.randomBigInt(src(), min, max);
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
  return core.bool(src());
}

/**
 * `true` with probability `p`.
 *
 * @example
 * ```ts
 * chance(0.25); // false
 * ```
 */
export function chance(p: number): boolean {
  return core.chance(src(), p);
}

/**
 * `true` with probability `1 / n`.
 *
 * @example
 * ```ts
 * oneIn(20); // false
 * ```
 */
export function oneIn(n: number): boolean {
  return core.oneIn(src(), n);
}

/**
 * An integer built from `n` random bits, up to 53.
 *
 * @example
 * ```ts
 * bits(8); // 173
 * ```
 */
export function bits(n: number): number {
  return core.bits(src(), n);
}

/**
 * `n` cryptographically strong bytes.
 *
 * @example
 * ```ts
 * bytes(32); // Uint8Array(32) [ ... ]
 * ```
 */
export function bytes(n: number): Uint8Array {
  return core.bytes(src(), n);
}

/**
 * Fill an existing buffer, with no allocation.
 *
 * @example
 * ```ts
 * const key = new Uint8Array(32);
 * fillBytes(key);
 * ```
 */
export function fillBytes(out: Uint8Array): void {
  core.fillBytes(src(), out);
}

/**
 * One element. Throws when the collection is empty.
 *
 * @example
 * ```ts
 * pick(["a", "b", "c"]); // "b"
 * ```
 */
export function pick<T>(items: Collection<T>): T {
  return collections.pick(src(), items);
}

/**
 * One element, or `undefined` when the collection is empty.
 *
 * @example
 * ```ts
 * tryPick([]); // undefined
 * ```
 */
export function tryPick<T>(items: Collection<T>): T | undefined {
  return collections.tryPick(src(), items);
}

/**
 * The index of one element.
 *
 * @example
 * ```ts
 * pickIndex(["a", "b", "c"]); // 2
 * ```
 */
export function pickIndex<T>(items: Collection<T>): number {
  return collections.pickIndex(src(), items);
}

/**
 * `k` elements with replacement.
 *
 * @example
 * ```ts
 * choices(["a", "b"], 5); // [ "b", "b", "a", "b", "a" ]
 * ```
 */
export function choices<T>(items: Collection<T>, k: number): T[] {
  return collections.choices(src(), items, k);
}

/**
 * `k` distinct elements, in random order.
 *
 * @example
 * ```ts
 * sample([1, 2, 3, 4, 5], 3); // [ 4, 1, 5 ]
 * ```
 */
export function sample<T>(items: Collection<T>, k: number): T[] {
  return collections.sample(src(), items, k);
}

/** A shuffled copy, drawn from the CSPRNG. */
/**
 * A shuffled copy. The input is untouched.
 *
 * @example
 * ```ts
 * shuffle([1, 2, 3, 4, 5]); // [ 3, 1, 5, 2, 4 ]
 * ```
 */
export function shuffle<T>(items: Collection<T>): T[] {
  return collections.shuffle(src(), items);
}

/**
 * Fisher-Yates in place. Mutates the array.
 *
 * @example
 * ```ts
 * const deck = [1, 2, 3];
 * shuffleInPlace(deck);
 * ```
 */
export function shuffleInPlace<T>(items: T[]): T[] {
  return collections.shuffleInPlace(src(), items);
}

/**
 * A shuffled `[0, n)`.
 *
 * @example
 * ```ts
 * permutation(5); // [ 3, 0, 4, 1, 2 ]
 * ```
 */
export function permutation(n: number): number[] {
  return collections.permutation(src(), n);
}

/**
 * One element, with probability proportional to its weight.
 *
 * @example
 * ```ts
 * weightedPick(["common", "rare"], [10, 1]); // "common"
 * ```
 */
export function weightedPick<T>(
  items: Collection<T>,
  weights: ArrayLike<number>
): T {
  return collections.weightedPick(src(), items, weights);
}

/**
 * A random string over `alphabet` (default alphanumeric).
 *
 * @example
 * ```ts
 * string(32); // "yYwec14FcPKc0qobI8ngAxUr7mQvE2Lp"
 * ```
 */
export function string(
  length: number,
  alphabet?: string | ArrayLike<string>
): string {
  return randomString(src(), length, alphabet);
}

/**
 * A random lowercase hexadecimal string.
 *
 * @example
 * ```ts
 * hex(64); // "3f7a1c05e2b8..."
 * ```
 */
export function hex(length: number): string {
  return randomHex(src(), length);
}

export { nanoid } from "./nanoid";
export { otp, password, token } from "./token";
export { ulid } from "./ulid";
export { uuid } from "./uuid/index";
