# ransu

> Convenient and easy-to-use random functions.

[![npm](https://img.shields.io/npm/v/ransu)](https://www.npmjs.com/package/ransu)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/otnc/ransu/ci.yml?branch=main)](https://github.com/otnc/ransu/actions)
[![GitHub](https://img.shields.io/github/license/otnc/ransu)](https://github.com/otnc/ransu/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/ransu)](https://www.npmjs.com/package/ransu)

_ransu_ — from 乱数 (_ransū_), Japanese for "random number".

```ts
import ransu from "ransu";

ransu.random(); // 0.7263…  — a Math.random() drop-in
ransu.integer(1, 6); // 4        — both ends included
ransu.pick(["🍎", "🍊"]); // '🍊'
ransu.shuffle(deck); // a new array; the input is untouched
ransu.uuid.v7(); // '01997a2c-...' — sortable by time
```

Everything is **synchronous**, has **zero dependencies**, and runs unchanged on
Node, Deno, Bun, browsers, Cloudflare Workers and Vercel Edge.

## Install

```sh
npm install ransu
```

## Three ways in, one name each

Pick whichever fits; they are the same functions.

```ts
// 1. Namespace — the shortest thing to type.
import ransu from "ransu";
ransu.integer(1, 6);

// 2. Named exports — tree-shakeable, for bundle-size-sensitive code.
import { integer, pick, shuffle } from "ransu";
integer(1, 6);

// 3. An instance — for libraries, tests and anything reproducible.
import { Random } from "ransu";
new Random(42).integer(1, 6);
```

There is no second vocabulary to learn: `ransu.integer`, the named export
`integer` and `Random#integer` are literally the same function. Moving code from
the global to a seeded instance is a one-word change.

CommonJS works the same way, and `require` gives you the namespace itself
rather than a `.default` wrapper:

```js
const ransu = require("ransu");
const { integer } = require("ransu");
```

## Why not `Math.random()`

|                              | `Math.random()`                                            | ransu                                             |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Uniform integers in a range  | `Math.floor(Math.random() * n)` is **biased** for most `n` | unbiased by construction                          |
| Reproducible                 | never                                                      | `new Random(seed)`, plus save/restore/split       |
| Safe for tokens              | no                                                         | `ransu/secure` and every ID API are CSPRNG-backed |
| Picking, shuffling, sampling | write it yourself                                          | built in, and correct                             |

## What you get

### Numbers

```ts
ransu.random(); // [0, 1)
ransu.float(-1, 1); // [min, max)
ransu.integer(1, 6); // [min, max] — inclusive
ransu.below(arr.length); // [0, n)     — what indices want
ransu.range(0, 100, 5); // Python's randrange
ransu.bigint(0n, 2n ** 128n);
ransu.bool(); // true or false, evenly
ransu.chance(0.25); // true a quarter of the time
ransu.bits(12); // Python's getrandbits
ransu.bytes(32); // Uint8Array
ransu.floats(1000); // Float64Array, bounds validated once
```

`integer` includes **both** ends; `below`, `range` and `float` exclude the
upper one. Every bounded integer uses Lemire's nearly-divisionless method, so
there is no modulo bias — and anything wider than 2^53 is refused rather than
silently rounded.

### Collections

```ts
ransu.pick(items); // one element (throws if empty)
ransu.tryPick(items); // …or undefined
ransu.choices(items, 5); // 5, with replacement
ransu.sample(items, 5); // 5 distinct, random order
ransu.combination(items, 5); // 5 distinct, original order
ransu.reservoir(stream, 5); // 5 from an iterable of unknown length
ransu.shuffle(items); // a new array
ransu.shuffleInPlace(items); // the only mutating one
ransu.takeOut(items); // remove one and return it
ransu.weightedPick(items, [1, 3, 6]); // proportional to weights
ransu.weightedSample(items, w, 3); // 3 distinct, weighted
ransu.subset(items, 0.25); // each element kept with probability p
ransu.pickValue(obj);
ransu.sampleIntegers(10, 0, 1e9); // distinct, without building the range

const loot = ransu.weightedTable(items, [1, 3, 6]);
loot.pick(); // O(1) per draw, via the alias method
```

Arrays, typed arrays, strings, `Set`, `Map` and generators all work.

### Text

```ts
ransu.string(12); // 'k3Xq7bWm1zPd' — alphanumeric
ransu.string(8, ransu.alphabets.base58);
ransu.hex(32);
```

Uniform for any alphabet size, not just powers of two. Astral characters and
grapheme clusters work too — `length` counts characters, never UTF-16 units:

```ts
ransu.string(5, "🍎🍊🍇"); // '🍇🍎🍇🍊🍎'
ransu.string(5, ransu.graphemes("👍🏽🎉")); // skin tones stay intact
```

Full Unicode is a first-class option, with named blocks, explicit ranges and
sensible exclusions:

```ts
ransu.char({ blocks: "emoji" }); // '🚀'
ransu.chars(10, { blocks: "kana" });
ransu.codePoint({ blocks: ["greek", "cyrillic"] });
ransu.chars(20, { ranges: [[0x4e00, 0x9fff]] });
```

Surrogates can never come out, and controls, private-use areas and
noncharacters are excluded unless you opt back in. Blocks available:
`ascii`, `latin`, `latin1`, `latinExtended`, `greek`, `cyrillic`, `hebrew`,
`arabic`, `devanagari`, `thai`, `hiragana`, `katakana`, `kana`, `kanji`,
`hangul`, `cjk`, `punctuation`, `currency`, `arrows`, `math`, `box`,
`blockElements`, `geometric`, `braille`, `emoji`, `symbols`, `printable`
(the default), `bmp`, `all`.

| Option                                                    | Effect                                       |
| --------------------------------------------------------- | -------------------------------------------- |
| `ranges`                                                  | Explicit inclusive `[first, last]` pairs     |
| `blocks`                                                  | One or more names from `unicodeRanges`       |
| `bmpOnly`                                                 | Keep every character to a single UTF-16 unit |
| `allowControl` / `allowPrivateUse` / `allowNoncharacters` | Opt back in                                  |
| `filter`                                                  | Arbitrary per-code-point rejection           |

Reusing the same options? Build a `CodePointSet` once and pass it instead.

### Dice, shapes and colours

```ts
ransu.dice("3d6+2"); // 13
ransu.dice.detail("4d6"); // { total, dice, modifier }
ransu.d20();
ransu.coin(); // 'heads' | 'tails'

ransu.inCircle(5); // [x, y], uniform by area
ransu.onSphere(1); // [x, y, z]
ransu.inRect({ width: 800, height: 600 });

ransu.color(); // '#3f7ac2'
ransu.rgb(); // [63, 122, 194, 1]
ransu.color({ alpha: true }); // '#3f7ac2b3'
ransu.color({ format: "rgb" }); // 'rgb(63 122 194)'
```

### Identifiers

```ts
ransu.uuid(); // v4
ransu.uuid.v7(); // time-sortable — the good default for keys
ransu.uuid.v5("python.org", ransu.uuid.NAMESPACE.DNS);
ransu.nanoid(); // 21 URL-safe characters
ransu.ulid({ monotonic: true });
ransu.token(32); // a base64url secret
ransu.otp(6); // '042317'
ransu.password(16, { symbols: true });
```

**Every UUID version RFC 9562 defines** is here — v1 through v8, plus `NIL`,
`MAX`, `parse`, `stringify`, `validate`, `version`, `compare` and `timestamp`.
Names and argument order match the `uuid` package, so it is a drop-in
replacement. Identifiers draw from the platform CSPRNG unless you hand them an
engine on purpose.

### Distributions

Thirty-one of them, one call each:

```ts
ransu.normal(170, 6); // 168.42…
ransu.poisson(4); // 3
ransu.binomial(100, 0.3); // 28
ransu.exponential(2);
ransu.zipf(1.2, 1000);
```

Drawing repeatedly? Build the sampler once — it validates its parameters and
precomputes its constants up front. Same name, two shapes: **positional
arguments give you a number, an options object gives you a sampler**, and the
sampler lives in `ransu/distribution`.

```ts
import { normal, categorical } from "ransu/distribution";

const height = normal({ mean: 170, sd: 6 });
height.sample(); // one draw
height.samples(10_000); // a Float64Array
height.mean; // 170
height.variance; // 36

const loot = categorical({ weights: [70, 25, 5] }); // O(1) per draw
```

Continuous: `uniform`, `normal`, `logNormal`, `exponential`, `gamma`, `beta`,
`chiSquared`, `studentT`, `fisherF`, `cauchy`, `laplace`, `logistic`, `gumbel`,
`pareto`, `weibull`, `rayleigh`, `triangular`, `irwinHall`, `bates`,
`vonMises`, `dirichlet`.

Discrete: `bernoulli`, `discreteUniform`, `categorical`, `binomial`, `poisson`,
`geometric`, `negativeBinomial`, `hypergeometric`, `zipf`, `multinomial`.

The normal uses a 128-level ziggurat, gamma uses Marsaglia–Tsang, binomial and
Poisson switch between inversion and Hörmann's rejection methods by parameter.
Every one is checked in CI against its exact CDF or pmf, not just its mean.

Pass `{ engine }` to any factory to draw from a specific stream:

```ts
const r = new Random(42);
normal({ mean: 0, sd: 1, engine: r.engine }).sample();
```

### Retries and scheduling

```ts
import { backoff, jitter, date } from "ransu/time";

backoff(attempt); // exponential, with full jitter
backoff(attempt, { strategy: "decorrelated", previous });
jitter(60_000, 0.1); // a poll interval, spread by ±10%
date(startOfYear, now);
```

Retrying on a fixed schedule makes every client in a fleet retry at the same
instant. `backoff` implements the four standard strategies (`full`, `equal`,
`decorrelated`, `none`) so you do not have to.

### Stable randomness per key

```ts
import { rollout, bucket, hashPick } from "ransu/hash";

rollout(userId, 0.1); // in the 10% rollout? same answer everywhere
bucket(userId, 16); // a stable shard
hashPick(userId, ["control", "blue", "green"]);
```

No shared state and no coordination: the key alone decides. Widening a rollout
only ever adds users, never moves one out.

### Reproducibility

```ts
import { Random, engines } from "ransu";

const r = new Random(42); // xoshiro128++ by default
const p = new Random(42, { engine: engines.pcg32 });

const snapshot = r.getState(); // plain JSON
r.setState(snapshot); // …exactly where it was
const [a, b] = r.split(2); // independent streams for workers
```

Same seed, same sequence — including across ESM and CommonJS, and across
runtimes. Nine engines ship: `xoshiro128pp` (default), `xoshiro256pp`, `pcg32`
(with O(log n) `advance`), `sfc32`, `mulberry32`, `mt19937` (for compatibility),
`chacha20`, `nativeMath` and `cryptoRandom`.

You can also seed the global instance, which makes every top-level function
deterministic:

```ts
import { seed, integer } from "ransu";
seed(42);
integer(1, 6);
```

> Libraries should own a `new Random()` instead of calling the global, since an
> application may re-seed it at any time.

### Security

```ts
import { integer, shuffle, token } from "ransu/secure";
```

`ransu/secure` mirrors the core API on top of the platform CSPRNG and refuses to
be seeded. Use it for prize draws, invite codes, session tokens and any shuffle
an adversary must not be able to predict.

## Subpath entries

One subpath per thing, so an import says what it brings in.

| Import                | Contents                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `ransu`               | Everything ergonomic: numbers, collections, strings, identifiers, distributions, `Random` |
| `ransu/engine`       | Every engine, as classes and seedable factories                                           |
| `ransu/distribution` | Sampler factories for all 31 distributions                                                |
| `ransu/uuid`          | Every UUID version, plus parse / stringify / validate / compare                           |
| `ransu/nanoid`        | nanoid only                                                                               |
| `ransu/ulid`          | ULID only                                                                                 |
| `ransu/token`         | Tokens, one-time codes, passwords                                                         |
| `ransu/unicode`       | Code points, blocks, grapheme-aware strings                                               |
| `ransu/secure`        | The same API as the root, CSPRNG-backed and unseedable                                    |
| `ransu/time`          | Random dates, jitter and retry backoff                                                    |
| `ransu/hash`          | Stable per-key randomness: A/B rollout, bucketing, sharding                               |
| `ransu/compat`        | Adapters to and from `Math.random`, `seedrandom`, `pure-rand`                             |

Plural names (`engines`, `distributions`) are bags of interchangeable
implementations you pick one from; singular names are one thing each.

The root re-exports the whole ergonomic surface, so subpaths are for clarity
and for consumers without a bundler — tree-shaking already keeps unused exports
out of your build either way.

## Drop-in for other libraries

```ts
import { toMathRandom } from "ransu/compat";

const rng = toMathRandom(new Random(42));
lodash.shuffle(deck, rng); // now deterministic
```

## Requirements

Node.js >= 18, or any runtime with `globalThis.crypto` — browsers, Deno, Bun,
Cloudflare Workers, Vercel Edge. ransu has no static dependency on any Node
built-in, and never returns a Promise.

## Performance

`pnpm bench` reports every case relative to `Math.random()` measured in the
same run. Absolute nanoseconds move with machine load; ratios do not.

| | vs `Math.random()` |
| --- | --- |
| `random()`, seeded xoshiro128++ | 1.21x |
| `integer(1, 6)`, seeded | **0.99x** |
| `Math.floor(Math.random()*6)+1`, **biased** | 1.21x |
| `pick(arr)` | 1.38x |
| `normal()` | 1.56x |
| `bytes(n)` in bulk, per byte | 0.09x |

An unbiased `integer(1, 6)` now costs about what the biased one-liner costs, so
correctness is not something you trade speed for.

Raw engine throughput, `nextUint32()` relative to one `Math.random()`:

| Engine | |
| --- | --- |
| `mulberry32` | 0.36x |
| `xoshiro128pp` (default) | 0.36x |
| `sfc32` | 0.38x |
| `nativeMath` | 1.29x |
| `mt19937` | 1.73x |
| `pcg32` | 2.2x |
| `chacha20` | 7.6x |

Bulk fills reach roughly 600 MB/s from the seeded engine and 2 GB/s from the
platform CSPRNG, so `bytes(n)` for large `n` is limited by memory rather than
by generation.

## Documentation

Guides and full reference: **[ransu.otnc.dev](https://ransu.otnc.dev)**, built from
`pages/` with Astro Starlight.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

Distributed under the [MIT License](./LICENSE).
