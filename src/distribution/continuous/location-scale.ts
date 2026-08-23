import { assertFinite, assertOrder } from "../../internal/assert";
import { raise } from "../../internal/errors";
import { logGamma } from "../gamma-function";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  open,
  resolveSource,
} from "../sampler";
import { standardExponential } from "../ziggurat";
import { assertPositive } from "./guards";

export interface LocationScaleOptions extends DistributionOptions {
  location?: number;
  scale?: number;
}

/**
 * Cauchy. It has no mean or variance, so both read `NaN` and extreme outliers are normal.
 *
 * @example
 * ```ts
 * const c = cauchy({ location: 0, scale: 1 });
 * c.sample(); // -0.4142...  and occasionally enormous
 * c.mean;     // NaN
 * ```
 */
export function cauchy(options: LocationScaleOptions = {}): NumberSampler {
  const { location = 0, scale = 1 } = options;
  assertFinite(location, "location");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => location + scale * Math.tan(Math.PI * (src.f64() - 0.5)),
    Number.NaN,
    Number.NaN
  );
}

/**
 * Laplace: two exponential tails back to back.
 *
 * @example
 * ```ts
 * laplace({ location: 0, scale: 1 }).sample(); // 0.3819...
 * ```
 */
export function laplace(options: LocationScaleOptions = {}): NumberSampler {
  const { location = 0, scale = 1 } = options;
  assertFinite(location, "location");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => {
      const u = src.f64() - 0.5;
      return location - scale * Math.sign(u) * Math.log1p(-2 * Math.abs(u));
    },
    location,
    2 * scale * scale
  );
}

/**
 * Logistic, the distribution behind the sigmoid.
 *
 * @example
 * ```ts
 * logistic({ location: 0, scale: 1 }).sample(); // -0.2231...
 * ```
 */
export function logistic(options: LocationScaleOptions = {}): NumberSampler {
  const { location = 0, scale = 1 } = options;
  assertFinite(location, "location");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => {
      const u = open(src);
      return location + scale * Math.log(u / (1 - u));
    },
    location,
    (scale * scale * Math.PI * Math.PI) / 3
  );
}

/**
 * Gumbel: the distribution of a maximum, used for extreme-value work.
 *
 * @example
 * ```ts
 * gumbel({ location: 0, scale: 1 }).sample(); // 0.4759...
 * ```
 */
export function gumbel(options: LocationScaleOptions = {}): NumberSampler {
  const { location = 0, scale = 1 } = options;
  assertFinite(location, "location");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  const euler = 0.5772156649015329;
  return numberSampler(
    () => location - scale * Math.log(-Math.log(open(src))),
    location + scale * euler,
    (scale * scale * Math.PI * Math.PI) / 6
  );
}

export interface ShapeScaleOptions extends DistributionOptions {
  shape: number;
  scale?: number;
}

/**
 * Pareto: the heavy-tailed shape behind the 80/20 rule.
 *
 * @example
 * ```ts
 * const wealth = pareto({ shape: 1.16, scale: 1000 });
 * wealth.sample(); // 1872.1...
 * ```
 */
export function pareto(options: ShapeScaleOptions): NumberSampler {
  const { shape, scale = 1 } = options;
  assertPositive(shape, "shape");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => scale / open(src) ** (1 / shape),
    shape > 1 ? (shape * scale) / (shape - 1) : Number.POSITIVE_INFINITY,
    shape > 2
      ? (scale * scale * shape) / ((shape - 1) * (shape - 1) * (shape - 2))
      : Number.POSITIVE_INFINITY
  );
}

/**
 * Weibull, used for time until failure.
 *
 * @example
 * ```ts
 * weibull({ shape: 1.5, scale: 100 }).sample(); // 79.43...
 * ```
 */
export function weibull(options: ShapeScaleOptions): NumberSampler {
  const { shape, scale = 1 } = options;
  assertPositive(shape, "shape");
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  const g1 = Math.exp(logGamma(1 + 1 / shape));
  const g2 = Math.exp(logGamma(1 + 2 / shape));
  return numberSampler(
    () => scale * standardExponential(src) ** (1 / shape),
    scale * g1,
    scale * scale * (g2 - g1 * g1)
  );
}

export interface RayleighOptions extends DistributionOptions {
  scale?: number;
}

/**
 * Rayleigh: the length of a two-dimensional Gaussian vector.
 *
 * @example
 * ```ts
 * rayleigh({ scale: 1 }).sample(); // 1.1774...
 * ```
 */
export function rayleigh(options: RayleighOptions = {}): NumberSampler {
  const { scale = 1 } = options;
  assertPositive(scale, "scale");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => scale * Math.sqrt(2 * standardExponential(src)),
    scale * Math.sqrt(Math.PI / 2),
    ((4 - Math.PI) / 2) * scale * scale
  );
}

export interface TriangularOptions extends DistributionOptions {
  min: number;
  max: number;
  mode?: number;
}

/**
 * Triangular over `[min, max]`, peaking at `mode` (the midpoint by default). The usual stand-in when all you have is a best, worst and likely case.
 *
 * @example
 * ```ts
 * triangular({ min: 0, max: 10, mode: 9 }).sample(); // 7.8102...
 * ```
 */
export function triangular(options: TriangularOptions): NumberSampler {
  const { min, max } = options;
  const mode = options.mode ?? (min + max) / 2;
  assertFinite(min, "min");
  assertFinite(max, "max");
  assertFinite(mode, "mode");
  assertOrder(min, max, "triangular");
  if (mode < min || mode > max) {
    raise(
      "INVALID_RANGE",
      `triangular: mode (${mode}) must lie within [${min}, ${max}].`
    );
  }

  const src = resolveSource(options.engine);
  const span = max - min;
  const cut = span === 0 ? 0 : (mode - min) / span;

  return numberSampler(
    () => {
      const u = src.f64();
      return u < cut
        ? min + Math.sqrt(u * span * (mode - min))
        : max - Math.sqrt((1 - u) * span * (max - mode));
    },
    (min + max + mode) / 3,
    (min * min +
      max * max +
      mode * mode -
      min * max -
      min * mode -
      max * mode) /
      18
  );
}
