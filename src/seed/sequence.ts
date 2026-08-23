import { assertLength } from "../internal/assert";
import { raise } from "../internal/errors";
import { SplitMix64 } from "./splitmix";

/** Anything ransu accepts as seed material. */
export type Seed =
  number | bigint | string | ArrayBufferView | readonly number[];

const textEncoder = /* @__PURE__ */ new TextEncoder();

function bytesToWords(bytes: Uint8Array): Uint32Array {
  const words = new Uint32Array(Math.ceil(bytes.length / 4) + 1);
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((i & 3) * 8);
  }
  // Length is folded in so that "ab" and "ab\0" cannot collide.
  words[words.length - 1] = bytes.length;
  return words;
}

function numberToWords(value: number): Uint32Array {
  if (Number.isSafeInteger(value)) {
    const abs = Math.abs(value);
    return Uint32Array.of(
      abs % 0x100000000,
      Math.floor(abs / 0x100000000),
      value < 0 ? 1 : 0
    );
  }
  // Non-integers (and ±Infinity / NaN) are seeded from their IEEE-754 bits.
  const buf = new Float64Array(1);
  buf[0] = value;
  return new Uint32Array(buf.buffer.slice(0));
}

function bigIntToWords(value: bigint): Uint32Array {
  const negative = value < 0n;
  let v = negative ? -value : value;
  const words: number[] = [];
  while (v > 0n) {
    words.push(Number(v & 0xffffffffn));
    v >>= 32n;
  }
  words.push(negative ? 1 : 0);
  return Uint32Array.from(words);
}

/** Normalise any {@link Seed} into raw 32-bit entropy words. */
export function toEntropy(seed: Seed): Uint32Array {
  switch (typeof seed) {
    case "number":
      return numberToWords(seed);
    case "bigint":
      return bigIntToWords(seed);
    case "string":
      return bytesToWords(textEncoder.encode(seed));
    default:
      break;
  }
  if (ArrayBuffer.isView(seed)) {
    const view = seed;
    return bytesToWords(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    );
  }
  if (Array.isArray(seed)) {
    const words = new Uint32Array(seed.length + 1);
    const raw = seed as readonly unknown[];
    for (let i = 0; i < seed.length; i++) {
      const w = raw[i];
      if (typeof w !== "number" || !Number.isFinite(w)) {
        raise(
          "INVALID_ARGUMENT",
          `seed[${i}] must be a finite number, got ${String(w)}.`
        );
      }
      words[i] = w >>> 0;
    }
    words[seed.length] = seed.length;
    return words;
  }
  return raise(
    "INVALID_ARGUMENT",
    `A seed must be a number, bigint, string, TypedArray or number[], got ${typeof seed}.`
  );
}

/**
 * Turns one seed into as many independent, well-mixed seeds as you need.
 *
 * Seeding parallel workers with 1, 2, 3 gives streams that can correlate,
 * because nearby seeds are nearby states. Spawning from a sequence puts each
 * worker somewhere unrelated, and the whole tree still replays from the one
 * root seed.
 *
 * @example
 * ```ts
 * import { Random, SeedSequence } from "ransu";
 *
 * const root = SeedSequence.from(42);
 * const workers = root
 *   .spawn(4)
 *   .map((child) => new Random(child.generateState(4)));
 *
 * workers[0].random(); // independent of workers[1]
 *
 * // The same root always produces the same children.
 * SeedSequence.from(42).spawn(4);
 * ```
 */
export class SeedSequence {
  readonly entropy: Uint32Array;
  readonly spawnKey: Uint32Array;
  private children = 0;

  constructor(
    entropy: Uint32Array,
    spawnKey: Uint32Array = new Uint32Array(0)
  ) {
    this.entropy = entropy;
    this.spawnKey = spawnKey;
  }

  static from(seed: Seed): SeedSequence {
    return new SeedSequence(toEntropy(seed));
  }

  /** Fold entropy and spawn key into a single 64-bit key. */
  private derive(): [number, number] {
    const mixer = new SplitMix64();
    let hi = 0x243f6a88;
    let lo = 0x85a308d3;
    const absorb = (word: number): void => {
      mixer.reseed(hi, (lo ^ word) >>> 0);
      mixer.next();
      hi = mixer.outHi;
      lo = mixer.outLo;
    };
    for (let i = 0; i < this.entropy.length; i++) absorb(this.entropy[i]);
    absorb(0x9e3779b9); // domain separator: entropy | spawn key
    for (let i = 0; i < this.spawnKey.length; i++) absorb(this.spawnKey[i]);
    absorb(this.entropy.length);
    return [hi, lo];
  }

  /** Produce `words` 32-bit words of engine state. */
  generateState(words: number): Uint32Array {
    assertLength(words, "words");
    const [hi, lo] = this.derive();
    const out = new Uint32Array(words);
    new SplitMix64(hi, lo).fill(out);
    return out;
  }

  /**
   * Derive `n` independent child sequences. Successive calls keep counting, so
   * `spawn(2)` twice yields four distinct children.
   */
  spawn(n: number): SeedSequence[] {
    assertLength(n, "n");
    const out: SeedSequence[] = [];
    for (let i = 0; i < n; i++) {
      const key = new Uint32Array(this.spawnKey.length + 1);
      key.set(this.spawnKey);
      key[this.spawnKey.length] = this.children++;
      out.push(new SeedSequence(this.entropy, key));
    }
    return out;
  }
}
