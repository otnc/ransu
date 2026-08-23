import { assertFinite, assertInteger } from "../../internal/assert";
import { raise } from "../../internal/errors";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";
import { assertCount } from "./guards";

export interface HypergeometricOptions extends DistributionOptions {
  /** Population size. */
  population: number;
  /** Number of successes in the population. */
  successes: number;
  /** Number of draws. */
  draws: number;
}

/** Sequential urn sampling: exact, and `O(draws)`. */
export function hypergeometric(options: HypergeometricOptions): NumberSampler {
  const { population, successes, draws } = options;
  assertCount(population, "population");
  assertCount(successes, "successes");
  assertCount(draws, "draws");
  if (successes > population) {
    raise(
      "INVALID_ARGUMENT",
      "hypergeometric: successes must be <= population."
    );
  }
  if (draws > population) {
    raise("INVALID_ARGUMENT", "hypergeometric: draws must be <= population.");
  }
  const src = resolveSource(options.engine);
  const ratio = successes / population;

  return numberSampler(
    () => {
      let remaining = population;
      let good = successes;
      let found = 0;
      for (let i = 0; i < draws; i++) {
        if (src.f64() * remaining < good) {
          found += 1;
          good -= 1;
        }
        remaining -= 1;
      }
      return found;
    },
    draws * ratio,
    population > 1
      ? draws * ratio * (1 - ratio) * ((population - draws) / (population - 1))
      : 0
  );
}

export interface ZipfOptions extends DistributionOptions {
  /** Exponent. Larger values concentrate more mass on rank 1. */
  s?: number;
  /** Number of ranks. The support is `1..n`. */
  n: number;
}

/** Zipf over a finite number of ranks, by binary search on the exact CDF. */
export function zipf(options: ZipfOptions): NumberSampler {
  const { s = 1, n } = options;
  assertFinite(s, "s");
  assertInteger(n, "n");
  if (n < 1) raise("INVALID_ARGUMENT", `zipf: n must be >= 1, got ${n}.`);
  if (n > 1e7) {
    raise(
      "RANGE_TOO_LARGE",
      "zipf: n above 10^7 would need an impractical table."
    );
  }
  const src = resolveSource(options.engine);

  const cdf = new Float64Array(n);
  let total = 0;
  for (let k = 1; k <= n; k++) {
    total += 1 / k ** s;
    cdf[k - 1] = total;
  }
  for (let i = 0; i < n; i++) cdf[i] /= total;

  let mean = 0;
  let second = 0;
  for (let k = 1; k <= n; k++) {
    const mass = 1 / k ** s / total;
    mean += k * mass;
    second += k * k * mass;
  }

  return numberSampler(
    () => {
      const u = src.f64();
      let low = 0;
      let high = n - 1;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (u < cdf[mid]) high = mid;
        else low = mid + 1;
      }
      return low + 1;
    },
    mean,
    second - mean * mean
  );
}
