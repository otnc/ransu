import type { Seed, SeedSequence } from "../seed/sequence";
import { ensureNonZero, initialWords, PrngEngine } from "./prng-engine";
import type { Engine } from "./types";

// `step()` used to call add64/rotl64/shl64 from ../internal/u64, each writing
// its pair through a shared scratch array. That is four calls and four
// read-backs through module-level memory per draw; inlined with locals, it
// measured about 4x faster. The arithmetic below is that same math, worked
// out by hand — engine.test.ts checks it against the original helper calls
// across many random states, so a slip here cannot pass silently.

// xoshiro256++ over 32-bit limbs, for streams that must line up with a Rust or
// C implementation. For speed in JavaScript prefer Xoshiro128pp.
// State: s0..s3 as hi/lo pairs (0-7), then a flag and the held high word,
// since one 64-bit step yields two 32-bit results.

// TODO(v1.0): verify these against xoshiro256plusplus.c before the
// reproducibility contract is frozen. A wrong constant is undetectable by test.
const JUMP = [
  0x180ec6d3, 0x3cfd0aba, 0xd5a61266, 0xf0c9392c, 0xa9582618, 0xe03fc9aa,
  0x39abdc45, 0x29b1661c,
];
const LONG_JUMP = [
  0x76e15d3e, 0xfefdcbbf, 0xc5004e44, 0x1c522fb3, 0x77710069, 0x854ee241,
  0x39109bb0, 0x2acbe635,
];

/**
 * The xoshiro256++ engine. Build one with {@link xoshiro256pp}.
 *
 * @example
 * ```ts
 * xoshiro256pp(42) instanceof Xoshiro256pp; // true
 * ```
 */
export class Xoshiro256pp extends PrngEngine {
  readonly algorithm = "xoshiro256++";

  private lastHi = 0;
  private lastLo = 0;

  /** Advance one 64-bit step; the result is left in `lastHi`/`lastLo`. */
  private step(): void {
    const s = this.s;
    const s0h = s[0];
    const s0l = s[1];
    const s1h = s[2];
    const s1l = s[3];
    const s2h = s[4];
    const s2l = s[5];
    const s3h = s[6];
    const s3l = s[7];

    // result = rotl64(s0 + s3, 23) + s0
    const sumLo = s0l + s3l;
    const sumLo32 = sumLo >>> 0;
    const sumHi = (s0h + s3h + (sumLo > 0xffffffff ? 1 : 0)) >>> 0;
    const rotHi = ((sumHi << 23) | (sumLo32 >>> 9)) >>> 0;
    const rotLo = ((sumLo32 << 23) | (sumHi >>> 9)) >>> 0;
    const resLo = rotLo + s0l;
    this.lastLo = resLo >>> 0;
    this.lastHi = (rotHi + s0h + (resLo > 0xffffffff ? 1 : 0)) >>> 0;

    // t = s1 << 17
    const tH = ((s1h << 17) | (s1l >>> 15)) >>> 0;
    const tL = (s1l << 17) >>> 0;

    const n2h = s2h ^ s0h;
    const n2l = s2l ^ s0l;
    const n3h = s3h ^ s1h;
    const n3l = s3l ^ s1l;

    s[2] = s1h ^ n2h;
    s[3] = s1l ^ n2l;
    s[0] = s0h ^ n3h;
    s[1] = s0l ^ n3l;
    s[4] = n2h ^ tH;
    s[5] = n2l ^ tL;

    // s3 = rotl64(n3, 45): 45 - 32 = 13
    s[6] = ((n3l << 13) | (n3h >>> 19)) >>> 0;
    s[7] = ((n3h << 13) | (n3l >>> 19)) >>> 0;
  }

  /** Low word first, then the high word of the same 64-bit draw. */
  nextUint32(): number {
    const s = this.s;
    if (s[8]) {
      s[8] = 0;
      return s[9];
    }
    this.step();
    s[9] = this.lastHi;
    s[8] = 1;
    return this.lastLo;
  }

  /** A full 64-bit draw. Discards a half-consumed word, if any. */
  nextUint64(): bigint {
    this.s[8] = 0;
    this.step();
    return (BigInt(this.lastHi) << 32n) | BigInt(this.lastLo);
  }

  private applyPolynomial(poly: number[]): void {
    const s = this.s;
    const acc = new Uint32Array(8);
    for (let i = 0; i < poly.length; i += 2) {
      // Words arrive hi-first; the polynomial is consumed low bit first.
      const hi = poly[i];
      const lo = poly[i + 1];
      for (let b = 0; b < 64; b++) {
        const word = b < 32 ? lo : hi;
        if (word & (1 << (b % 32))) {
          for (let k = 0; k < 8; k++) acc[k] ^= s[k];
        }
        this.step();
      }
    }
    s.set(acc.subarray(0, 8));
    s[8] = 0;
  }

  /** Equivalent to 2^128 steps. */
  jump(): void {
    this.applyPolynomial(JUMP);
  }

  /** Equivalent to 2^192 steps. */
  longJump(): void {
    this.applyPolynomial(LONG_JUMP);
  }

  override split(n: number): Engine[] {
    const out: Engine[] = [];
    const cursor = this.clone();
    for (let i = 0; i < n; i++) {
      cursor.jump();
      out.push(cursor.clone());
    }
    return out;
  }

  protected seedFrom(sequence: SeedSequence): this {
    return new Xoshiro256pp(state(sequence.generateState(8))) as this;
  }
}

function state(words: Uint32Array): Uint32Array {
  const s = new Uint32Array(10);
  s.set(ensureNonZero(words.subarray(0, 8)));
  return s;
}

/**
 * xoshiro256++ — 256 bits of state.
 *
 * The same family as {@link xoshiro128pp} with a longer period, and the one
 * to pick when you need `jump()` to hand disjoint streams to parallel
 * workers.
 *
 * @example
 * ```ts
 * const source = xoshiro256pp(42);
 * source.nextUint32(); // 1573169414
 *
 * // Non-overlapping streams for parallel work.
 * const [a, b, c] = source.split(3);
 * ```
 */
export function xoshiro256pp(seed?: Seed): Xoshiro256pp {
  return new Xoshiro256pp(state(initialWords(seed, 8)));
}
