import * as collections from "./collections/index";
import type { Collection } from "./collections/pick";
import { xoshiro128pp } from "./engine/xoshiro128pp";
import { assertLength, assertProbability } from "./internal/assert";
import { createSource, type Source } from "./internal/source";
import { integer } from "./numbers/integer";
import { Random } from "./random";
import { type Seed, SeedSequence, toEntropy } from "./seed/sequence";

/**
 * Randomness derived from a key rather than from a stream.
 *
 * The same key always gives the same answer, on every machine and every run,
 * with no shared state to keep in sync. That is what A/B assignment, sharding
 * and per-user variation actually need — a seeded generator would drift as soon
 * as two processes drew a different number of values.
 */

function sourceFor(key: Seed, salt?: Seed): Source {
  const entropy = toEntropy(key);
  if (salt === undefined) return createSource(xoshiro128pp(entropy));

  const saltWords = toEntropy(salt);
  const combined = new Uint32Array(entropy.length + saltWords.length);
  combined.set(entropy);
  combined.set(saltWords, entropy.length);
  return createSource(xoshiro128pp(combined));
}

/**
 * A stable double in `[0, 1)` for `key`.
 *
 * @example
 * ```ts
 * hashFloat("user-42");                 // 0.6031...  always this value
 * hashFloat("user-42", "experiment-b"); // 0.1187...  a different salt, a different answer
 * ```
 */
export function hashFloat(key: Seed, salt?: Seed): number {
  return sourceFor(key, salt).f64();
}

/**
 * A stable integer in `[min, max]` for `key`.
 *
 * @example
 * ```ts
 * hashInteger("user-42", 1, 6); // 3, on every machine and every run
 * ```
 */
export function hashInteger(
  key: Seed,
  min: number,
  max: number,
  salt?: Seed
): number {
  return integer(sourceFor(key, salt), min, max);
}

/**
 * A stable choice from `items` for `key`.
 *
 * @example
 * ```ts
 * hashPick("user-42", ["control", "blue", "green"]); // "blue"
 * ```
 */
export function hashPick<T>(key: Seed, items: Collection<T>, salt?: Seed): T {
  return collections.pick(sourceFor(key, salt), items);
}

/**
 * A stable bucket in `[0, buckets)` for `key`. Evenly spread across keys.
 *
 * @example
 * ```ts
 * bucket("user-42", 16); // 11, the shard this user always lands in
 * ```
 */
export function bucket(key: Seed, buckets: number, salt?: Seed): number {
  assertLength(buckets, "buckets");
  return integer(sourceFor(key, salt), 0, buckets - 1);
}

/**
 * Whether `key` falls inside a `percent` rollout, where `percent` is a fraction
 * in `[0, 1]`. Growing the percentage only ever adds keys, never moves one out.
 *
 * @example
 * ```ts
 * rollout("user-42", 0.1);  // false, not in the first 10%
 * rollout("user-42", 0.5);  // true, and it stays true as the rollout widens
 * ```
 */
export function rollout(key: Seed, percent: number, salt?: Seed): boolean {
  assertProbability(percent, "percent");
  return hashFloat(key, salt) < percent;
}

/**
 * A whole {@link Random} seeded from `key`, when one value is not enough.
 *
 * @example
 * ```ts
 * const rng = hashRandom("user-42");
 * rng.integer(1, 6);            // 5
 * rng.pick(["red", "blue"]);    // "blue"
 * // Same key, same sequence, in any process.
 * ```
 */
export function hashRandom(key: Seed, salt?: Seed): Random {
  const sequence =
    salt === undefined
      ? SeedSequence.from(key)
      : new SeedSequence(toEntropy(key), toEntropy(salt));
  return new Random(xoshiro128pp(sequence.generateState(4)));
}
