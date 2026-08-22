import { add64, mul64, R, shr64 } from "../internal/u64";
import type { Seed, SeedSequence } from "../seed/sequence";
import { initialWords, PrngEngine } from "./prng-engine";

// PCG32 (pcg_setseq_64_xsh_rr_32). Chosen over xoshiro when `advance` matters:
// an LCG can skip N draws in O(log N).
// State: `state` hi/lo (words 0-1), `inc` hi/lo (words 2-3).

// 6364136223846793005
const MULT_HI = 0x5851f42d;
const MULT_LO = 0x4c957f2d;
const MULT = 0x5851f42d4c957f2dn;
const MASK64 = (1n << 64n) - 1n;

export class Pcg32 extends PrngEngine {
  readonly algorithm = "pcg32";

  nextUint32(): number {
    const s = this.s;
    const oldHi = s[0];
    const oldLo = s[1];

    mul64(oldHi, oldLo, MULT_HI, MULT_LO);
    add64(R[0], R[1], s[2], s[3]);
    s[0] = R[0];
    s[1] = R[1];

    shr64(oldHi, oldLo, 18);
    shr64(R[0] ^ oldHi, R[1] ^ oldLo, 27);
    const xorshifted = R[1];
    const rot = oldHi >>> 27;

    return ((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0;
  }

  private get state64(): bigint {
    return ((BigInt(this.s[0]) << 32n) | BigInt(this.s[1])) & MASK64;
  }

  private get inc64(): bigint {
    return ((BigInt(this.s[2]) << 32n) | BigInt(this.s[3])) & MASK64;
  }

  private setState64(value: bigint): void {
    const v = value & MASK64;
    this.s[0] = Number(v >> 32n);
    this.s[1] = Number(v & 0xffffffffn);
  }

  /**
   * Skip `delta` draws, or rewind with a negative value, in O(log delta).
   * BigInt is fine here: cold path, unlike {@link nextUint32}.
   */
  advance(delta: number | bigint): void {
    let d = BigInt(delta) & MASK64;
    let accMult = 1n;
    let accPlus = 0n;
    let curMult = MULT;
    let curPlus = this.inc64;

    while (d > 0n) {
      if (d & 1n) {
        accMult = (accMult * curMult) & MASK64;
        accPlus = (accPlus * curMult + curPlus) & MASK64;
      }
      curPlus = ((curMult + 1n) * curPlus) & MASK64;
      curMult = (curMult * curMult) & MASK64;
      d >>= 1n;
    }

    this.setState64(accMult * this.state64 + accPlus);
  }

  /** Skip 2^32 draws. */
  jump(): void {
    this.advance(1n << 32n);
  }

  protected seedFrom(sequence: SeedSequence): this {
    return new Pcg32(seedState(sequence.generateState(4))) as this;
  }
}

/** The reference `pcg32_srandom_r` bootstrap, in BigInt for clarity. */
function seedState(words: Uint32Array): Uint32Array {
  const initState = ((BigInt(words[0]) << 32n) | BigInt(words[1])) & MASK64;
  const initSeq = ((BigInt(words[2]) << 32n) | BigInt(words[3])) & MASK64;
  const inc = ((initSeq << 1n) | 1n) & MASK64;

  let state = 0n;
  state = (state * MULT + inc) & MASK64;
  state = (state + initState) & MASK64;
  state = (state * MULT + inc) & MASK64;

  return Uint32Array.of(
    Number(state >> 32n),
    Number(state & 0xffffffffn),
    Number(inc >> 32n),
    Number(inc & 0xffffffffn)
  );
}

export function pcg32(seed?: Seed): Pcg32 {
  return new Pcg32(seedState(initialWords(seed, 4)));
}
