import { raise } from "../../internal/errors";
import {
  type DistributionOptions,
  listSampler,
  resolveSource,
  type Sampler,
} from "../sampler";
import { drawBinomial } from "./binomial";
import { assertCount } from "./guards";

export interface MultinomialOptions extends DistributionOptions {
  n: number;
  /** Relative weights per category. They need not sum to 1. */
  weights: ArrayLike<number>;
}

/**
 * Multinomial: counts per category, summing to `n`.
 *
 * @example
 * ```ts
 * multinomial({ n: 100, weights: [1, 3, 6] }).sample(); // [ 9, 31, 60 ]
 * ```
 */
export function multinomial(options: MultinomialOptions): Sampler<number[]> {
  const { n, weights } = options;
  assertCount(n, "n");
  if (weights.length === 0) {
    raise(
      "INVALID_ARGUMENT",
      "multinomial: weights must have at least one category."
    );
  }
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
      raise(
        "INVALID_WEIGHTS",
        `weights[${i}] must be a finite number >= 0, got ${String(w)}.`
      );
    }
    total += w;
  }
  if (total <= 0)
    raise("INVALID_WEIGHTS", "At least one weight must be greater than 0.");

  const src = resolveSource(options.engine);

  return listSampler(() => {
    const out = new Array<number>(weights.length).fill(0);
    let left = n;
    let remaining = total;
    for (let i = 0; i < weights.length - 1 && left > 0; i++) {
      const p = Math.min(1, weights[i] / remaining);
      const count = drawBinomial(src, left, p);
      out[i] = count;
      left -= count;
      remaining -= weights[i];
    }
    out[weights.length - 1] = left;
    return out;
  });
}
