import { assertLength } from "../internal/assert";
import type { Seed, SeedSequence } from "../seed/sequence";
import { ensureNonZero, initialWords, PrngEngine } from "./prng-engine";
import type { Engine } from "./types";

// xoshiro128++ — the default seedable engine. 32-bit only, which is what
// JavaScript is fast at. Period 2^128-1; passes BigCrush.

const JUMP = [0x8764000b, 0xf542d2d3, 0x6fa035c3, 0x77f2db5b];
const LONG_JUMP = [0xb523952e, 0x0b6f099f, 0xccf5a0ef, 0x1c580662];

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * The xoshiro128++ engine. Build one with {@link xoshiro128pp}.
 *
 * Exposed for `instanceof` and for subclassing; the factory is the way to
 * make one.
 *
 * @example
 * ```ts
 * xoshiro128pp(42) instanceof Xoshiro128pp; // true
 * ```
 */
export class Xoshiro128pp extends PrngEngine {
  readonly algorithm = "xoshiro128++";

  nextUint32(): number {
    const s = this.s;
    const s0 = s[0];
    const s1 = s[1];
    const s2 = s[2];
    const s3 = s[3];

    const result = (rotl((s0 + s3) >>> 0, 7) + s0) >>> 0;

    const t = s1 << 9;
    const n2 = s2 ^ s0;
    const n3 = s3 ^ s1;
    s[1] = s1 ^ n2;
    s[0] = s0 ^ n3;
    s[2] = n2 ^ t;
    s[3] = rotl(n3, 11);

    return result;
  }

  private applyPolynomial(poly: number[]): void {
    const s = this.s;
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    for (let i = 0; i < poly.length; i++) {
      for (let b = 0; b < 32; b++) {
        if (poly[i] & (1 << b)) {
          s0 ^= s[0];
          s1 ^= s[1];
          s2 ^= s[2];
          s3 ^= s[3];
        }
        this.nextUint32();
      }
    }
    s[0] = s0;
    s[1] = s1;
    s[2] = s2;
    s[3] = s3;
  }

  /** Equivalent to 2^64 calls to {@link nextUint32}. */
  jump(): void {
    this.applyPolynomial(JUMP);
  }

  /** Equivalent to 2^96 calls to {@link nextUint32}. */
  longJump(): void {
    this.applyPolynomial(LONG_JUMP);
  }

  /** Non-overlapping streams, guaranteed by the jump polynomial. */
  override split(n: number): Engine[] {
    assertLength(n, "n");
    const out: Engine[] = [];
    const cursor = this.clone();
    for (let i = 0; i < n; i++) {
      cursor.jump();
      out.push(cursor.clone());
    }
    return out;
  }

  protected seedFrom(sequence: SeedSequence): this {
    return new Xoshiro128pp(ensureNonZero(sequence.generateState(4))) as this;
  }
}

/**
 * xoshiro128++ — 128 bits of state, the default engine.
 *
 * Fast, small, and passes BigCrush. Its period of 2^128-1 is far more than
 * any single program will draw, but it is not cryptographic: a few outputs
 * are enough to recover the state and predict the rest.
 *
 * @example
 * ```ts
 * const source = xoshiro128pp(42);
 * source.nextUint32(); // 167929222
 *
 * new Random(source).integer(1, 6); // 3
 * ```
 */
export function xoshiro128pp(seed?: Seed): Xoshiro128pp {
  return new Xoshiro128pp(ensureNonZero(initialWords(seed, 4)));
}
