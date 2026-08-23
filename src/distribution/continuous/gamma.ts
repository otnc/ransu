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

/**
 * Exponential: the wait until the next event of a Poisson process.
 *
 * @example
 * ```ts
 * const wait = exponential({ rate: 0.5 });
 * wait.sample(); // 3.2188...
 * wait.mean;     // 2, which is 1 / rate
 * ```
 */
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

/**
 * Gamma, by Marsaglia and Tsang's method.
 *
 * @example
 * ```ts
 * const g = gamma({ shape: 2, scale: 10 });
 * g.sample(); // 14.726...
 * ```
 */
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

/**
 * Beta: a value in `(0, 1)`, shaped by two positive parameters.
 *
 * @example
 * ```ts
 * const rate = beta({ alpha: 2, beta: 5 });
 * rate.sample(); // 0.2734...  skewed toward 0
 * rate.mean;     // 0.2857...
 * ```
 */
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

/**
 * Chi-squared with `df` degrees of freedom.
 *
 * @example
 * ```ts
 * chiSquared({ df: 3 }).sample(); // 2.3661...
 * ```
 */
export function chiSquared(options: ChiSquaredOptions): NumberSampler {
  const { df } = options;
  assertPositive(df, "df");
  const src = resolveSource(options.engine);
  return numberSampler(() => standardGamma(src, df / 2) * 2, df, 2 * df);
}

export interface StudentTOptions extends DistributionOptions {
  df: number;
}

/**
 * Student's t: a normal with heavier tails, converging on one as `df` grows.
 *
 * @example
 * ```ts
 * studentT({ df: 5 }).sample(); // -0.8412...
 * ```
 */
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

/**
 * Fisher's F: the ratio of two chi-squared variables over their degrees of freedom. Exported as `fisherF`.
 *
 * @example
 * ```ts
 * fisherF({ d1: 8, d2: 12 }).sample(); // 1.1274...
 * ```
 */
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
