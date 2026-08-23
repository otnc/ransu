import type { Seed, SeedSequence } from "../seed/sequence";
import { ensureNonZero, initialWords, PrngEngine } from "./prng-engine";

/**
 * The sfc32 engine. Build one with {@link sfc32}.
 *
 * @example
 * ```ts
 * sfc32(42) instanceof Sfc32; // true
 * ```
 */
export class Sfc32 extends PrngEngine {
  readonly algorithm = "sfc32";

  nextUint32(): number {
    const s = this.s;
    const a = s[0];
    const b = s[1];
    const c = s[2];

    const t = (((a + b) | 0) + s[3]) | 0;
    s[3] = (s[3] + 1) | 0;
    s[0] = b ^ (b >>> 9);
    s[1] = (c + (c << 3)) | 0;
    s[2] = (((c << 21) | (c >>> 11)) + t) | 0;

    return t >>> 0;
  }

  protected seedFrom(sequence: SeedSequence): this {
    return warmUp(new Sfc32(ensureNonZero(sequence.generateState(4)))) as this;
  }
}

/**
 * The reference implementation discards the first few outputs. Must run on
 * every seeding path, or `sfc32(x)` and `reseed(x)` would diverge.
 */
function warmUp(engine: Sfc32): Sfc32 {
  for (let i = 0; i < 12; i++) engine.nextUint32();
  return engine;
}

/**
 * sfc32 — Small Fast Counting, 128 bits of state.
 *
 * About as fast as anything here and very small. Chosen when speed matters
 * more than a proven period.
 *
 * @example
 * ```ts
 * const source = sfc32(42);
 * source.nextUint32(); // 261194151
 * ```
 */
export function sfc32(seed?: Seed): Sfc32 {
  return warmUp(new Sfc32(ensureNonZero(initialWords(seed, 4))));
}
