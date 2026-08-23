import {
  type Collection,
  choices,
  pick,
  pickEntry,
  pickIndex,
  pickKey,
  pickValue,
  subset,
  tryPick,
} from "./collections/pick";
import { combination, reservoir, sample, takeOut } from "./collections/sample";
import {
  permutation,
  shuffle,
  shuffleInPlace,
  shuffleString,
} from "./collections/shuffle";
import {
  AliasTable,
  weightedPick,
  weightedSample,
} from "./collections/weighted";
import type {
  Engine,
  EngineFactory,
  EngineLike,
  EngineState,
} from "./engine/types";
import { xoshiro128pp } from "./engine/xoshiro128pp";
import { raise } from "./internal/errors";
import { createSource, type Source } from "./internal/source";
import { randomBigInt } from "./numbers/bigint";
import { bigBits, bits } from "./numbers/bits";
import { sampleIntegers } from "./numbers/distinct";
import { bool, chance, oneIn, sign } from "./numbers/bool";
import { bytes, fillBytes, floats, integers } from "./numbers/bytes";
import { float, random } from "./numbers/float";
import { below, integer, range } from "./numbers/integer";
import type { Seed } from "./seed/sequence";
import { randomHex, randomString } from "./strings/random-string";
import type { CodePointSet, UnicodeOptions } from "./unicode/code-point-set";
import { randomChar, randomCodePoint, randomChars } from "./unicode/draw";

export interface RandomOptions {
  /**
   * Which algorithm to seed, as a factory: `{ engine: pcg32 }`. A bare
   * `() => number` source goes in the first constructor argument instead.
   */
  engine?: EngineFactory;
}

function isEngine(value: unknown): value is Engine {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Engine).nextUint32 === "function"
  );
}

/**
 * An independent stream of randomness: `new Random(42).integer(1, 6)`.
 *
 * Method names match the `ransu` namespace exactly. Libraries should own a
 * `Random` rather than call the global, which an application may re-seed.
 */
export class Random {
  #engine: Engine;
  #src: Source;

  constructor(seedOrEngine?: Seed | EngineLike, options: RandomOptions = {}) {
    const factory = options.engine ?? xoshiro128pp;

    if (seedOrEngine === undefined) {
      this.#engine = factory();
    } else if (isEngine(seedOrEngine) || typeof seedOrEngine === "function") {
      if (options.engine !== undefined) {
        raise(
          "INVALID_ARGUMENT",
          "new Random(): pass either an engine or a seed with { engine: factory }, not both."
        );
      }
      this.#engine = seedOrEngine as Engine;
    } else {
      this.#engine = factory(seedOrEngine);
    }

    this.#src = createSource(this.#engine);
  }

  /** The underlying engine. Hand this to `{ engine }` options elsewhere. */
  get engine(): Engine {
    return this.#src.engine;
  }

  /**
   * Restart from new seed material. A seedable engine restarts in place; an
   * unseedable one is replaced by the default deterministic engine.
   */
  seed(seed: Seed): this {
    const engine = this.#src.engine;
    if (engine.seedable && engine.reseed) {
      engine.reseed(seed);
      return this;
    }
    // Adopt into the existing Source rather than replacing it, so the call
    // sites in the core functions stay monomorphic.
    this.#engine = xoshiro128pp(seed);
    this.#src.adopt(this.#engine);
    return this;
  }

  /** An independent copy, positioned exactly where this one is. */
  clone(): Random {
    const engine = this.#src.engine;
    if (!engine.clone) {
      raise(
        "INVALID_ARGUMENT",
        `The ${engine.algorithm} engine cannot be cloned.`
      );
    }
    return new Random(engine.clone());
  }

  /** `n` independent generators, for workers or parallel simulations. */
  split(n: number): Random[] {
    const engine = this.#src.engine;
    if (!engine.split) {
      raise(
        "INVALID_ARGUMENT",
        `The ${engine.algorithm} engine cannot be split.`
      );
    }
    return engine.split(n).map((child) => new Random(child));
  }

  /** A JSON-serialisable snapshot. Restore it with {@link setState}. */
  getState(): EngineState {
    const engine = this.#src.engine;
    if (!engine.getState) {
      raise(
        "INVALID_ARGUMENT",
        `The ${engine.algorithm} engine has no state to save.`
      );
    }
    return engine.getState();
  }

  setState(state: EngineState): this {
    const engine = this.#src.engine;
    if (!engine.setState) {
      raise(
        "INVALID_ARGUMENT",
        `The ${engine.algorithm} engine has no state to restore.`
      );
    }
    engine.setState(state);
    return this;
  }

  // --- numbers -------------------------------------------------------------

  /** A double in `[0, 1)`. The `Math.random()` drop-in. */
  random(): number {
    return random(this.#src);
  }

  /** A double in `[min, max)`, or `[0, 1)` with no arguments. */
  float(min?: number, max?: number): number {
    return float(this.#src, min, max);
  }

  /** An integer in `[min, max]` — **both ends included**. */
  integer(min: number, max: number): number {
    return integer(this.#src, min, max);
  }

  /** An integer in `[0, n)`. The form array indices want. */
  below(n: number): number {
    return below(this.#src, n);
  }

  /** Python's `randrange`: a member of `[start, stop)` stepping by `step`. */
  range(start: number, stop?: number, step?: number): number {
    return range(this.#src, start, stop, step);
  }

  /** A bigint in `[min, max]` — both ends included. */
  bigint(min: bigint, max: bigint): bigint {
    return randomBigInt(this.#src, min, max);
  }

  /** `true` or `false`, evenly. */
  bool(): boolean {
    return bool(this.#src);
  }

  chance(p: number): boolean {
    return chance(this.#src, p);
  }

  oneIn(n: number): boolean {
    return oneIn(this.#src, n);
  }

  /** `-1` or `1`. */
  sign(): number {
    return sign(this.#src);
  }

  /** An integer built from `n` random bits (up to 53). */
  bits(n: number): number {
    return bits(this.#src, n);
  }

  /** An integer built from `n` random bits, with no width limit. */
  bigBits(n: number): bigint {
    return bigBits(this.#src, n);
  }

  bytes(n: number): Uint8Array {
    return bytes(this.#src, n);
  }

  /** Fill an existing buffer, with no allocation. */
  fillBytes(out: Uint8Array): void {
    fillBytes(this.#src, out);
  }

  /** `n` doubles in `[0, 1)`. */
  floats(n: number): Float64Array {
    return floats(this.#src, n);
  }

  /** `n` integers in `[min, max]`, validated once rather than per element. */
  integers(n: number, min: number, max: number): Float64Array {
    return integers(this.#src, n, min, max);
  }

  /** An endless stream of doubles in `[0, 1)`. */
  *stream(): Generator<number, never, unknown> {
    for (;;) yield random(this.#src);
  }

  // --- collections ---------------------------------------------------------

  /** One element. Throws when the collection is empty. */
  pick<T>(items: Collection<T>): T {
    return pick(this.#src, items);
  }

  /** One element, or `undefined` when the collection is empty. */
  tryPick<T>(items: Collection<T>): T | undefined {
    return tryPick(this.#src, items);
  }

  pickIndex<T>(items: Collection<T>): number {
    return pickIndex(this.#src, items);
  }

  pickKey<K extends string | number | symbol, V>(
    target: Record<K, V> | Map<K, V>
  ): K {
    return pickKey(this.#src, target);
  }

  pickEntry<K extends string | number | symbol, V>(
    target: Record<K, V> | Map<K, V>
  ): [K, V] {
    return pickEntry(this.#src, target);
  }

  /** One value of a plain object or `Map`. */
  pickValue<K extends string | number | symbol, V>(
    target: Record<K, V> | Map<K, V>
  ): V {
    return pickValue(this.#src, target);
  }

  /** Each element kept independently with probability `p`. */
  subset<T>(items: Collection<T>, p: number): T[] {
    return subset(this.#src, items, p);
  }

  /** `count` distinct integers in `[min, max]`, without building the range. */
  sampleIntegers(count: number, min: number, max: number): number[] {
    return sampleIntegers(this.#src, count, min, max);
  }

  /** `k` elements **with** replacement. */
  choices<T>(items: Collection<T>, k: number): T[] {
    return choices(this.#src, items, k);
  }

  /** `k` distinct elements, **without** replacement. */
  sample<T>(items: Collection<T>, k: number): T[] {
    return sample(this.#src, items, k);
  }

  /** `k` distinct elements, kept in their original order. */
  combination<T>(items: Collection<T>, k: number): T[] {
    return combination(this.#src, items, k);
  }

  /** Remove one random element and return it. Mutates the array. */
  takeOut<T>(items: T[]): T {
    return takeOut(this.#src, items);
  }

  /** `k` distinct elements, weightedPick. */
  weightedSample<T>(
    items: Collection<T>,
    weights: ArrayLike<number>,
    k: number
  ): T[] {
    return weightedSample(this.#src, items, weights, k);
  }

  /** `k` elements from an iterable of unknown length, in one pass. */
  reservoir<T>(items: Iterable<T>, k: number): T[] {
    return reservoir(this.#src, items, k);
  }

  /** A shuffled copy. The input is untouched. */
  shuffle<T>(items: Collection<T>): T[] {
    return shuffle(this.#src, items);
  }

  /** Fisher–Yates in place — the only mutating shuffle. */
  shuffleInPlace<T>(items: T[]): T[] {
    return shuffleInPlace(this.#src, items);
  }

  permutation(n: number): number[] {
    return permutation(this.#src, n);
  }

  shuffleString(value: string): string {
    return shuffleString(this.#src, value);
  }

  /** One element, with probability proportional to its weight. */
  weightedPick<T>(items: Collection<T>, weights: ArrayLike<number>): T {
    return weightedPick(this.#src, items, weights);
  }

  /**
   * A reusable weightedPick sampler, O(1) per draw. Build it once when the same
   * weights are sampled repeatedly.
   */
  weightedTable<T>(
    items: Collection<T>,
    weights: ArrayLike<number>
  ): { pick(): T } {
    const table = new AliasTable(items, weights);
    const src = this.#src;
    return { pick: () => table.pick(src) };
  }

  // --- strings -------------------------------------------------------------

  /** A random string over `alphabet` (default alphanumeric). */
  string(length: number, alphabet?: string | ArrayLike<string>): string {
    return randomString(this.#src, length, alphabet);
  }

  /** A random lowercase hexadecimal string. */
  hex(length: number): string {
    return randomHex(this.#src, length);
  }

  /** A uniformly chosen Unicode code point. */
  codePoint(options?: UnicodeOptions | CodePointSet): number {
    return randomCodePoint(this.#src, options);
  }

  /** A uniformly chosen character, as a string of one code point. */
  char(options?: UnicodeOptions | CodePointSet): string {
    return randomChar(this.#src, options);
  }

  /** A random string of `length` code points, not UTF-16 units. */
  chars(length: number, options?: UnicodeOptions | CodePointSet): string {
    return randomChars(this.#src, length, options);
  }
}
