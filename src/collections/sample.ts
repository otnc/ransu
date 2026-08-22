import { assertLength, assertNotEmpty } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";
import { asIndexable, type Collection } from "./pick";
import { shuffleInPlace } from "./shuffle";

/**
 * `k` distinct elements, without replacement. Floyd's algorithm when `k` is
 * small relative to `n`, partial Fisher–Yates otherwise; both give every subset
 * equal probability, and the result order is randomised too.
 */
export function sample<T>(src: Source, items: Collection<T>, k: number): T[] {
  const list = asIndexable(items);
  assertLength(k, "k");
  const n = list.length;

  if (k > n) {
    raise(
      "SAMPLE_TOO_LARGE",
      `sample(items, ${k}): k must be <= items.length (${n}). ` +
        "Use choices() if you want sampling with replacement."
    );
  }
  if (k === 0) return [];

  const indices = k * 2 <= n ? floyd(src, n, k) : partial(src, n, k);
  shuffleInPlace(src, indices);

  const out = new Array<T>(k);
  for (let i = 0; i < k; i++) out[i] = list[indices[i]];
  return out;
}

/**
 * `k` distinct elements, kept in their original order. `sample` randomises the
 * order; this one does not, which is what you want for "pick 3 of these rows".
 */
export function combination<T>(
  src: Source,
  items: Collection<T>,
  k: number
): T[] {
  const list = asIndexable(items);
  assertLength(k, "k");
  const n = list.length;

  if (k > n) {
    raise(
      "SAMPLE_TOO_LARGE",
      `combination(items, ${k}): k must be <= items.length (${n}).`
    );
  }
  if (k === 0) return [];

  const indices = (k * 2 <= n ? floyd(src, n, k) : partial(src, n, k)).sort(
    (a, b) => a - b
  );
  const out = new Array<T>(k);
  for (let i = 0; i < k; i++) out[i] = list[indices[i]];
  return out;
}

/** Remove one random element and return it. Mutates the array. */
export function takeOut<T>(src: Source, items: T[]): T {
  assertNotEmpty(items.length, "pick");
  const index = bounded(src, items.length);
  const value = items[index];
  items[index] = items[items.length - 1];
  items.pop();
  return value;
}

/** A double in `(0, 1)`; the logarithms in Algorithm L cannot take a zero. */
function positive(src: Source): number {
  let u = src.f64();
  while (u === 0) u = src.f64();
  return u;
}

/** How far Algorithm L may skip ahead before the next candidate. */
function skip(src: Source, w: number): number {
  return Math.floor(Math.log(positive(src)) / Math.log(1 - w)) + 1;
}

/** Floyd's algorithm: `k` distinct indices without materialising `n` of them. */
function floyd(src: Source, n: number, k: number): number[] {
  const chosen = new Set<number>();
  const out: number[] = [];
  for (let j = n - k; j < n; j++) {
    const t = bounded(src, j + 1);
    if (chosen.has(t)) {
      chosen.add(j);
      out.push(j);
    } else {
      chosen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Partial Fisher–Yates over an index array: better when `k` approaches `n`. */
function partial(src: Source, n: number, k: number): number[] {
  const pool = new Array<number>(n);
  for (let i = 0; i < n; i++) pool[i] = i;

  for (let i = 0; i < k; i++) {
    const j = i + bounded(src, n - i);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, k);
}

/**
 * `k` elements from an iterable of unknown length in one pass — reservoir
 * sampling (Algorithm L). For streams, cursors and generators.
 */
export function reservoir<T>(src: Source, items: Iterable<T>, k: number): T[] {
  assertLength(k, "k");
  if (k === 0) return [];

  const out: T[] = [];
  const iterator = items[Symbol.iterator]();

  let step = iterator.next();
  while (out.length < k && !step.done) {
    out.push(step.value);
    step = iterator.next();
  }
  if (step.done) {
    shuffleInPlace(src, out);
    return out;
  }

  let w = Math.exp(Math.log(positive(src)) / k);
  // `seen` is the 1-based position of the item currently in `step`.
  let seen = k + 1;
  let next = k + skip(src, w);

  while (!step.done) {
    if (seen === next) {
      out[bounded(src, k)] = step.value;
      w *= Math.exp(Math.log(positive(src)) / k);
      next = seen + skip(src, w);
    }
    seen++;
    step = iterator.next();
  }

  shuffleInPlace(src, out);
  return out;
}
