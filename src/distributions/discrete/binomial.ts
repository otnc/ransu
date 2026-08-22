import { assertProbability } from "../../internal/assert";
import type { Source } from "../../internal/source";
import { binomialLogPmf } from "../gamma-function";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";
import { assertCount } from "./guards";

/** Inversion by CDF recurrence. Expected `O(n p)`, so only for small `n p`. */
function binomialInverse(src: Source, n: number, p: number): number {
  const q = 1 - p;
  const s = p / q;
  const threshold = (n + 1) * s;
  let r = q ** n;
  let u = src.f64();
  let x = 0;
  while (u > r) {
    u -= r;
    x += 1;
    if (x > n) return n;
    r *= threshold / x - s;
  }
  return x;
}

/**
 * Hörmann's BTRS. The acceptance test compares against the exact log-pmf rather
 * than a Stirling approximation: marginally slower, unambiguously correct.
 */
function binomialRejection(src: Source, n: number, p: number): number {
  const spq = Math.sqrt(n * p * (1 - p));
  const b = 1.15 + 2.53 * spq;
  const a = -0.0873 + 0.0248 * b + 0.01 * p;
  const c = n * p + 0.5;
  const vr = 0.92 - 4.2 / b;
  const alpha = (2.83 + 5.1 / b) * spq;
  const mode = Math.floor((n + 1) * p);
  const logPmfMode = binomialLogPmf(mode, n, p);

  for (;;) {
    const u = src.f64() - 0.5;
    let v = src.f64();
    const us = 0.5 - Math.abs(u);
    const k = Math.floor(((2 * a) / us + b) * u + c);

    if (k < 0 || k > n) continue;
    if (us >= 0.07 && v <= vr) return k;

    v = Math.log((v * alpha) / (a / (us * us) + b));
    if (v <= binomialLogPmf(k, n, p) - logPmfMode) return k;
  }
}

export function drawBinomial(src: Source, n: number, p: number): number {
  if (n === 0 || p === 0) return 0;
  if (p === 1) return n;
  // The algorithms below assume p <= 0.5; reflect otherwise.
  if (p > 0.5) return n - drawBinomial(src, n, 1 - p);
  return n * p < 10 ? binomialInverse(src, n, p) : binomialRejection(src, n, p);
}

export interface BinomialOptions extends DistributionOptions {
  n: number;
  p: number;
}

/** The number of successes in `n` independent trials. */
export function binomial(options: BinomialOptions): NumberSampler {
  const { n, p } = options;
  assertCount(n, "n");
  assertProbability(p, "p");
  const src = resolveSource(options.engine);
  return numberSampler(() => drawBinomial(src, n, p), n * p, n * p * (1 - p));
}
