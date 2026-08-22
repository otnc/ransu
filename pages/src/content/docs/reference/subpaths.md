---
title: Subpaths
description: What each import path contains.
---

One subpath per thing, so an import says what it brings in.

| Import                | Contents                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `ransu`               | Everything ergonomic: numbers, collections, strings, identifiers, distributions, `Random` |
| `ransu/engines`       | Every engine, as classes and seedable factories                                           |
| `ransu/distributions` | Sampler factories for all 31 distributions                                                |
| `ransu/uuid`          | Every UUID version, plus parse / stringify / validate / compare                           |
| `ransu/nanoid`        | nanoid only                                                                               |
| `ransu/ulid`          | ULID only                                                                                 |
| `ransu/token`         | Tokens, one-time codes, passwords                                                         |
| `ransu/unicode`       | Code points, blocks, grapheme-aware strings                                               |
| `ransu/time`          | Random dates, jitter, retry backoff                                                       |
| `ransu/hash`          | Stable per-key randomness                                                                 |
| `ransu/secure`        | The same API as the root, CSPRNG-backed and unseedable                                    |
| `ransu/compat`        | Adapters to and from `Math.random`, `seedrandom`, `pure-rand`                             |

## Naming

Plural names (`engines`, `distributions`) are bags of interchangeable
implementations you pick one from. Singular names are one thing each.

## Root versus subpath

The root re-exports the whole ergonomic surface, so subpaths exist for clarity
and for consumers without a bundler. Tree-shaking already keeps unused exports
out of your build either way.

The one place it matters: `ransu/distributions` gives you **sampler factories**
(`normal({ mean, sd })`), while the root gives you **one-shot draws**
(`normal(170, 6)`).
