import { fillSecure } from "../internal/csprng";
import type { Engine } from "./types";

// The platform CSPRNG, behind `ransu/secure` and every identifier API. Cannot
// be seeded, and throws NO_CRYPTO rather than silently degrading.

const POOL_WORDS = 256;

/**
 * The platform CSPRNG behind the engine interface. The singleton
 * {@link cryptoRandom} is the only instance you need.
 *
 * @example
 * ```ts
 * cryptoRandom instanceof CryptoEngine; // true
 * ```
 */
export class CryptoEngine implements Engine {
  readonly algorithm = "crypto";
  readonly seedable = false;

  private readonly pool = new Uint32Array(POOL_WORDS);
  private readonly poolBytes = new Uint8Array(this.pool.buffer);
  private offset = POOL_WORDS;

  nextUint32(): number {
    if (this.offset >= POOL_WORDS) {
      fillSecure(this.poolBytes, "The crypto engine");
      this.offset = 0;
    }
    return this.pool[this.offset++];
  }

  nextFloat64(): number {
    const hi = this.nextUint32();
    const lo = this.nextUint32();
    return ((hi >>> 5) * 0x4000000 + (lo >>> 6)) / 0x20000000000000;
  }

  fillUint32(out: Uint32Array): void {
    fillSecure(
      new Uint8Array(out.buffer, out.byteOffset, out.byteLength),
      "The crypto engine"
    );
  }

  fillBytes(out: Uint8Array): void {
    fillSecure(out, "The crypto engine");
  }

  clone(): Engine {
    return this;
  }
}

/**
 * The platform CSPRNG, wrapped as an engine.
 *
 * `crypto.getRandomValues` in browsers, workers and edge runtimes;
 * `node:crypto` on Node. Unpredictable, and for that reason not seedable —
 * which is what backs `ransu/secure` and the identifier functions.
 *
 * @example
 * ```ts
 * cryptoRandom.nextUint32(); // unpredictable
 * cryptoRandom.seedable;     // false
 *
 * new Random(cryptoRandom).pick(["a", "b", "c"]);
 * ```
 */
export const cryptoRandom: CryptoEngine = /* @__PURE__ */ new CryptoEngine();
