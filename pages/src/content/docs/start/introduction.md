---
title: Introduction
description: What ransu is, and why reach for it instead of Math.random.
---

_ransu_ — from 乱数 (_ransū_), Japanese for "random number".

It is one package for everything random: uniform numbers, picking and shuffling,
identifiers, text, and thirty-one statistical distributions. Synchronous, zero
dependencies, and the same on every runtime.

## Why not `Math.random()`

|                              | `Math.random()`                                            | ransu                                                     |
| ---------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| Uniform integers in a range  | `Math.floor(Math.random() * n)` is **biased** for most `n` | unbiased by construction                                  |
| Reproducible                 | never                                                      | `new Random(seed)`, plus save / restore / split           |
| Safe for tokens              | no                                                         | `ransu/secure` and every identifier API are CSPRNG-backed |
| Picking, shuffling, sampling | write it yourself                                          | built in, and tested against exact distributions          |

### The bias is real

`Math.floor(Math.random() * 3)` does not give three equally likely results.
`Math.random()` produces one of 2^53 evenly spaced values, and 2^53 does not
divide by 3, so one outcome comes up slightly more often. The effect is small
for one draw and obvious after a few million — which is exactly when it matters:
shuffles, sampling, load balancing, simulations.

`ransu.integer(0, 2)` uses rejection sampling and is exactly uniform. CI draws
600,000 values and runs a chi-square test on the result.

## What it is not

- **Not a fake-data generator.** Names, addresses and lorem ipsum belong to
  `faker`. ransu covers randomness and what follows directly from it: colours,
  dates, identifiers, coordinates.
- **Not a statistics library.** It samples from distributions; it does not fit
  them or test them.
- **Not a crypto library.** It uses the platform CSPRNG. It does not implement
  encryption or key derivation.

## Next

- [Install](/start/install/)
- [Choosing an API](/start/choosing/) — namespace, named imports or an instance
