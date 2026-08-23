---
title: Distributions
description: Thirty-one distributions, checked against their exact CDFs and pmfs.
---

## One shot

```ts
ransu.normal(170, 6); // 168.42…
ransu.poisson(4); // 3
ransu.binomial(100, 0.3); // 28
ransu.exponential(2);
ransu.zipf(1.2, 1000);
```

## Reusable samplers

Same name, two shapes: **positional arguments give a number, an options object
gives a sampler.** The samplers live in `ransu/distribution`.

```ts
import { normal, categorical } from "ransu/distribution";

const height = normal({ mean: 170, sd: 6 });
height.sample(); // one draw
height.samples(10_000); // a Float64Array
height.mean; // 170
height.variance; // 36

const loot = categorical({ weights: [70, 25, 5] }); // O(1) per draw
```

Build the sampler when you draw more than once: it validates its parameters and
precomputes its constants up front.

## What is available

**Continuous** — `uniform`, `normal`, `logNormal`, `exponential`, `gamma`,
`beta`, `chiSquared`, `studentT`, `fisherF`, `cauchy`, `laplace`, `logistic`,
`gumbel`, `pareto`, `weibull`, `rayleigh`, `triangular`, `irwinHall`, `bates`,
`vonMises`, `dirichlet`.

**Discrete** — `bernoulli`, `discreteUniform`, `categorical`, `binomial`,
`poisson`, `geometric`, `negativeBinomial`, `hypergeometric`, `zipf`,
`multinomial`.

## Algorithms

| Distribution     | Method                                               |
| ---------------- | ---------------------------------------------------- |
| `normal`         | 128-level ziggurat, tables built numerically at load |
| `gamma`          | Marsaglia–Tsang, with a boost for shapes below 1     |
| `binomial`       | CDF inversion when `n·p < 10`, Hörmann's BTRS above  |
| `poisson`        | Knuth when `λ < 30`, Hörmann's PTRS above            |
| `categorical`    | Vose's alias method                                  |
| `hypergeometric` | Sequential urn sampling — exact                      |
| Everything else  | Inverse transform, or composition of the above       |

The rejection methods compare against the **exact log-pmf** rather than a
Stirling approximation. The rejection rate is low enough that the extra cost
does not matter, and it removes any chance of a mis-transcribed constant.

## How they are checked

Matching the mean does not prove a distribution is right. CI runs:

- **Kolmogorov–Smirnov** against the exact CDF for the continuous families.
- **Chi-square** against the exact pmf for the discrete ones — separately for
  _each_ algorithm branch, so both the inversion and the rejection paths are
  covered.
- For the normal, the **3σ and 4σ tail rates**, plus skewness and kurtosis. The
  ziggurat only enters its tail routine beyond 3.44σ, so a moment test alone
  would never notice a broken tail.

## Passing an engine

```ts
const r = new Random(42);
normal({ mean: 0, sd: 1, engine: r.engine }).sample();
```

Without `engine`, a sampler draws from the global stream, so `seed()` makes it
reproducible too.
