import { assertFinite } from "../../internal/assert";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";
import { standardNormal } from "../ziggurat";
import { assertPositive } from "./guards";

export interface NormalOptions extends DistributionOptions {
  mean?: number;
  sd?: number;
}

/**
 * Gaussian, drawn with a ziggurat.
 *
 * @example
 * ```ts
 * const height = normal({ mean: 170, sd: 7 });
 * height.sample();     // 164.28...
 * height.samples(1000); // Float64Array(1000)
 * height.mean;         // 170
 * height.variance;     // 49
 * ```
 */
export function normal(options: NormalOptions = {}): NumberSampler {
  const { mean = 0, sd = 1 } = options;
  assertFinite(mean, "mean");
  assertPositive(sd, "sd");
  const src = resolveSource(options.engine);
  return numberSampler(() => mean + sd * standardNormal(src), mean, sd * sd);
}

export interface LogNormalOptions extends DistributionOptions {
  /** Mean of the underlying normal, not of the log-normal itself. */
  mu?: number;
  /** Standard deviation of the underlying normal. */
  sigma?: number;
}

/**
 * Log-normal: a normal variable exponentiated. `mu` and `sigma` describe the underlying normal, not this distribution.
 *
 * @example
 * ```ts
 * const income = logNormal({ mu: 10, sigma: 0.6 });
 * income.sample(); // 26401.83...
 * ```
 */
export function logNormal(options: LogNormalOptions = {}): NumberSampler {
  const { mu = 0, sigma = 1 } = options;
  assertFinite(mu, "mu");
  assertPositive(sigma, "sigma");
  const src = resolveSource(options.engine);
  const v = sigma * sigma;
  return numberSampler(
    () => Math.exp(mu + sigma * standardNormal(src)),
    Math.exp(mu + v / 2),
    (Math.exp(v) - 1) * Math.exp(2 * mu + v)
  );
}
