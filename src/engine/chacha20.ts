import type { Seed, SeedSequence } from "../seed/sequence";
import { initialWords, PrngEngine } from "./prng-engine";
import type { EngineState } from "./types";

// ChaCha20 as a reproducible generator: for streams that must be both seeded
// and hard to predict. Not exported as a cryptographic primitive.
// State: key (0-7), counter (8-9), nonce (10-11), block position (12).

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
const POS = 12;

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

function quarterRound(
  x: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number
): void {
  x[a] = x[a] + x[b];
  x[d] = rotl(x[d] ^ x[a], 16);
  x[c] = x[c] + x[d];
  x[b] = rotl(x[b] ^ x[c], 12);
  x[a] = x[a] + x[b];
  x[d] = rotl(x[d] ^ x[a], 8);
  x[c] = x[c] + x[d];
  x[b] = rotl(x[b] ^ x[c], 7);
}

export class ChaCha20 extends PrngEngine {
  readonly algorithm = "chacha20";

  private readonly init = new Uint32Array(16);
  private readonly work = new Uint32Array(16);
  private readonly block = new Uint32Array(16);
  private blockReady = false;

  private makeBlock(): void {
    const s = this.s;
    const init = this.init;
    init[0] = SIGMA[0];
    init[1] = SIGMA[1];
    init[2] = SIGMA[2];
    init[3] = SIGMA[3];
    for (let i = 0; i < 8; i++) init[4 + i] = s[i];
    init[12] = s[8];
    init[13] = s[9];
    init[14] = s[10];
    init[15] = s[11];

    const w = this.work;
    w.set(init);
    for (let i = 0; i < 10; i++) {
      quarterRound(w, 0, 4, 8, 12);
      quarterRound(w, 1, 5, 9, 13);
      quarterRound(w, 2, 6, 10, 14);
      quarterRound(w, 3, 7, 11, 15);
      quarterRound(w, 0, 5, 10, 15);
      quarterRound(w, 1, 6, 11, 12);
      quarterRound(w, 2, 7, 8, 13);
      quarterRound(w, 3, 4, 9, 14);
    }

    const block = this.block;
    for (let i = 0; i < 16; i++) block[i] = w[i] + init[i];
    this.blockReady = true;
  }

  nextUint32(): number {
    const s = this.s;
    if (s[POS] >= 16 || !this.blockReady) {
      if (s[POS] >= 16) {
        s[8] = s[8] + 1;
        if (s[8] === 0) s[9] = s[9] + 1;
        s[POS] = 0;
      }
      this.makeBlock();
    }
    const value = this.block[s[POS]];
    s[POS] = s[POS] + 1;
    return value;
  }

  override setState(state: EngineState): void {
    super.setState(state);
    this.blockReady = false;
  }

  protected seedFrom(sequence: SeedSequence): this {
    return new ChaCha20(seedState(sequence.generateState(12))) as this;
  }
}

function seedState(words: Uint32Array): Uint32Array {
  const s = new Uint32Array(13);
  for (let i = 0; i < 8; i++) s[i] = words[i];
  // Counter starts at zero; the remaining seed words become the nonce.
  s[10] = words[8];
  s[11] = words[9];
  return s;
}

export function chacha20(seed?: Seed): ChaCha20 {
  return new ChaCha20(seedState(initialWords(seed, 12)));
}
