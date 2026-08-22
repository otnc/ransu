import type { Seed, SeedSequence } from "../seed/sequence";
import { initialWords, PrngEngine } from "./prng-engine";

/**
 * mulberry32. One word of state, for when code size dominates. The period is
 * only 2^32, so it suits neither long runs nor many parallel streams.
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

export function mulberry32(seed?: Seed): Mulberry32 {
  return new Mulberry32(initialWords(seed, 1));
}
