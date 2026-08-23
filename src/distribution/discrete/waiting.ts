import { assertFinite, assertProbability } from "../../internal/assert";
import { raise } from "../../internal/errors";
import type { Source } from "../../internal/source";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  open,
  resolveSource,
} from "../sampler";
import { standardGamma } from "../ziggurat";
import { poissonRejection, poissonSmall } from "./poisson";

export interface GeometricOptions extends DistributionOptions {
  p: number;
  /**
   * `'trials'` (the default) counts the trial on which the first success lands,
   * so the support starts at 1. `'failures'` counts the failures before it, so
   * the support starts at 0.
   */
  support?: "trials" | "failures";
}

/**
 * Geometric: the trial the first success lands on, counting from 1.
 *
 * @example
 * ```ts
 * geometric({ p: 0.1 }).sample(); // 7
 * ```
 */
export function geometric(options: GeometricOptions): NumberSampler {
  const { p, support = "trials" } = options;
  assertProbability(p, "p");
  if (p === 0)
    raise("INVALID_ARGUMENT", "geometric: p must be greater than 0.");
  const src = resolveSource(options.engine);
  const offset = support === "trials" ? 0 : -1;

  if (p === 1) return numberSampler(() => 1 + offset, 1 + offset, 0);

  const logQ = Math.log1p(-p);
  return numberSampler(
    () => Math.ceil(Math.log(open(src)) / logQ) + offset,
    1 / p + offset,
    (1 - p) / (p * p)
  );
}

export interface NegativeBinomialOptions extends DistributionOptions {
  /** Number of successes to wait for. May be non-integer. */
  r: number;
  p: number;
}

/**
 * Negative binomial: failures before the `r`-th success.
 *
 * @example
 * ```ts
 * negativeBinomial({ r: 3, p: 0.5 }).sample(); // 4
 * ```
 */
export function negativeBinomial(
  options: NegativeBinomialOptions
): NumberSampler {
  const { r, p } = options;
  assertFinite(r, "r");
  if (r <= 0) raise("INVALID_ARGUMENT", `r must be greater than 0, got ${r}.`);
  assertProbability(p, "p");
  if (p === 0)
    raise("INVALID_ARGUMENT", "negativeBinomial: p must be greater than 0.");
  const src = resolveSource(options.engine);

  if (p === 1) return numberSampler(() => 0, 0, 0);

  const scale = (1 - p) / p;
  return numberSampler(
    () => poissonSmallOrLarge(src, standardGamma(src, r) * scale),
    (r * (1 - p)) / p,
    (r * (1 - p)) / (p * p)
  );
}

function poissonSmallOrLarge(src: Source, lambda: number): number {
  if (lambda <= 0) return 0;
  return lambda < 30
    ? poissonSmall(src, lambda)
    : poissonRejection(src, lambda);
}
