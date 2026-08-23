import { assertFinite } from "../../internal/assert";
import { raise } from "../../internal/errors";
import type { Source } from "../../internal/source";
import { logGamma } from "../gamma-function";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";

/** Knuth's product method. Expected `O(lambda)`. */
export function poissonSmall(src: Source, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let product = 1;
  do {
    k += 1;
    product *= src.f64();
  } while (product > limit);
  return k - 1;
}

/** Hörmann's PTRS, for the range where Knuth's loop gets long. */
export function poissonRejection(src: Source, lambda: number): number {
  const b = 0.931 + 2.53 * Math.sqrt(lambda);
  const a = -0.059 + 0.02483 * b;
  const invAlpha = 1.1239 + 1.1328 / (b - 3.4);
  const vr = 0.9277 - 3.6224 / (b - 2);
  const logLambda = Math.log(lambda);

  for (;;) {
    const u = src.f64() - 0.5;
    const v = src.f64();
    const us = 0.5 - Math.abs(u);
    const k = Math.floor(((2 * a) / us + b) * u + lambda + 0.43);

    if (us >= 0.07 && v <= vr) return k;
    if (k < 0 || (us < 0.013 && v > us)) continue;

    const accept = Math.log((v * invAlpha) / (a / (us * us) + b));
    if (accept <= k * logLambda - lambda - logGamma(k + 1)) return k;
  }
}

export interface PoissonOptions extends DistributionOptions {
  lambda: number;
}

/**
 * Poisson: events in one interval, given a mean rate.
 *
 * @example
 * ```ts
 * poisson({ lambda: 4 }).sample(); // 3
 * ```
 */
export function poisson(options: PoissonOptions): NumberSampler {
  const { lambda } = options;
  assertFinite(lambda, "lambda");
  if (lambda < 0)
    raise("INVALID_ARGUMENT", `lambda must be >= 0, got ${lambda}.`);
  const src = resolveSource(options.engine);
  const draw =
    lambda === 0
      ? () => 0
      : lambda < 30
        ? () => poissonSmall(src, lambda)
        : () => poissonRejection(src, lambda);
  return numberSampler(draw, lambda, lambda);
}
