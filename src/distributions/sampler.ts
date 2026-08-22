import type { EngineLike } from "../engines/types";
import { globalSource } from "../global/instance";
import { assertLength } from "../internal/assert";
import { type Source, sourceFor } from "../internal/source";

/** Every distribution accepts an engine, defaulting to the global instance. */
export interface DistributionOptions {
  engine?: EngineLike;
}

/** A reusable draw from one distribution. */
export interface Sampler<T> {
  sample(): T;
  samples(n: number): T[];
}

/** The numeric case, which knows its own moments and fills a typed array. */
export interface NumberSampler {
  sample(): number;
  samples(n: number): Float64Array;
  /** Population mean, or `NaN` where it is undefined (Cauchy, for example). */
  readonly mean: number;
  /** Population variance, or `NaN`/`Infinity` where it is undefined. */
  readonly variance: number;
}

export function resolveSource(engine?: EngineLike): Source {
  return engine === undefined ? globalSource() : sourceFor(engine);
}

export function numberSampler(
  draw: () => number,
  mean: number,
  variance: number
): NumberSampler {
  return {
    sample: draw,
    samples(n: number): Float64Array {
      assertLength(n, "n");
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = draw();
      return out;
    },
    mean,
    variance,
  };
}

export function listSampler<T>(draw: () => T): Sampler<T> {
  return {
    sample: draw,
    samples(n: number): T[] {
      assertLength(n, "n");
      const out = new Array<T>(n);
      for (let i = 0; i < n; i++) out[i] = draw();
      return out;
    },
  };
}

/** A double in `(0, 1)`. Logarithms and reciprocals cannot take the endpoints. */
export function open(src: Source): number {
  let u = src.f64();
  while (u === 0) u = src.f64();
  return u;
}
