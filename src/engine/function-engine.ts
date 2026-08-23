import type { Engine, EngineLike } from "./types";

/**
 * Adapts a plain `() => number` in `[0, 1)` into an {@link Engine}, so that
 * `Math.random`, `seedrandom` and the like work with every ransu API.
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
