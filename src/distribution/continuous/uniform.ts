import { assertFinite, assertOrder } from "../../internal/assert";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";

export interface UniformOptions extends DistributionOptions {
  min?: number;
  max?: number;
}

/**
 * Uniform over `[min, max)`.
 *
 * @example
 * ```ts
 * const u = uniform({ min: -1, max: 1 });
 * u.sample(); // 0.4142...
 * u.mean;     // 0
 * ```
 */
export function uniform(options: UniformOptions = {}): NumberSampler {
  const { min = 0, max = 1 } = options;
  assertFinite(min, "min");
  assertFinite(max, "max");
  assertOrder(min, max, "uniform");
  const src = resolveSource(options.engine);
  const span = max - min;
  return numberSampler(
    () => min + src.f64() * span,
    (min + max) / 2,
    (span * span) / 12
  );
}
