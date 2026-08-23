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
