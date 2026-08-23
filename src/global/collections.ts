import * as core from "../collections/index";
import type { Collection } from "../collections/pick";
import { globalSource } from "./instance";

/**
 * One element. Throws when the collection is empty.
 *
 * @example
 * ```ts
 * pick(["rock", "paper", "scissors"]); // "paper"
 * pick("abcdef");                      // "d"
 * pick(new Set([1, 2, 3]));            // 2
 * ```
 */
export function pick<T>(items: Collection<T>): T {
  return core.pick(globalSource(), items);
}

/**
 * One element, or `undefined` when the collection is empty.
 *
 * @example
 * ```ts
 * tryPick([]);           // undefined
 * tryPick(["a", "b"]);   // "a"
 * ```
 */
export function tryPick<T>(items: Collection<T>): T | undefined {
  return core.tryPick(globalSource(), items);
}

/**
 * The index of one element, rather than the element itself.
 *
 * @example
 * ```ts
 * pickIndex(["a", "b", "c"]); // 2
 * ```
 */
export function pickIndex<T>(items: Collection<T>): number {
  return core.pickIndex(globalSource(), items);
}

/**
 * One key of a plain object or `Map`.
 *
 * @example
 * ```ts
 * pickKey({ small: 1, medium: 2, large: 3 }); // "medium"
 * ```
 */
export function pickKey<K extends string | number | symbol, V>(
  target: Record<K, V> | Map<K, V>
): K {
  return core.pickKey(globalSource(), target);
}

/**
 * One `[key, value]` pair of a plain object or `Map`.
 *
 * @example
 * ```ts
 * pickEntry({ a: 1, b: 2 }); // [ "b", 2 ]
 * ```
 */
export function pickEntry<K extends string | number | symbol, V>(
  target: Record<K, V> | Map<K, V>
): [K, V] {
  return core.pickEntry(globalSource(), target);
}

/**
 * `k` elements with replacement, so `k` may exceed the collection size.
 *
 * @example
 * ```ts
 * choices(["a", "b"], 5); // [ "b", "b", "a", "b", "a" ]
 * ```
 */
export function choices<T>(items: Collection<T>, k: number): T[] {
  return core.choices(globalSource(), items, k);
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
  return core.sample(globalSource(), items, k);
}

/**
 * `k` distinct elements, kept in their original order.
 *
 * @example
 * ```ts
 * combination([1, 2, 3, 4, 5], 3); // [ 1, 4, 5 ]
 * ```
 */
export function combination<T>(items: Collection<T>, k: number): T[] {
  return core.combination(globalSource(), items, k);
}

/**
 * `k` elements from an iterable of unknown length, in one pass.
 *
 * @example
 * ```ts
 * function* lines() {
 *   yield "first";
 *   yield "second";
 *   yield "third";
 * }
 * // Nothing is buffered, so the source may be far larger than memory.
 * reservoir(lines(), 2); // [ "third", "first" ]
 * ```
 */
export function reservoir<T>(items: Iterable<T>, k: number): T[] {
  return core.reservoir(globalSource(), items, k);
}

/**
 * Remove one random element and return it. Mutates the array.
 *
 * @example
 * ```ts
 * const deck = ["A", "K", "Q", "J"];
 * takeOut(deck); // "Q", and deck is now [ "A", "K", "J" ]
 * ```
 */
export function takeOut<T>(items: T[]): T {
  return core.takeOut(globalSource(), items);
}

/**
 * A shuffled copy. The input is untouched.
 *
 * @example
 * ```ts
 * shuffle([1, 2, 3, 4, 5]); // [ 3, 1, 5, 2, 4 ]
 * ```
 */
export function shuffle<T>(items: Collection<T>): T[] {
  return core.shuffle(globalSource(), items);
}

/**
 * Fisher–Yates in place: the only mutating shuffle.
 *
 * @example
 * ```ts
 * const deck = [1, 2, 3, 4, 5];
 * shuffleInPlace(deck); // deck itself is reordered and returned
 * ```
 */
export function shuffleInPlace<T>(items: T[]): T[] {
  return core.shuffleInPlace(globalSource(), items);
}

/**
 * A shuffled `[0, n)`, for permuting something you index yourself.
 *
 * @example
 * ```ts
 * permutation(5); // [ 3, 0, 4, 1, 2 ]
 * ```
 */
export function permutation(n: number): number[] {
  return core.permutation(globalSource(), n);
}

/**
 * The characters of a string in random order, by code point.
 *
 * @example
 * ```ts
 * shuffleString("ransu"); // "nusar"
 * ```
 */
export function shuffleString(value: string): string {
  return core.shuffleString(globalSource(), value);
}

/**
 * One element, with probability proportional to its weight.
 *
 * @example
 * ```ts
 * // "common" ten times as often as "rare".
 * weightedPick(["common", "rare"], [10, 1]); // "common"
 * ```
 */
export function weightedPick<T>(
  items: Collection<T>,
  weights: ArrayLike<number>
): T {
  return core.weightedPick(globalSource(), items, weights);
}

/**
 * `k` distinct elements, drawn in proportion to their weights.
 *
 * @example
 * ```ts
 * weightedSample(["a", "b", "c"], [1, 3, 6], 2); // [ "c", "b" ]
 * ```
 */
export function weightedSample<T>(
  items: Collection<T>,
  weights: ArrayLike<number>,
  k: number
): T[] {
  return core.weightedSample(globalSource(), items, weights, k);
}

/**
 * A reusable weighted sampler, O(1) per draw.
 *
 * Build one when the same weights are drawn from repeatedly;
 * {@link weightedPick} is a linear scan and is the better choice for a one-off.
 *
 * @example
 * ```ts
 * const loot = weightedTable(["common", "rare", "epic"], [90, 9, 1]);
 * loot.pick(); // "common"
 * loot.pick(); // "common"
 * ```
 */
export function weightedTable<T>(
  items: Collection<T>,
  weights: ArrayLike<number>
): { pick(): T } {
  const table = new core.AliasTable(items, weights);
  return { pick: () => table.pick(globalSource()) };
}

/**
 * A uniformly chosen value of a plain object or `Map`.
 *
 * @example
 * ```ts
 * pickValue({ a: 1, b: 2, c: 3 }); // 3
 * ```
 */
export function pickValue<K extends string | number | symbol, V>(
  target: Record<K, V> | Map<K, V>
): V {
  return core.pickValue(globalSource(), target);
}

/**
 * Each element kept independently with probability `p`.
 *
 * The result has no fixed length: it is a coin flip per element, so the size
 * varies around `items.length * p`. Order is preserved.
 *
 * @example
 * ```ts
 * subset([1, 2, 3, 4, 5, 6], 0.5); // [ 1, 4, 5 ]
 * ```
 */
export function subset<T>(items: Collection<T>, p: number): T[] {
  return core.subset(globalSource(), items, p);
}
