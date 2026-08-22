import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engines/xoshiro128pp";
import { RansuError } from "../internal/errors";
import { logGamma } from "./gamma-function";
import {
  bates,
  bernoulli,
  beta,
  binomial,
  categorical,
  cauchy,
  chiSquared,
  dirichlet,
  discreteUniform,
  exponential,
  f,
  gamma,
  geometric,
  gumbel,
  hypergeometric,
  irwinHall,
  laplace,
  logistic,
  logNormal,
  multinomial,
  negativeBinomial,
  normal,
  pareto,
  poisson,
  rayleigh,
  studentT,
  triangular,
  uniform,
  vonMises,
  weibull,
  zipf,
} from "./index";

const engine = () => xoshiro128pp("distributions");

function moments(values: ArrayLike<number>): {
  mean: number;
  variance: number;
} {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  let sq = 0;
  for (let i = 0; i < values.length; i++) sq += (values[i] - mean) ** 2;
  return { mean, variance: sq / values.length };
}

/**
 * Kolmogorov-Smirnov against an exact CDF. The 0.999 critical value is
 * 1.949/sqrt(n), so anything under that is a comfortable pass.
 */
function ksStatistic(values: Float64Array, cdf: (x: number) => number): number {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const n = sorted.length;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const theoretical = cdf(sorted[i]);
    d = Math.max(
      d,
      Math.abs(theoretical - i / n),
      Math.abs((i + 1) / n - theoretical)
    );
  }
  return d;
}

function ksCritical(n: number): number {
  return 1.949 / Math.sqrt(n);
}

/** Abramowitz & Stegun 7.1.26, good to ~1e-7 — plenty for a KS test. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

const normalCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

function chiSquareTest(counts: number[], expected: number[]): number {
  let chi = 0;
  for (let i = 0; i < counts.length; i++) {
    if (expected[i] > 0) chi += (counts[i] - expected[i]) ** 2 / expected[i];
  }
  return chi;
}

describe("logGamma", () => {
  it("matches known values", () => {
    expect(Math.exp(logGamma(1))).toBeCloseTo(1, 10);
    expect(Math.exp(logGamma(2))).toBeCloseTo(1, 10);
    expect(Math.exp(logGamma(5))).toBeCloseTo(24, 8);
    expect(Math.exp(logGamma(0.5))).toBeCloseTo(Math.sqrt(Math.PI), 10);
    expect(logGamma(100)).toBeCloseTo(359.1342053695754, 8);
  });
});

describe("normal", () => {
  it("passes a Kolmogorov-Smirnov test against the exact CDF", () => {
    const values = normal({ engine: engine() }).samples(30_000);
    expect(ksStatistic(values, normalCdf)).toBeLessThan(ksCritical(30_000));
  });

  it("matches its stated moments", () => {
    const sampler = normal({ mean: 170, sd: 6, engine: engine() });
    const { mean, variance } = moments(sampler.samples(80_000));
    expect(mean).toBeCloseTo(sampler.mean, 0);
    expect(variance / sampler.variance).toBeCloseTo(1, 1);
  });

  it("fills the tails at the right rate", () => {
    // The ziggurat's tail path only runs beyond |x| > 3.44, so it needs its own
    // check: about 0.27% of draws should exceed 3 sigma, 0.0063% beyond 4.
    const values = normal({ engine: engine() }).samples(1_000_000);
    let beyond3 = 0;
    let beyond4 = 0;
    for (const value of values) {
      const a = Math.abs(value);
      if (a > 3) beyond3++;
      if (a > 4) beyond4++;
    }
    expect(beyond3 / values.length).toBeCloseTo(0.0026998, 3);
    expect(beyond4 / values.length).toBeCloseTo(0.0000633, 4);
  });

  it("is symmetric about the mean", () => {
    const values = normal({ engine: engine() }).samples(80_000);
    let positive = 0;
    for (const value of values) if (value > 0) positive++;
    expect(positive / values.length).toBeCloseTo(0.5, 2);
  });

  it("has skewness near 0 and kurtosis near 3", () => {
    const values = normal({ engine: engine() }).samples(150_000);
    const { mean, variance } = moments(values);
    const sd = Math.sqrt(variance);
    let m3 = 0;
    let m4 = 0;
    for (const value of values) {
      const z = (value - mean) / sd;
      m3 += z ** 3;
      m4 += z ** 4;
    }
    expect(m3 / values.length).toBeCloseTo(0, 1);
    expect(m4 / values.length).toBeCloseTo(3, 1);
  });

  it("rejects a non-positive standard deviation", () => {
    expect(() => normal({ sd: 0 })).toThrow(RansuError);
    expect(() => normal({ sd: -1 })).toThrow(RansuError);
  });
});

describe("exponential", () => {
  it("passes a KS test", () => {
    const values = exponential({ rate: 2, engine: engine() }).samples(30_000);
    expect(ksStatistic(values, (x) => 1 - Math.exp(-2 * x))).toBeLessThan(
      ksCritical(30_000)
    );
  });

  it("is always positive", () => {
    for (const value of exponential({ engine: engine() }).samples(10_000)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe("uniform", () => {
  it("passes a KS test", () => {
    const values = uniform({ min: -2, max: 5, engine: engine() }).samples(
      30_000
    );
    expect(ksStatistic(values, (x) => (x + 2) / 7)).toBeLessThan(
      ksCritical(30_000)
    );
  });
});

describe("gamma", () => {
  it.each([0.1, 0.5, 1, 2.5, 10, 100])(
    "matches its moments for shape %s",
    (shape) => {
      const sampler = gamma({ shape, scale: 3, engine: engine() });
      const { mean, variance } = moments(sampler.samples(80_000));
      expect(mean / sampler.mean).toBeCloseTo(1, 1);
      expect(variance / sampler.variance).toBeCloseTo(1, 1);
    }
  );

  it("is always positive, including for a sub-1 shape", () => {
    for (const value of gamma({ shape: 0.2, engine: engine() }).samples(
      10_000
    )) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it("with shape 1 is an exponential", () => {
    const values = gamma({ shape: 1, engine: engine() }).samples(30_000);
    expect(ksStatistic(values, (x) => 1 - Math.exp(-x))).toBeLessThan(
      ksCritical(30_000)
    );
  });
});

describe("beta, chi-squared, t and F", () => {
  it("beta stays within [0, 1] and matches its moments", () => {
    const sampler = beta({ alpha: 2, beta: 5, engine: engine() });
    const values = sampler.samples(80_000);
    expect(
      Array.prototype.every.call(values, (value) => value >= 0 && value <= 1)
    ).toBe(true);
    const { mean, variance } = moments(values);
    expect(mean).toBeCloseTo(sampler.mean, 2);
    expect(variance).toBeCloseTo(sampler.variance, 3);
  });

  it("chiSquared matches its moments", () => {
    const sampler = chiSquared({ df: 7, engine: engine() });
    const { mean, variance } = moments(sampler.samples(80_000));
    expect(mean).toBeCloseTo(7, 1);
    expect(variance / 14).toBeCloseTo(1, 1);
  });

  it("studentT has the right variance for df > 2", () => {
    const sampler = studentT({ df: 10, engine: engine() });
    const { mean, variance } = moments(sampler.samples(80_000));
    expect(mean).toBeCloseTo(0, 1);
    expect(variance / sampler.variance).toBeCloseTo(1, 0);
  });

  it("f is positive and centred near its mean", () => {
    const sampler = f({ d1: 8, d2: 12, engine: engine() });
    const values = sampler.samples(40_000);
    expect(Array.prototype.every.call(values, (value) => value > 0)).toBe(true);
    expect(moments(values).mean / sampler.mean).toBeCloseTo(1, 1);
  });
});

describe("location-scale families", () => {
  it("logNormal matches its moments", () => {
    const sampler = logNormal({ mu: 0, sigma: 0.5, engine: engine() });
    const { mean, variance } = moments(sampler.samples(150_000));
    expect(mean / sampler.mean).toBeCloseTo(1, 1);
    expect(variance / sampler.variance).toBeCloseTo(1, 0);
  });

  it("cauchy has a median at the location but no usable mean", () => {
    const values = Array.from(
      cauchy({ location: 3, engine: engine() }).samples(40_000)
    ).sort((a, b) => a - b);
    expect(values[values.length >> 1]).toBeCloseTo(3, 1);
    expect(Number.isNaN(cauchy().mean)).toBe(true);
  });

  it("laplace passes a KS test", () => {
    const values = laplace({ location: 1, scale: 2, engine: engine() }).samples(
      30_000
    );
    const cdf = (x: number) =>
      x < 1 ? 0.5 * Math.exp((x - 1) / 2) : 1 - 0.5 * Math.exp(-(x - 1) / 2);
    expect(ksStatistic(values, cdf)).toBeLessThan(ksCritical(30_000));
  });

  it("logistic passes a KS test", () => {
    const values = logistic({
      location: 0,
      scale: 1,
      engine: engine(),
    }).samples(30_000);
    expect(ksStatistic(values, (x) => 1 / (1 + Math.exp(-x)))).toBeLessThan(
      ksCritical(30_000)
    );
  });

  it("gumbel passes a KS test", () => {
    const values = gumbel({ engine: engine() }).samples(30_000);
    expect(ksStatistic(values, (x) => Math.exp(-Math.exp(-x)))).toBeLessThan(
      ksCritical(30_000)
    );
  });

  it("pareto passes a KS test", () => {
    const values = pareto({ shape: 3, scale: 2, engine: engine() }).samples(
      30_000
    );
    expect(ksStatistic(values, (x) => 1 - (2 / x) ** 3)).toBeLessThan(
      ksCritical(30_000)
    );
  });

  it("weibull passes a KS test and matches its moments", () => {
    const sampler = weibull({ shape: 2, scale: 3, engine: engine() });
    const values = sampler.samples(30_000);
    expect(
      ksStatistic(values, (x) => 1 - Math.exp(-((x / 3) ** 2)))
    ).toBeLessThan(ksCritical(30_000));
    const { mean, variance } = moments(values);
    expect(mean / sampler.mean).toBeCloseTo(1, 1);
    expect(variance / sampler.variance).toBeCloseTo(1, 1);
  });

  it("rayleigh passes a KS test", () => {
    const values = rayleigh({ scale: 2, engine: engine() }).samples(30_000);
    expect(ksStatistic(values, (x) => 1 - Math.exp(-(x * x) / 8))).toBeLessThan(
      ksCritical(30_000)
    );
  });

  it("triangular stays in range and peaks at the mode", () => {
    const sampler = triangular({ min: 0, max: 10, mode: 8, engine: engine() });
    const values = sampler.samples(40_000);
    expect(
      Array.prototype.every.call(values, (value) => value >= 0 && value <= 10)
    ).toBe(true);
    expect(moments(values).mean).toBeCloseTo(sampler.mean, 1);
    expect(() => triangular({ min: 0, max: 10, mode: 12 })).toThrow(RansuError);
  });
});

describe("sums of uniforms", () => {
  it("irwinHall matches its moments", () => {
    const sampler = irwinHall({ n: 12, engine: engine() });
    const { mean, variance } = moments(sampler.samples(80_000));
    expect(mean).toBeCloseTo(6, 1);
    expect(variance).toBeCloseTo(1, 1);
  });

  it("bates narrows as n grows", () => {
    const wide = moments(
      bates({ n: 2, engine: engine() }).samples(40_000)
    ).variance;
    const narrow = moments(
      bates({ n: 20, engine: engine() }).samples(40_000)
    ).variance;
    expect(narrow).toBeLessThan(wide);
    expect(narrow).toBeCloseTo(1 / 240, 3);
  });
});

describe("vonMises", () => {
  it("stays within (-pi, pi] and concentrates around mu", () => {
    const values = vonMises({ mu: 1, kappa: 4, engine: engine() }).samples(
      40_000
    );
    for (const value of values) {
      expect(value).toBeGreaterThan(-Math.PI - 1e-9);
      expect(value).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
    let sumSin = 0;
    let sumCos = 0;
    for (const value of values) {
      sumSin += Math.sin(value);
      sumCos += Math.cos(value);
    }
    expect(Math.atan2(sumSin, sumCos)).toBeCloseTo(1, 1);
  });

  it("is uniform when kappa is 0", () => {
    const values = vonMises({ kappa: 0, engine: engine() }).samples(30_000);
    expect(
      ksStatistic(values, (x) => (x + Math.PI) / (2 * Math.PI))
    ).toBeLessThan(ksCritical(30_000));
  });
});

describe("dirichlet", () => {
  it("returns points on the simplex with the right means", () => {
    const sampler = dirichlet({ alpha: [1, 2, 7], engine: engine() });
    const totals = [0, 0, 0];
    const draws = 30_000;
    for (const point of sampler.samples(draws)) {
      expect(point).toHaveLength(3);
      expect(point.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      for (let i = 0; i < 3; i++) totals[i] += point[i];
    }
    expect(totals[0] / draws).toBeCloseTo(0.1, 2);
    expect(totals[1] / draws).toBeCloseTo(0.2, 2);
    expect(totals[2] / draws).toBeCloseTo(0.7, 2);
  });
});

describe("bernoulli, discreteUniform and categorical", () => {
  it("bernoulli hits p", () => {
    const values = bernoulli({ p: 0.3, engine: engine() }).samples(80_000);
    expect(moments(values).mean).toBeCloseTo(0.3, 2);
  });

  it("discreteUniform covers its range evenly", () => {
    const draws = 40_000;
    const values = discreteUniform({
      min: 5,
      max: 9,
      engine: engine(),
    }).samples(draws);
    const counts = new Array<number>(5).fill(0);
    for (const value of values) counts[value - 5]++;
    // Expected counts are derived, not hardcoded, so changing `draws` cannot
    // silently turn this into a test of the wrong hypothesis.
    const expected = new Array<number>(5).fill(draws / 5);
    expect(chiSquareTest(counts, expected)).toBeLessThan(18.5);
  });

  it("categorical follows its weights", () => {
    const draws = 80_000;
    const weights = [1, 3, 6];
    const values = categorical({ weights, engine: engine() }).samples(draws);
    const counts = [0, 0, 0];
    for (const value of values) counts[value]++;
    const total = weights.reduce((a, b) => a + b, 0);
    const expected = weights.map((w) => (draws * w) / total);
    expect(chiSquareTest(counts, expected)).toBeLessThan(13.8);
  });
});

describe("binomial", () => {
  /** Exact pmf, for chi-square comparison. */
  function binomialPmf(k: number, n: number, p: number): number {
    return Math.exp(
      logGamma(n + 1) -
        logGamma(k + 1) -
        logGamma(n - k + 1) +
        k * Math.log(p) +
        (n - k) * Math.log1p(-p)
    );
  }

  it("matches the exact pmf on the inversion path", () => {
    const n = 20;
    const p = 0.3;
    const draws = 80_000;
    const counts = new Array(n + 1).fill(0);
    for (const value of binomial({ n, p, engine: engine() }).samples(draws))
      counts[value]++;
    const expected = counts.map((_, k) => binomialPmf(k, n, p) * draws);
    expect(chiSquareTest(counts, expected)).toBeLessThan(45);
  });

  it("matches the exact pmf on the rejection path", () => {
    // n * p = 40, comfortably past the switch to BTRS.
    const n = 100;
    const p = 0.4;
    const draws = 80_000;
    const counts = new Array(n + 1).fill(0);
    for (const value of binomial({ n, p, engine: engine() }).samples(draws))
      counts[value]++;
    const expected = counts.map((_, k) => binomialPmf(k, n, p) * draws);
    expect(chiSquareTest(counts, expected)).toBeLessThan(140);
  });

  it("reflects correctly for p above 0.5", () => {
    const sampler = binomial({ n: 50, p: 0.85, engine: engine() });
    const { mean, variance } = moments(sampler.samples(80_000));
    expect(mean).toBeCloseTo(42.5, 1);
    expect(variance).toBeCloseTo(6.375, 1);
  });

  it("stays inside [0, n] for a wide sweep of parameters", () => {
    for (const [n, p] of [
      [1, 0.5],
      [5, 0.01],
      [1000, 0.001],
      [1000, 0.5],
      [100000, 0.5],
    ] as const) {
      for (const value of binomial({ n, p, engine: engine() }).samples(2_000)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(n);
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it("handles the degenerate cases", () => {
    expect(binomial({ n: 0, p: 0.5 }).sample()).toBe(0);
    expect(binomial({ n: 10, p: 0 }).sample()).toBe(0);
    expect(binomial({ n: 10, p: 1 }).sample()).toBe(10);
  });
});

describe("poisson", () => {
  function poissonPmf(k: number, lambda: number): number {
    return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
  }

  it("matches the exact pmf on the Knuth path", () => {
    const lambda = 4;
    const draws = 80_000;
    const counts = new Array(20).fill(0);
    for (const value of poisson({ lambda, engine: engine() }).samples(draws)) {
      if (value < 20) counts[value]++;
    }
    const expected = counts.map((_, k) => poissonPmf(k, lambda) * draws);
    expect(chiSquareTest(counts, expected)).toBeLessThan(45);
  });

  it("matches the exact pmf on the rejection path", () => {
    const lambda = 50;
    const draws = 80_000;
    const counts = new Array(120).fill(0);
    for (const value of poisson({ lambda, engine: engine() }).samples(draws)) {
      if (value < 120) counts[value]++;
    }
    const expected = counts.map((_, k) => poissonPmf(k, lambda) * draws);
    expect(chiSquareTest(counts, expected)).toBeLessThan(180);
  });

  it("matches its moments across the switch point", () => {
    for (const lambda of [0.5, 10, 29, 30, 100]) {
      const values = poisson({ lambda, engine: engine() }).samples(30_000);
      const { mean, variance } = moments(values);
      expect(mean / lambda).toBeCloseTo(1, 1);
      expect(variance / lambda).toBeCloseTo(1, 1);
      for (const value of values) expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns 0 for lambda 0", () => {
    expect(poisson({ lambda: 0 }).sample()).toBe(0);
  });
});

describe("waiting times", () => {
  it("geometric counts trials from 1 by default", () => {
    const sampler = geometric({ p: 0.25, engine: engine() });
    const values = sampler.samples(80_000);
    for (const value of values) expect(value).toBeGreaterThanOrEqual(1);
    expect(moments(values).mean).toBeCloseTo(4, 1);
  });

  it("geometric can count failures instead", () => {
    const values = geometric({
      p: 0.25,
      support: "failures",
      engine: engine(),
    }).samples(80_000);
    for (const value of values) expect(value).toBeGreaterThanOrEqual(0);
    expect(moments(values).mean).toBeCloseTo(3, 1);
  });

  it("geometric matches its exact pmf", () => {
    const p = 0.3;
    const draws = 80_000;
    const counts = new Array(15).fill(0);
    for (const value of geometric({ p, engine: engine() }).samples(draws)) {
      if (value <= 15) counts[value - 1]++;
    }
    const expected = counts.map((_, i) => (1 - p) ** i * p * draws);
    expect(chiSquareTest(counts, expected)).toBeLessThan(35);
  });

  it("negativeBinomial matches its moments", () => {
    const sampler = negativeBinomial({ r: 5, p: 0.4, engine: engine() });
    const { mean, variance } = moments(sampler.samples(80_000));
    expect(mean / sampler.mean).toBeCloseTo(1, 1);
    expect(variance / sampler.variance).toBeCloseTo(1, 1);
  });
});

describe("hypergeometric", () => {
  it("matches its moments and stays in range", () => {
    const sampler = hypergeometric({
      population: 50,
      successes: 20,
      draws: 10,
      engine: engine(),
    });
    const values = sampler.samples(80_000);
    expect(
      Array.prototype.every.call(values, (value) => value >= 0 && value <= 10)
    ).toBe(true);
    const { mean, variance } = moments(values);
    expect(mean).toBeCloseTo(sampler.mean, 1);
    expect(variance / sampler.variance).toBeCloseTo(1, 1);
  });

  it("rejects impossible parameters", () => {
    expect(() =>
      hypergeometric({ population: 10, successes: 20, draws: 5 })
    ).toThrow(RansuError);
    expect(() =>
      hypergeometric({ population: 10, successes: 5, draws: 20 })
    ).toThrow(RansuError);
  });
});

describe("zipf", () => {
  it("follows the exact rank probabilities", () => {
    const s = 1.2;
    const n = 10;
    const draws = 80_000;
    const counts = new Array(n).fill(0);
    for (const value of zipf({ s, n, engine: engine() }).samples(draws))
      counts[value - 1]++;

    let total = 0;
    for (let k = 1; k <= n; k++) total += 1 / k ** s;
    const expected = counts.map((_, i) => ((1 / (i + 1) ** s) * draws) / total);
    expect(chiSquareTest(counts, expected)).toBeLessThan(28);
  });

  it("refuses an impractically large support", () => {
    expect(() => zipf({ n: 1e8 })).toThrow(/impractical/);
  });
});

describe("multinomial", () => {
  it("always sums to n and follows the weights", () => {
    const sampler = multinomial({
      n: 100,
      weights: [1, 3, 6],
      engine: engine(),
    });
    const totals = [0, 0, 0];
    const draws = 10_000;
    for (const counts of sampler.samples(draws)) {
      expect(counts.reduce((a, b) => a + b, 0)).toBe(100);
      for (let i = 0; i < 3; i++) totals[i] += counts[i];
    }
    expect(totals[0] / draws).toBeCloseTo(10, 0);
    expect(totals[1] / draws).toBeCloseTo(30, 0);
    expect(totals[2] / draws).toBeCloseTo(60, 0);
  });
});

describe("sampler plumbing", () => {
  it("is reproducible for a given seed", () => {
    const a = normal({ engine: xoshiro128pp(1) }).samples(10);
    const b = normal({ engine: xoshiro128pp(1) }).samples(10);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("returns a Float64Array from numeric samplers", () => {
    expect(normal().samples(4)).toBeInstanceOf(Float64Array);
    expect(Array.isArray(dirichlet({ alpha: [1, 1] }).samples(2))).toBe(true);
  });

  it("rejects invalid parameters consistently", () => {
    expect(() => gamma({ shape: 0 })).toThrow(RansuError);
    expect(() => beta({ alpha: 1, beta: -1 })).toThrow(RansuError);
    expect(() => poisson({ lambda: -1 })).toThrow(RansuError);
    expect(() => binomial({ n: -1, p: 0.5 })).toThrow(RansuError);
    expect(() => binomial({ n: 5, p: 1.5 })).toThrow(RansuError);
    expect(() => geometric({ p: 0 })).toThrow(RansuError);
    expect(() => vonMises({ kappa: -1 })).toThrow(RansuError);
  });
});
