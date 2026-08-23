import { raise } from "../../internal/errors";
import {
  type DistributionOptions,
  listSampler,
  resolveSource,
  type Sampler,
} from "../sampler";
import { standardGamma } from "../ziggurat";
import { assertPositive } from "./guards";

export interface DirichletOptions extends DistributionOptions {
  alpha: readonly number[];
}

/**
 * Dirichlet: a point on the simplex, so the values are in `(0, 1)` and sum to 1. The usual prior over a categorical distribution.
 *
 * @example
 * ```ts
 * const d = dirichlet({ alpha: [1, 1, 1] });
 * d.sample(); // [ 0.24, 0.51, 0.25 ]
 * ```
 */
export function dirichlet(options: DirichletOptions): Sampler<number[]> {
  const { alpha } = options;
  if (alpha.length === 0) {
    raise(
      "INVALID_ARGUMENT",
      "dirichlet: alpha must have at least one component."
    );
  }
  for (let i = 0; i < alpha.length; i++)
    assertPositive(alpha[i], `alpha[${i}]`);
  const src = resolveSource(options.engine);

  return listSampler(() => {
    const out = new Array<number>(alpha.length);
    let total = 0;
    for (let i = 0; i < alpha.length; i++) {
      out[i] = standardGamma(src, alpha[i]);
      total += out[i];
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
  });
}
