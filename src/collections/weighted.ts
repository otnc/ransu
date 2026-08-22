import { assertLength, assertNotEmpty } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";
import { asIndexable, type Collection } from "./pick";

function validate(weights: ArrayLike<number>, length: number): number {
  if (weights.length !== length) {
    raise(
      "INVALID_WEIGHTS",
      `weights.length (${weights.length}) must equal items.length (${length}).`
    );
  }
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
      raise(
        "INVALID_WEIGHTS",
        `weights[${i}] must be a finite number >= 0, got ${String(w)}.`
      );
    }
    total += w;
  }
  if (total <= 0) {
    raise("INVALID_WEIGHTS", "At least one weight must be greater than 0.");
  }
  return total;
}

/**
 * One element, with probability proportional to its weight. A single linear
 * pass, no allocation. For repeated draws build an {@link AliasTable} instead.
 */
export function weighted<T>(
  src: Source,
  items: Collection<T>,
  weights: ArrayLike<number>
): T {
  const list = asIndexable(items);
  assertNotEmpty(list.length, "pick");
  const total = validate(weights, list.length);

  const target = src.f64() * total;
  let acc = 0;
  for (let i = 0; i < list.length; i++) {
    acc += weights[i];
    if (target < acc) return list[i];
  }
  // Only reachable through floating-point drift at the very top of the range.
  return list[list.length - 1];
}

/** Vose's alias method: O(n) to build, O(1) per draw. */
export class AliasTable<T> {
  private readonly items: ArrayLike<T>;
  private readonly probability: Float64Array;
  private readonly alias: Int32Array;

  constructor(items: Collection<T>, weights: ArrayLike<number>) {
    const list = asIndexable(items);
    assertNotEmpty(list.length, "pick");
    const total = validate(weights, list.length);

    const n = list.length;
    this.items = list;
    this.probability = new Float64Array(n);
    this.alias = new Int32Array(n);

    const scaled = new Float64Array(n);
    const small: number[] = [];
    const large: number[] = [];
    for (let i = 0; i < n; i++) {
      scaled[i] = (weights[i] * n) / total;
      (scaled[i] < 1 ? small : large).push(i);
    }

    while (small.length > 0 && large.length > 0) {
      const l = small.pop() as number;
      const g = large.pop() as number;
      this.probability[l] = scaled[l];
      this.alias[l] = g;
      scaled[g] = scaled[g] + scaled[l] - 1;
      (scaled[g] < 1 ? small : large).push(g);
    }
    while (large.length > 0) this.probability[large.pop() as number] = 1;
    while (small.length > 0) this.probability[small.pop() as number] = 1;
  }

  get length(): number {
    return this.items.length;
  }

  /** One draw, in constant time. */
  pick(src: Source): T {
    const i = bounded(src, this.items.length);
    return src.f64() < this.probability[i]
      ? this.items[i]
      : this.items[this.alias[i]];
  }
}

/**
 * `k` distinct elements with probability proportional to their weights, by
 * Efraimidis-Spirakis: every item gets an exponential key scaled by its weight,
 * and the `k` smallest keys win.
 */
export function weightedSample<T>(
  src: Source,
  items: Collection<T>,
  weights: ArrayLike<number>,
  k: number
): T[] {
  const list = asIndexable(items);
  assertLength(k, "k");
  const n = list.length;
  if (k > n) {
    raise(
      "SAMPLE_TOO_LARGE",
      `weightedSample(items, weights, ${k}): k must be <= ${n}.`
    );
  }
  if (weights.length !== n) {
    raise(
      "INVALID_WEIGHTS",
      `weights.length (${weights.length}) must equal items.length (${n}).`
    );
  }
  if (k === 0) return [];

  const keyed: { index: number; key: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
      raise(
        "INVALID_WEIGHTS",
        `weights[${i}] must be a finite number >= 0, got ${String(w)}.`
      );
    }
    // Zero weight sorts last, so it is only chosen when nothing else is left.
    let u = src.f64();
    while (u === 0) u = src.f64();
    keyed.push({
      index: i,
      key: w === 0 ? Number.POSITIVE_INFINITY : -Math.log(u) / w,
    });
  }

  keyed.sort((a, b) => a.key - b.key);
  const out = new Array<T>(k);
  for (let i = 0; i < k; i++) out[i] = list[keyed[i].index];
  return out;
}
