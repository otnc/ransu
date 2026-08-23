import { AliasTable } from "../../collections/weighted";
import {
  assertInteger,
  assertOrder,
  assertProbability,
} from "../../internal/assert";
import { bounded } from "../../numbers/integer";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";

export interface BernoulliOptions extends DistributionOptions {
  p?: number;
}

/** `1` with probability `p`, otherwise `0`. */
export function bernoulli(options: BernoulliOptions = {}): NumberSampler {
  const { p = 0.5 } = options;
  assertProbability(p, "p");
  const src = resolveSource(options.engine);
  return numberSampler(() => (src.f64() < p ? 1 : 0), p, p * (1 - p));
}

export interface DiscreteUniformOptions extends DistributionOptions {
  min: number;
  max: number;
}

/** Uniform over the integers in `[min, max]`, both ends included. */
export function discreteUniform(
  options: DiscreteUniformOptions
): NumberSampler {
  const { min, max } = options;
  assertInteger(min, "min");
  assertInteger(max, "max");
  assertOrder(min, max, "discreteUniform");
  const src = resolveSource(options.engine);
  const size = max - min + 1;
  return numberSampler(
    () => min + bounded(src, size),
    (min + max) / 2,
    (size * size - 1) / 12
  );
}

export interface CategoricalOptions extends DistributionOptions {
  /** Relative weights. They need not sum to 1. */
  weights: ArrayLike<number>;
}

/** An index in `[0, weights.length)`, drawn in O(1) via the alias method. */
export function categorical(options: CategoricalOptions): NumberSampler {
  const { weights } = options;
  const src = resolveSource(options.engine);
  const indices = Array.from({ length: weights.length }, (_, i) => i);
  const table = new AliasTable(indices, weights);

  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  let mean = 0;
  for (let i = 0; i < weights.length; i++) mean += (i * weights[i]) / total;
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    variance += ((i - mean) ** 2 * weights[i]) / total;
  }

  return numberSampler(() => table.pick(src), mean, variance);
}
