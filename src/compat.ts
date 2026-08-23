import { FunctionEngine } from "./engine/function-engine";
import type { Engine, EngineLike } from "./engine/types";
import type { Random } from "./random";

/**
 * Adapters for moving between ransu and other generators.
 *
 * `toMathRandom` is the important one: it drops a seeded ransu stream into any
 * library that expects a `Math.random`-shaped function.
 */

/**
 * A `Math.random`-compatible function backed by `source`.
 *
 * For handing a seeded stream to a library that only takes a
 * `Math.random`-shaped function.
 *
 * @example
 * ```ts
 * const rand = toMathRandom(new Random(42));
 * rand(); // 0.3964157...  reproducible
 * ```
 */
export function toMathRandom(source: Random | EngineLike): () => number {
  if (typeof source === "function") return source;
  if (isRandom(source)) return () => source.random();
  const engine = source;
  if (engine.nextFloat64) return engine.nextFloat64.bind(engine);
  return () => {
    const hi = engine.nextUint32();
    const lo = engine.nextUint32();
    return ((hi >>> 5) * 0x4000000 + (lo >>> 6)) / 0x20000000000000;
  };
}

function isRandom(value: object): value is Random {
  return typeof (value as Random).random === "function";
}

/**
 * Adopt any `() => number` in `[0, 1)` as a ransu engine.
 *
 * @example
 * ```ts
 * const source = fromMathRandom(Math.random);
 * new Random(source).integer(1, 6); // 4
 * ```
 */
export function fromMathRandom(fn: () => number): Engine {
  return new FunctionEngine(fn);
}

/** The shape `seedrandom` returns. */
export type SeedrandomLike = () => number;

/**
 * Adopt a `seedrandom` instance.
 *
 * @example
 * ```ts
 * // import seedrandom from "seedrandom";
 * // const engine = fromSeedrandom(seedrandom("hello"));
 * // new Random(engine).pick(["a", "b", "c"]);
 * ```
 */
export function fromSeedrandom(prng: SeedrandomLike): Engine {
  return new FunctionEngine(() => prng());
}

/** The subset of `pure-rand`'s generator interface that ransu needs. */
export interface PureRandLike {
  unsafeNext(): number;
}

/**
 * Adopt a `pure-rand` generator.
 *
 * `unsafeNext` mutates the generator in place, which is the fast path that
 * library offers and the one an engine wants.
 *
 * @example
 * ```ts
 * // import prand from "pure-rand";
 * // const source = fromPureRand(prand.xoroshiro128plus(42));
 * // new Random(source).integer(1, 6);
 * ```
 */
export function fromPureRand(generator: PureRandLike): Engine {
  return {
    algorithm: "pure-rand",
    seedable: false,
    nextUint32: () => generator.unsafeNext() >>> 0,
  };
}
