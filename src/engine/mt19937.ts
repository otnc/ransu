import type { Seed, SeedSequence } from "../seed/sequence";
import { initialWords, PrngEngine } from "./prng-engine";

// MT19937, kept for interoperability with existing data. Slow to seed, 2.5 KB
// of state, and fails tests the other engines pass: not for new work.
// State: 624 words, then the read index.

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class Mt19937 extends PrngEngine {
  readonly algorithm = "mt19937";

  private generate(): void {
    const mt = this.s;
    for (let i = 0; i < N; i++) {
      const y = (mt[i] & UPPER_MASK) | (mt[(i + 1) % N] & LOWER_MASK);
      mt[i] = mt[(i + M) % N] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    }
    mt[N] = 0;
  }

  nextUint32(): number {
    const mt = this.s;
    if (mt[N] >= N) this.generate();

    let y = mt[mt[N]];
    mt[N] = mt[N] + 1;

    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;

    return y >>> 0;
  }

  protected seedFrom(sequence: SeedSequence): this {
    return new Mt19937(seedByArray(sequence.generateState(8))) as this;
  }
}

function seedByScalar(value: number): Uint32Array {
  const mt = new Uint32Array(N + 1);
  mt[0] = value >>> 0;
  for (let i = 1; i < N; i++) {
    const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
  }
  mt[N] = N;
  return mt;
}

/** The reference `init_by_array`, used so long seeds are not truncated. */
function seedByArray(key: ArrayLike<number>): Uint32Array {
  const mt = seedByScalar(19650218);
  let i = 1;
  let j = 0;

  for (let k = Math.max(N, key.length); k > 0; k--) {
    const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
    i++;
    j++;
    if (i >= N) {
      mt[0] = mt[N - 1];
      i = 1;
    }
    if (j >= key.length) j = 0;
  }

  for (let k = N - 1; k > 0; k--) {
    const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
    i++;
    if (i >= N) {
      mt[0] = mt[N - 1];
      i = 1;
    }
  }

  mt[0] = UPPER_MASK;
  mt[N] = N;
  return mt;
}

export function mt19937(seed?: Seed): Mt19937 {
  return new Mt19937(seedByArray(initialWords(seed, 8)));
}

/** Seed like the reference `init_genrand`, to match another implementation. */
mt19937.withScalarSeed = (value: number): Mt19937 =>
  new Mt19937(seedByScalar(value));

/** Seed exactly like the reference `init_by_array`. */
mt19937.withArraySeed = (key: ArrayLike<number>): Mt19937 =>
  new Mt19937(seedByArray(key));
