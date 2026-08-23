import {
  assertLength,
  assertNotEmpty,
  assertProbability,
} from "../internal/assert";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";

/** Everything the collection helpers accept. */
export type Collection<T> = ArrayLike<T> | Iterable<T>;

/**
 * Normalise a collection to something indexable. Arrays, typed arrays and
 * strings pass through; `Set`, `Map` and generators are materialised once.
 */
export function asIndexable<T>(items: Collection<T>): ArrayLike<T> {
  return typeof (items as ArrayLike<T>).length === "number"
    ? (items as ArrayLike<T>)
    : Array.from(items as Iterable<T>);
}

/** A uniformly chosen index into `items`. */
export function pickIndex<T>(src: Source, items: Collection<T>): number {
  const list = asIndexable(items);
  assertNotEmpty(list.length, "pick");
  return bounded(src, list.length);
}

/** One uniformly chosen element. Throws on an empty collection. */
export function pick<T>(src: Source, items: Collection<T>): T {
  const list = asIndexable(items);
  assertNotEmpty(list.length, "pick");
  return list[bounded(src, list.length)];
}

/** Like {@link pick}, but `undefined` instead of throwing when empty. */
export function tryPick<T>(src: Source, items: Collection<T>): T | undefined {
  const list = asIndexable(items);
  if (list.length === 0) return undefined;
  return list[bounded(src, list.length)];
}

/** `k` elements with replacement, so `k` may exceed the collection size. */
export function choices<T>(src: Source, items: Collection<T>, k: number): T[] {
  const list = asIndexable(items);
  assertLength(k, "k");
  assertNotEmpty(list.length, "pick");

  const out = new Array<T>(k);
  const n = list.length;
  for (let i = 0; i < k; i++) out[i] = list[bounded(src, n)];
  return out;
}

/** A uniformly chosen key of a plain object or `Map`. */
export function pickKey<K extends string | number | symbol, V>(
  src: Source,
  target: Record<K, V> | Map<K, V>
): K {
  const keys =
    target instanceof Map ? [...target.keys()] : (Object.keys(target) as K[]);
  assertNotEmpty(keys.length, "pick");
  return keys[bounded(src, keys.length)];
}

/** A uniformly chosen `[key, value]` pair of a plain object or `Map`. */
export function pickEntry<K extends string | number | symbol, V>(
  src: Source,
  target: Record<K, V> | Map<K, V>
): [K, V] {
  const entries = (
    target instanceof Map ? [...target.entries()] : Object.entries(target)
  ) as [K, V][];
  assertNotEmpty(entries.length, "pick");
  return entries[bounded(src, entries.length)];
}

/** A uniformly chosen value of a plain object or `Map`. */
export function pickValue<K extends string | number | symbol, V>(
  src: Source,
  target: Record<K, V> | Map<K, V>
): V {
  // Read through the keys rather than Object.values, which loses the value
  // type when the key type is generic.
  const values =
    target instanceof Map
      ? [...target.values()]
      : (Object.keys(target) as K[]).map((key) => target[key]);
  assertNotEmpty(values.length, "pick");
  return values[bounded(src, values.length)];
}

/**
 * Each element kept independently with probability `p`.
 *
 * Unlike `sample`, the result size is not fixed: it is binomial around
 * `p * items.length`. That is what you want for thinning a list, dropping
 * frames, or seeding a sparse structure.
 */
export function subset<T>(src: Source, items: Collection<T>, p: number): T[] {
  assertProbability(p, "p");
  const list = asIndexable(items);
  const out: T[] = [];
  if (p <= 0) return out;
  if (p >= 1) {
    for (let i = 0; i < list.length; i++) out.push(list[i]);
    return out;
  }
  for (let i = 0; i < list.length; i++) {
    if (src.f64() < p) out.push(list[i]);
  }
  return out;
}
