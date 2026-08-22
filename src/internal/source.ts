import { cryptoRandom } from "../engines/crypto";
import { toEngine } from "../engines/function-engine";
import type { Engine, EngineLike } from "../engines/types";

/**
 * An engine behind a stable object.
 *
 * The identity matters as much as the interface. Re-seeding swaps the engine
 * **inside** this object rather than handing out a new one, so the call sites in
 * the core functions keep seeing one shape and stay monomorphic. An earlier
 * version replaced the whole object on `seed()`, which made every top-level
 * function about three times slower from that point on.
 */
export class Source {
  engine!: Engine;

  #hasFloat = false;
  #hasBytes = false;

  constructor(engine: EngineLike) {
    this.adopt(engine);
  }

  /** Point at a different engine, keeping this object's identity. */
  adopt(engine: EngineLike): void {
    const resolved = toEngine(engine);
    this.engine = resolved;
    this.#hasFloat = typeof resolved.nextFloat64 === "function";
    this.#hasBytes = typeof resolved.fillBytes === "function";
  }

  /** A uniform integer in `[0, 2^32)`. */
  u32(): number {
    return this.engine.nextUint32();
  }

  /** A uniform double in `[0, 1)` with 53 bits of precision. */
  f64(): number {
    const engine = this.engine;
    if (this.#hasFloat) return (engine.nextFloat64 as () => number)();
    const hi = engine.nextUint32();
    const lo = engine.nextUint32();
    return ((hi >>> 5) * 0x4000000 + (lo >>> 6)) / 0x20000000000000;
  }

  fillBytes(out: Uint8Array): void {
    const engine = this.engine;
    if (this.#hasBytes) {
      (engine.fillBytes as (target: Uint8Array) => void)(out);
      return;
    }
    let i = 0;
    while (i < out.length) {
      let word = engine.nextUint32();
      for (let k = 0; k < 4 && i < out.length; k++) {
        out[i++] = word & 0xff;
        word >>>= 8;
      }
    }
  }
}

export function createSource(engine: EngineLike): Source {
  return new Source(engine);
}

const cache = new WeakMap<object, Source>();

/**
 * A {@link Source} for `engine`, reused across calls. Keying on the engine keeps
 * per-engine state (UUID clocks, for one) tied to the engine that owns it.
 */
export function sourceFor(engine: EngineLike): Source {
  const cached = cache.get(engine);
  if (cached) return cached;
  const source = new Source(engine);
  cache.set(engine, source);
  return source;
}

/**
 * A {@link Source} that falls back to the platform CSPRNG. Identifier APIs use
 * this so they are secure unless the caller opts into a specific engine.
 */
export function secureSourceFor(engine?: EngineLike): Source {
  return sourceFor(engine ?? cryptoRandom);
}
