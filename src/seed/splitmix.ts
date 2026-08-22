import { add64, mul64, R, shr64 } from "../internal/u64";

// SplitMix64. Not a user-facing engine: it turns arbitrary seed material into
// well-distributed state, so that nearby seeds give uncorrelated streams.

// 0x9E3779B97F4A7C15
const GAMMA_HI = 0x9e3779b9;
const GAMMA_LO = 0x7f4a7c15;
// 0xBF58476D1CE4E5B9
const MIX1_HI = 0xbf58476d;
const MIX1_LO = 0x1ce4e5b9;
// 0x94D049BB133111EB
const MIX2_HI = 0x94d049bb;
const MIX2_LO = 0x133111eb;

export class SplitMix64 {
  private hi: number;
  private lo: number;

  /** High word of the most recent 64-bit output. */
  outHi = 0;
  /** Low word of the most recent 64-bit output. */
  outLo = 0;

  constructor(seedHi = 0, seedLo = 0) {
    this.hi = seedHi >>> 0;
    this.lo = seedLo >>> 0;
  }

  /** Reuse this instance with a fresh state, avoiding an allocation per mix. */
  reseed(seedHi: number, seedLo: number): void {
    this.hi = seedHi >>> 0;
    this.lo = seedLo >>> 0;
  }

  /** Advance the generator; the 64-bit result lands in `outHi`/`outLo`. */
  next(): void {
    add64(this.hi, this.lo, GAMMA_HI, GAMMA_LO);
    this.hi = R[0];
    this.lo = R[1];

    let zHi = this.hi;
    let zLo = this.lo;

    shr64(zHi, zLo, 30);
    mul64(zHi ^ R[0], zLo ^ R[1], MIX1_HI, MIX1_LO);
    zHi = R[0];
    zLo = R[1];

    shr64(zHi, zLo, 27);
    mul64(zHi ^ R[0], zLo ^ R[1], MIX2_HI, MIX2_LO);
    zHi = R[0];
    zLo = R[1];

    shr64(zHi, zLo, 31);
    this.outHi = (zHi ^ R[0]) >>> 0;
    this.outLo = (zLo ^ R[1]) >>> 0;
  }

  /** One 32-bit word. Consumes half of a 64-bit output; the other half is dropped. */
  nextUint32(): number {
    this.next();
    return this.outLo;
  }

  /** Fill `out` with successive 32-bit words (low word first). */
  fill(out: Uint32Array): void {
    for (let i = 0; i < out.length; i += 2) {
      this.next();
      out[i] = this.outLo;
      if (i + 1 < out.length) out[i + 1] = this.outHi;
    }
  }
}
