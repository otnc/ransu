import type { Engine } from "./types";

/**
 * `Math.random` behind the engine interface. The singleton
 * {@link nativeMath} is the only instance you need.
 *
 * @example
 * ```ts
 * nativeMath instanceof NativeMathEngine; // true
 * ```
 */
export class NativeMathEngine implements Engine {
  readonly algorithm = "native-math";
  readonly seedable = false;

  nextUint32(): number {
    return (Math.random() * 0x100000000) >>> 0;
  }

  nextFloat64(): number {
    return Math.random();
  }

  fillUint32(out: Uint32Array): void {
    for (let i = 0; i < out.length; i++)
      out[i] = (Math.random() * 0x100000000) >>> 0;
  }

  fillBytes(out: Uint8Array): void {
    let i = 0;
    while (i < out.length) {
      let word = (Math.random() * 0x100000000) >>> 0;
      for (let k = 0; k < 4 && i < out.length; k++) {
        out[i++] = word & 0xff;
        word >>>= 8;
      }
    }
  }

  /** Stateless: every copy behaves identically. */
  clone(): Engine {
    return this;
  }
}

/**
 * `Math.random`, wrapped as an engine.
 *
 * Not seedable and not reproducible: the host owns the state. This is what
 * the global functions draw from until you call `seed()`.
 *
 * @example
 * ```ts
 * nativeMath.nextUint32();  // 2166136261
 * nativeMath.seedable;      // false
 * ```
 */
export const nativeMath: NativeMathEngine =
  /* @__PURE__ */ new NativeMathEngine();
