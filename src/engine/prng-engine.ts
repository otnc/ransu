import { seedEntropy } from "../internal/csprng";
import { raise } from "../internal/errors";
import type { Seed } from "../seed/sequence";
import { SeedSequence } from "../seed/sequence";
import type { Engine, EngineState } from "./types";

/** Seed words for a new engine: platform entropy, or a mixed user seed. */
export function initialWords(
  seed: Seed | undefined,
  words: number
): Uint32Array {
  return seed === undefined
    ? seedEntropy(words)
    : SeedSequence.from(seed).generateState(words);
}

/** Guarantee a non-zero state, which xorshift-family engines require. */
export function ensureNonZero(state: Uint32Array): Uint32Array {
  for (let i = 0; i < state.length; i++) {
    if (state[i] !== 0) return state;
  }
  state[0] = 0x9e3779b9;
  return state;
}

/**
 * The base class the seedable engines share.
 *
 * It provides seeding, state save and restore, and the byte and float paths
 * built on `nextUint32`. Subclass it to add an algorithm of your own; a
 * subclass implements the state layout and one step of the generator.
 *
 * @example
 * ```ts
 * xoshiro128pp(42) instanceof PrngEngine; // true
 * pcg32(42) instanceof PrngEngine;        // true
 *
 * // Not seedable, so not one of these.
 * cryptoRandom instanceof PrngEngine;     // false
 * ```
 */
export abstract class PrngEngine implements Engine {
  abstract readonly algorithm: string;
  readonly version: number = 1;
  readonly seedable = true;

  protected readonly s: Uint32Array;

  constructor(state: Uint32Array) {
    this.s = state;
  }

  abstract nextUint32(): number;

  nextFloat64(): number {
    const hi = this.nextUint32();
    const lo = this.nextUint32();
    return ((hi >>> 5) * 0x4000000 + (lo >>> 6)) / 0x20000000000000;
  }

  fillUint32(out: Uint32Array): void {
    for (let i = 0; i < out.length; i++) out[i] = this.nextUint32();
  }

  fillBytes(out: Uint8Array): void {
    const whole = out.length >> 2;
    for (let i = 0; i < whole; i++) {
      const w = this.nextUint32();
      const j = i << 2;
      out[j] = w & 0xff;
      out[j + 1] = (w >>> 8) & 0xff;
      out[j + 2] = (w >>> 16) & 0xff;
      out[j + 3] = (w >>> 24) & 0xff;
    }
    let rest = out.length & 3;
    if (rest > 0) {
      let w = this.nextUint32();
      let j = whole << 2;
      while (rest-- > 0) {
        out[j++] = w & 0xff;
        w >>>= 8;
      }
    }
  }

  getState(): EngineState {
    return {
      algorithm: this.algorithm,
      version: this.version,
      data: Array.from(this.s),
    };
  }

  setState(state: EngineState): void {
    if (state.algorithm !== this.algorithm || state.version !== this.version) {
      raise(
        "STATE_MISMATCH",
        `This state belongs to ${state.algorithm}@${state.version}, but the engine is ` +
          `${this.algorithm}@${this.version}. Restore it into a matching engine.`
      );
    }
    if (state.data.length !== this.s.length) {
      raise(
        "STATE_MISMATCH",
        `${this.algorithm} expects ${this.s.length} state words, got ${state.data.length}.`
      );
    }
    this.s.set(state.data);
  }

  clone(): this {
    const Ctor = this.constructor as new (state: Uint32Array) => this;
    return new Ctor(Uint32Array.from(this.s));
  }

  /** Build a sibling engine from derived seed material. */
  protected abstract seedFrom(sequence: SeedSequence): this;

  /** Restart from new seed material, in place. */
  reseed(seed: Seed): void {
    // Via setState, so engines caching derived data can invalidate it.
    this.setState(this.seedFrom(SeedSequence.from(seed)).getState());
  }

  /**
   * Independent children. Engines with a jump polynomial override this for
   * guaranteed non-overlapping streams.
   */
  split(n: number): Engine[] {
    const seq = new SeedSequence(Uint32Array.from(this.s));
    return seq.spawn(n).map((child) => this.seedFrom(child));
  }
}
