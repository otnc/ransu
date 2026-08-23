import type { Engine, EngineLike } from "./types";

/**
 * Wraps a plain `() => number` in `[0, 1)` as an engine.
 *
 * Anywhere an engine is accepted, a bare function is accepted too and
 * wrapped for you; this is what does the wrapping.
 *
 * @example
 * ```ts
 * import { Random } from "ransu";
 *
 * // The function is adopted automatically.
 * new Random(() => Math.random()).integer(1, 6); // 4
 * ```
 */
export class FunctionEngine implements Engine {
  readonly algorithm = "function";
  readonly seedable = false;

  private readonly fn: () => number;

  constructor(fn: () => number) {
    this.fn = fn;
  }

  nextUint32(): number {
    return (this.fn() * 0x100000000) >>> 0;
  }

  nextFloat64(): number {
    return this.fn();
  }

  clone(): Engine {
    return new FunctionEngine(this.fn);
  }
}

/** Normalise an {@link EngineLike} into a real {@link Engine}. */
export function toEngine(source: EngineLike): Engine {
  return typeof source === "function" ? new FunctionEngine(source) : source;
}
