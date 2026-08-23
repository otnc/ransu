import * as c from "../distribution/continuous/index";
import * as d from "../distribution/discrete/index";
import {
  standardExponential,
  standardGamma,
  standardNormal,
} from "../distribution/ziggurat";
import { globalSource } from "./instance";

// One-shot draws from the global stream, with positional arguments. The
// factories in `ransu/distribution` take an options object and return a
// reusable sampler; reach for those when drawing more than once.

/** One Gaussian draw. */
/**
 * One Gaussian draw.
 *
 * @example
 * ```ts
 * normal();        // 0.4837...   mean 0, sd 1
 * normal(100, 15); // 92.61...    an IQ-shaped draw
 * ```
 */
export function normal(mean = 0, sd = 1): number {
  return mean + sd * standardNormal(globalSource());
}

/** One exponential draw. */
/**
 * One exponential draw: the wait until the next event.
 *
 * @example
 * ```ts
 * exponential();    // 0.6931...  rate 1
 * exponential(0.5); // 3.2188...  the mean is 1 / rate
 * ```
 */
export function exponential(rate = 1): number {
  return standardExponential(globalSource()) / rate;
}

/** One gamma draw. */
/**
 * One gamma draw.
 *
 * @example
 * ```ts
 * gamma(2);     // 1.4726...
 * gamma(2, 10); // 14.726...   shape 2, scale 10
 * ```
 */
export function gamma(shape: number, scale = 1): number {
  return standardGamma(globalSource(), shape) * scale;
}

/**
 * One log-normal draw: a normal variable exponentiated.
 *
 * @example
 * ```ts
 * logNormal();       // 1.6221...
 * logNormal(0, 0.5); // 1.2840...
 * ```
 */
export function logNormal(mu = 0, sigma = 1): number {
  return c.logNormal({ mu, sigma }).sample();
}

/**
 * One draw in `(0, 1)`, shaped by two positive parameters.
 *
 * @example
 * ```ts
 * beta(2, 5); // 0.2734...  skewed toward 0
 * ```
 */
export function beta(alpha: number, betaShape: number): number {
  return c.beta({ alpha, beta: betaShape }).sample();
}

/**
 * One chi-squared draw with `df` degrees of freedom.
 *
 * @example
 * ```ts
 * chiSquared(3); // 2.3661...
 * ```
 */
export function chiSquared(df: number): number {
  return standardGamma(globalSource(), df / 2) * 2;
}

/**
 * One Student's t draw: a normal with heavier tails.
 *
 * @example
 * ```ts
 * studentT(5); // -0.8412...
 * ```
 */
export function studentT(df: number): number {
  return standardNormal(globalSource()) / Math.sqrt(chiSquared(df) / df);
}

/**
 * One F draw, the ratio of two chi-squared variables.
 *
 * @example
 * ```ts
 * fisherF(3, 10); // 1.1274...
 * ```
 */
export function fisherF(d1: number, d2: number): number {
  return c.f({ d1, d2 }).sample();
}

/**
 * One Cauchy draw. It has no mean, so expect extreme outliers.
 *
 * @example
 * ```ts
 * cauchy(); // -0.4142...  and occasionally something enormous
 * ```
 */
export function cauchy(location = 0, scale = 1): number {
  return c.cauchy({ location, scale }).sample();
}

/**
 * One Laplace draw: two exponential tails back to back.
 *
 * @example
 * ```ts
 * laplace(0, 1); // 0.3819...
 * ```
 */
export function laplace(location = 0, scale = 1): number {
  return c.laplace({ location, scale }).sample();
}

/**
 * One logistic draw, the distribution behind the sigmoid.
 *
 * @example
 * ```ts
 * logistic(); // -0.2231...
 * ```
 */
export function logistic(location = 0, scale = 1): number {
  return c.logistic({ location, scale }).sample();
}

/**
 * One Gumbel draw: the distribution of a maximum.
 *
 * @example
 * ```ts
 * gumbel(); // 0.4759...
 * ```
 */
export function gumbel(location = 0, scale = 1): number {
  return c.gumbel({ location, scale }).sample();
}

/**
 * One Pareto draw: the heavy-tailed shape behind the 80/20 rule.
 *
 * @example
 * ```ts
 * pareto(1.16); // 1.8721...  scale 1 by default
 * ```
 */
export function pareto(shape: number, scale = 1): number {
  return c.pareto({ shape, scale }).sample();
}

/**
 * One Weibull draw, used for time until failure.
 *
 * @example
 * ```ts
 * weibull(1.5);      // 0.7943...
 * weibull(1.5, 100); // 79.43...
 * ```
 */
export function weibull(shape: number, scale = 1): number {
  return scale * standardExponential(globalSource()) ** (1 / shape);
}

/**
 * One Rayleigh draw: the length of a 2D Gaussian vector.
 *
 * @example
 * ```ts
 * rayleigh(); // 1.1774...
 * ```
 */
export function rayleigh(scale = 1): number {
  return scale * Math.sqrt(2 * standardExponential(globalSource()));
}

/**
 * One draw from a triangle, with an optional peak.
 *
 * @example
 * ```ts
 * triangular(0, 10);    // 4.7213...  peak at the midpoint
 * triangular(0, 10, 9); // 7.8102...  peak at 9
 * ```
 */
export function triangular(min: number, max: number, mode?: number): number {
  return c.triangular({ min, max, mode }).sample();
}

/**
 * One draw: the sum of `n` uniforms.
 *
 * @example
 * ```ts
 * irwinHall(12); // 6.1284...  a cheap normal approximation
 * ```
 */
export function irwinHall(n: number): number {
  return c.irwinHall({ n }).sample();
}

/**
 * One draw: the mean of `n` uniforms.
 *
 * @example
 * ```ts
 * bates(10); // 0.5127...
 * ```
 */
export function bates(n: number): number {
  return c.bates({ n }).sample();
}

/** One angle in `(-pi, pi]`. */
/**
 * One angle in `(-pi, pi]`. The circular analogue of a normal.
 *
 * @example
 * ```ts
 * vonMises();      // 0.3218...
 * vonMises(0, 10); // 0.0782...  a larger kappa concentrates near mu
 * ```
 */
export function vonMises(mu = 0, kappa = 1): number {
  return c.vonMises({ mu, kappa }).sample();
}

/** One point on the simplex. */
/**
 * One point on the simplex: values in `(0, 1)` that sum to 1.
 *
 * @example
 * ```ts
 * dirichlet([1, 1, 1]); // [ 0.24, 0.51, 0.25 ]
 * ```
 */
export function dirichlet(alpha: readonly number[]): number[] {
  return c.dirichlet({ alpha }).sample();
}

/** `1` with probability `p`, otherwise `0`. */
/**
 * `1` with probability `p`, otherwise `0`.
 *
 * @example
 * ```ts
 * bernoulli();     // 1
 * bernoulli(0.25); // 0
 * ```
 */
export function bernoulli(p = 0.5): number {
  return d.bernoulli({ p }).sample();
}

/** An index in `[0, weights.length)`, proportional to the weights. */
/**
 * An index in `[0, weights.length)`, proportional to the weights.
 *
 * @example
 * ```ts
 * categorical([1, 3, 6]); // 2, most of the time
 * ```
 */
export function categorical(weights: ArrayLike<number>): number {
  return d.categorical({ weights }).sample();
}

/**
 * The number of successes in `n` independent trials.
 *
 * @example
 * ```ts
 * binomial(10, 0.5); // 6
 * ```
 */
export function binomial(n: number, p: number): number {
  return d.binomial({ n, p }).sample();
}

/**
 * The number of events in one interval, given a mean rate.
 *
 * @example
 * ```ts
 * poisson(4); // 3
 * ```
 */
export function poisson(lambda: number): number {
  return d.poisson({ lambda }).sample();
}

/** The trial on which the first success lands, counting from 1. */
/**
 * The trial on which the first success lands, counting from 1.
 *
 * @example
 * ```ts
 * geometric(0.1); // 7
 * ```
 */
export function geometric(p: number): number {
  return d.geometric({ p }).sample();
}

/**
 * The number of failures before the `r`-th success.
 *
 * @example
 * ```ts
 * negativeBinomial(3, 0.5); // 4
 * ```
 */
export function negativeBinomial(r: number, p: number): number {
  return d.negativeBinomial({ r, p }).sample();
}

/**
 * Successes when drawing without replacement from a finite pool.
 *
 * @example
 * ```ts
 * hypergeometric(50, 5, 10); // 1, drawing 10 from 50 that hold 5
 * ```
 */
export function hypergeometric(
  population: number,
  successes: number,
  draws: number
): number {
  return d.hypergeometric({ population, successes, draws }).sample();
}

/** A rank in `1..n`. */
/**
 * A rank in `1..n`, following the power law behind word frequency.
 *
 * @example
 * ```ts
 * zipf(1.2, 1000); // 3
 * ```
 */
export function zipf(s: number, n: number): number {
  return d.zipf({ s, n }).sample();
}

/** Counts per category, summing to `n`. */
/**
 * Counts per category, summing to `n`.
 *
 * @example
 * ```ts
 * multinomial(100, [1, 3, 6]); // [ 9, 31, 60 ]
 * ```
 */
export function multinomial(n: number, weights: ArrayLike<number>): number[] {
  return d.multinomial({ n, weights }).sample();
}
