import { chacha20 } from "./chacha20";
import { cryptoRandom } from "./crypto";
import { mt19937 } from "./mt19937";
import { mulberry32 } from "./mulberry32";
import { nativeMath } from "./native";
import { pcg32 } from "./pcg32";
import { sfc32 } from "./sfc32";
import { xoshiro128pp } from "./xoshiro128pp";
import { xoshiro256pp } from "./xoshiro256pp";

export { ChaCha20, chacha20 } from "./chacha20";
export { CryptoEngine, cryptoRandom } from "./crypto";
export { FunctionEngine } from "./function-engine";
export { Mt19937, mt19937 } from "./mt19937";
export { Mulberry32, mulberry32 } from "./mulberry32";
export { NativeMathEngine, nativeMath } from "./native";
export { Pcg32, pcg32 } from "./pcg32";
export { PrngEngine } from "./prng-engine";
export { Sfc32, sfc32 } from "./sfc32";
export type { Engine, EngineFactory, EngineLike, EngineState } from "./types";
export { Xoshiro128pp, xoshiro128pp } from "./xoshiro128pp";
export { Xoshiro256pp, xoshiro256pp } from "./xoshiro256pp";

/**
 * Every engine ransu ships, as seedable factories.
 *
 * @example
 * ```ts
 * // Pick one for a Random, or for the global stream.
 * new Random(42, { engine: engines.pcg32 });
 *
 * // Or build one directly and hand it around.
 * const source = engines.xoshiro256pp(42);
 * source.nextUint32(); // 1573169414
 *
 * engines.mt19937(42);     // for reproducing another language's stream
 * engines.chacha20(42);    // cryptographic, and still reproducible
 * engines.cryptoRandom;    // the platform CSPRNG, not seedable
 * engines.nativeMath;      // Math.random, not seedable
 * ```
 */
export const engines = {
  xoshiro128pp,
  xoshiro256pp,
  pcg32,
  sfc32,
  mulberry32,
  mt19937,
  chacha20,
  nativeMath,
  cryptoRandom,
} as const;
