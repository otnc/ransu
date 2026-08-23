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

/** Gaussian, drawn with a ziggurat. */
export function normal(options: NormalOptions = {}): NumberSampler {
  const { mean = 0, sd = 1 } = options;
  assertFinite(mean, "mean");
  assertPositive(sd, "sd");
  const src = resolveSource(options.engine);
  return numberSampler(() => mean + sd * standardNormal(src), mean, sd * sd);
}

export { normal as gaussian };

export interface LogNormalOptions extends DistributionOptions {
  /** Mean of the underlying normal, not of the log-normal itself. */
  mu?: number;
  /** Standard deviation of the underlying normal. */
  sigma?: number;
}

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
