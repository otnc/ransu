import type { Seed, SeedSequence } from "../seed/sequence";
import { initialWords, PrngEngine } from "./prng-engine";

/**
 * The mulberry32 engine. Build one with {@link mulberry32}.
 *
 * @example
 * ```ts
 * mulberry32(42) instanceof Mulberry32; // true
 * ```
 */
export class Mulberry32 extends PrngEngine {
  readonly algorithm = "mulberry32";

  nextUint32(): number {
    const s = this.s;
    s[0] = (s[0] + 0x6d2b79f5) | 0;
    let t = s[0];
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  protected seedFrom(sequence: SeedSequence): this {
    return new Mulberry32(sequence.generateState(1)) as this;
  }
}

/**
 * mulberry32 — 32 bits of state, a dozen lines of arithmetic.
 *
 * The smallest engine here. Its 2^32 period is short enough to matter in a
 * long run, so prefer it only where the state size is the constraint.
 *
 * @example
 * ```ts
 * const source = mulberry32(42);
 * source.nextUint32(); // 2744357186
 * ```
 */
export function mulberry32(seed?: Seed): Mulberry32 {
  return new Mulberry32(initialWords(seed, 1));
}
