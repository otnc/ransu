import * as core from "../collections/index";
import type { Collection } from "../collections/pick";
import { globalSource } from "./instance";

/** One element. Throws when the collection is empty. */
export function pick<T>(items: Collection<T>): T {
  return core.pick(globalSource(), items);
}

/** One element, or `undefined` when the collection is empty. */
export function tryPick<T>(items: Collection<T>): T | undefined {
  return core.tryPick(globalSource(), items);
}

export function pickIndex<T>(items: Collection<T>): number {
  return core.pickIndex(globalSource(), items);
}

export function pickKey<K extends string | number | symbol, V>(
  target: Record<K, V> | Map<K, V>
): K {
  return core.pickKey(globalSource(), target);
}

export function pickEntry<K extends string | number | symbol, V>(
  target: Record<K, V> | Map<K, V>
): [K, V] {
  return core.pickEntry(globalSource(), target);
}

/** `k` elements with replacement, so `k` may exceed the collection size. */
export function choices<T>(items: Collection<T>, k: number): T[] {
  return core.choices(globalSource(), items, k);
}

/** `k` distinct elements, in random order. */
export function sample<T>(items: Collection<T>, k: number): T[] {
  return core.sample(globalSource(), items, k);
}

/** `k` distinct elements, kept in their original order. */
export function combination<T>(items: Collection<T>, k: number): T[] {
  return core.combination(globalSource(), items, k);
}

/** `k` elements from an iterable of unknown length, in one pass. */
export function reservoir<T>(items: Iterable<T>, k: number): T[] {
  return core.reservoir(globalSource(), items, k);
}

/** Remove one random element and return it. Mutates the array. */
export function takeOut<T>(items: T[]): T {
  return core.takeOut(globalSource(), items);
}

/** A shuffled copy. The input is untouched. */
export function shuffle<T>(items: Collection<T>): T[] {
  return core.shuffle(globalSource(), items);
}

/** Fisher–Yates in place: the only mutating shuffle. */
export function shuffleInPlace<T>(items: T[]): T[] {
  return core.shuffleInPlace(globalSource(), items);
}

export function permutation(n: number): number[] {
  return core.permutation(globalSource(), n);
}

export function shuffleString(value: string): string {
  return core.shuffleString(globalSource(), value);
}

/** One element, with probability proportional to its weight. */
export function weightedPick<T>(
  items: Collection<T>,
  weights: ArrayLike<number>
): T {
  return core.weightedPick(globalSource(), items, weights);
}

/** `k` distinct elements, weightedPick. */
export function weightedSample<T>(
  items: Collection<T>,
  weights: ArrayLike<number>,
  k: number
): T[] {
  return core.weightedSample(globalSource(), items, weights, k);
}

/** A reusable weightedPick sampler, O(1) per draw. */
export function weightedTable<T>(
  items: Collection<T>,
  weights: ArrayLike<number>
): { pick(): T } {
  const table = new core.AliasTable(items, weights);
  return { pick: () => table.pick(globalSource()) };
}

/** A uniformly chosen value of a plain object or `Map`. */
export function pickValue<K extends string | number | symbol, V>(
  target: Record<K, V> | Map<K, V>
): V {
  return core.pickValue(globalSource(), target);
}

/** Each element kept independently with probability `p`. */
export function subset<T>(items: Collection<T>, p: number): T[] {
  return core.subset(globalSource(), items, p);
}
