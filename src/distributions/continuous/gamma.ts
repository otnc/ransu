import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";
import {
  standardExponential,
  standardGamma,
  standardNormal,
} from "../ziggurat";
import { assertPositive } from "./guards";

export interface ExponentialOptions extends DistributionOptions {
  rate?: number;
}

export function exponential(options: ExponentialOptions = {}): NumberSampler {
  const { rate = 1 } = options;
  assertPositive(rate, "rate");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => standardExponential(src) / rate,
    1 / rate,
    1 / (rate * rate)
  );
}

export interface GammaOptions extends DistributionOptions {
  shape: number;
  scale?: number;
}

export function gamma(options: GammaOptions): NumberSampler {
  const { shape, scale = 1 } = options;
  assertPositive(shape, "shape");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => standardGamma(src, shape) * scale,
    shape * scale,
    shape * scale * scale
  );
}

export interface BetaOptions extends DistributionOptions {
  alpha: number;
  beta: number;
}

export function beta(options: BetaOptions): NumberSampler {
  const { alpha, beta: b } = options;
  assertPositive(alpha, "alpha");
  assertPositive(b, "beta");
  const src = resolveSource(options.engine);
  const total = alpha + b;
  return numberSampler(
    () => {
      const x = standardGamma(src, alpha);
      const y = standardGamma(src, b);
      return x / (x + y);
    },
    alpha / total,
    (alpha * b) / (total * total * (total + 1))
  );
}

export interface ChiSquaredOptions extends DistributionOptions {
  df: number;
}

export function chiSquared(options: ChiSquaredOptions): NumberSampler {
  const { df } = options;
  assertPositive(df, "df");
  const src = resolveSource(options.engine);
  return numberSampler(() => standardGamma(src, df / 2) * 2, df, 2 * df);
}

export interface StudentTOptions extends DistributionOptions {
  df: number;
}

export function studentT(options: StudentTOptions): NumberSampler {
  const { df } = options;
  assertPositive(df, "df");
  const src = resolveSource(options.engine);
  return numberSampler(
    () =>
      standardNormal(src) / Math.sqrt((standardGamma(src, df / 2) * 2) / df),
    df > 1 ? 0 : Number.NaN,
    df > 2 ? df / (df - 2) : Number.POSITIVE_INFINITY
  );
}

export interface FOptions extends DistributionOptions {
  d1: number;
  d2: number;
}

export function f(options: FOptions): NumberSampler {
  const { d1, d2 } = options;
  assertPositive(d1, "d1");
  assertPositive(d2, "d2");
  const src = resolveSource(options.engine);
  return numberSampler(
    () =>
      (standardGamma(src, d1 / 2) * 2) /
      d1 /
      ((standardGamma(src, d2 / 2) * 2) / d2),
    d2 > 2 ? d2 / (d2 - 2) : Number.NaN,
    d2 > 4
      ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) * (d2 - 2) * (d2 - 4))
      : Number.NaN
  );
}
