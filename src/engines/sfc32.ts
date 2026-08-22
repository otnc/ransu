import type { Seed, SeedSequence } from "../seed/sequence";
import { ensureNonZero, initialWords, PrngEngine } from "./prng-engine";

/** sfc32 (Small Fast Counter). Four words of state, very short inner loop. */
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

export function sfc32(seed?: Seed): Sfc32 {
  return warmUp(new Sfc32(ensureNonZero(initialWords(seed, 4))));
}
