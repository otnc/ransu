import * as c from "../distributions/continuous/index";
import * as d from "../distributions/discrete/index";
import {
  standardExponential,
  standardGamma,
  standardNormal,
} from "../distributions/ziggurat";
import { globalSource } from "./instance";

// One-shot draws from the global stream, with positional arguments. The
// factories in `ransu/distributions` take an options object and return a
// reusable sampler; reach for those when drawing more than once.

/** One Gaussian draw. */
export function normal(mean = 0, sd = 1): number {
  return mean + sd * standardNormal(globalSource());
}

/** One exponential draw. */
export function exponential(rate = 1): number {
  return standardExponential(globalSource()) / rate;
}

/** One gamma draw. */
export function gamma(shape: number, scale = 1): number {
  return standardGamma(globalSource(), shape) * scale;
}

export function logNormal(mu = 0, sigma = 1): number {
  return c.logNormal({ mu, sigma }).sample();
}

export function beta(alpha: number, betaShape: number): number {
  return c.beta({ alpha, beta: betaShape }).sample();
}

export function chiSquared(df: number): number {
  return standardGamma(globalSource(), df / 2) * 2;
}

export function studentT(df: number): number {
  return standardNormal(globalSource()) / Math.sqrt(chiSquared(df) / df);
}

export function fisherF(d1: number, d2: number): number {
  return c.f({ d1, d2 }).sample();
}

export function cauchy(location = 0, scale = 1): number {
  return c.cauchy({ location, scale }).sample();
}

export function laplace(location = 0, scale = 1): number {
  return c.laplace({ location, scale }).sample();
}

export function logistic(location = 0, scale = 1): number {
  return c.logistic({ location, scale }).sample();
}

export function gumbel(location = 0, scale = 1): number {
  return c.gumbel({ location, scale }).sample();
}

export function pareto(shape: number, scale = 1): number {
  return c.pareto({ shape, scale }).sample();
}

export function weibull(shape: number, scale = 1): number {
  return scale * standardExponential(globalSource()) ** (1 / shape);
}

export function rayleigh(scale = 1): number {
  return scale * Math.sqrt(2 * standardExponential(globalSource()));
}

export function triangular(min: number, max: number, mode?: number): number {
  return c.triangular({ min, max, mode }).sample();
}

export function irwinHall(n: number): number {
  return c.irwinHall({ n }).sample();
}

export function bates(n: number): number {
  return c.bates({ n }).sample();
}

/** One angle in `(-pi, pi]`. */
export function vonMises(mu = 0, kappa = 1): number {
  return c.vonMises({ mu, kappa }).sample();
}

/** One point on the simplex. */
export function dirichlet(alpha: readonly number[]): number[] {
  return c.dirichlet({ alpha }).sample();
}

/** `1` with probability `p`, otherwise `0`. */
export function bernoulli(p = 0.5): number {
  return d.bernoulli({ p }).sample();
}

/** An index in `[0, weights.length)`, proportional to the weights. */
export function categorical(weights: ArrayLike<number>): number {
  return d.categorical({ weights }).sample();
}

export function binomial(n: number, p: number): number {
  return d.binomial({ n, p }).sample();
}

export function poisson(lambda: number): number {
  return d.poisson({ lambda }).sample();
}

/** The trial on which the first success lands, counting from 1. */
export function geometric(p: number): number {
  return d.geometric({ p }).sample();
}

export function negativeBinomial(r: number, p: number): number {
  return d.negativeBinomial({ r, p }).sample();
}

export function hypergeometric(
  population: number,
  successes: number,
  draws: number
): number {
  return d.hypergeometric({ population, successes, draws }).sample();
}

/** A rank in `1..n`. */
export function zipf(s: number, n: number): number {
  return d.zipf({ s, n }).sample();
}

/** Counts per category, summing to `n`. */
export function multinomial(n: number, weights: ArrayLike<number>): number[] {
  return d.multinomial({ n, weights }).sample();
}
