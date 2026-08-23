---
title: From other libraries
description: What the equivalent call is, coming from another random package.
---

## From `Math.random()`

| Instead of                                    | Write                           |
| --------------------------------------------- | ------------------------------- |
| `Math.random()`                               | `random()`                      |
| `Math.floor(Math.random() * n)`               | `below(n)` — and it is unbiased |
| `arr[Math.floor(Math.random() * arr.length)]` | `pick(arr)`                     |
| A hand-written Fisher–Yates                   | `shuffle(arr)`                  |

## From lodash

| lodash | ransu |
| --- | --- |
| `_.random(0, 5)` | `integer(0, 5)` — same inclusive bounds |
| `_.random(5)` | `integer(0, 5)`; ransu always wants both bounds |
| `_.random(0, 5, true)` | `float(0, 5)` — a separate function, not a flag |
| `_.sample(arr)` | `pick(arr)` |
| `_.sampleSize(arr, n)` | `sample(arr, n)` |
| `_.shuffle(arr)` | `shuffle(arr)` |

Two deliberate differences. `_.sample([])` returns `undefined`; `pick([])` throws,
so the return type stays `T` — use `tryPick` when empty is expected. And lodash
picks float or integer from a boolean flag, while ransu gives them separate
names, because a flag at the end of an argument list is easy to misread.

## From Python's `random`

Every function in the module has an equivalent.

| Python | ransu |
| --- | --- |
| `random()` | `random()` |
| `uniform(a, b)` | `float(a, b)` |
| `randint(a, b)` | `integer(a, b)` |
| `randrange(start, stop, step)` | `range(start, stop, step)` |
| `getrandbits(k)` | `bits(k)` |
| `randbytes(n)` | `bytes(n)` |
| `choice(seq)` | `pick(seq)` |
| `choices(seq, weights, k=n)` | `choices(seq, n)` or `weightedPick(seq, weights)` |
| `sample(seq, k)` | `sample(seq, k)` |
| `sample(range(n), k)` | `sampleIntegers(k, 0, n - 1)` |
| `shuffle(seq)` | `shuffleInPlace(seq)` |
| `seed`, `getstate`, `setstate` | `seed`, `getState`, `setState` |
| `gauss`, `normalvariate` | `normal(mu, sigma)` |
| `lognormvariate` | `logNormal` |
| `expovariate` | `exponential` |
| `gammavariate` | `gamma` |
| `betavariate` | `beta` |
| `paretovariate` | `pareto` |
| `weibullvariate` | `weibull` |
| `vonmisesvariate` | `vonMises` |
| `triangular` | `triangular` |
| `binomialvariate` | `binomial` |
| `SystemRandom` | `ransu/secure` |

`sample(range(n), k)` deserves the note: Python can do it because `range` is
lazy. JavaScript has no lazy range, so `sampleIntegers` exists to draw distinct
integers without building the range first.

## From `randplus`

| randplus | ransu |
| --- | --- |
| `random(inc)` | `random()`, or `float(0, 1)` |
| `number(a, b, inc)` | `float(a, b)` — always half-open |
| `integer(a, b, inc)` | `integer(a, b)` — always inclusive |
| `boolean()` | `bool()` |
| `array(arr)` | `pick(arr)` |
| `string(len)`, `string(input, len)` | `string(len)`, `string(len, alphabet)` |
| `shuffle(input)` | `shuffle(arr)` or `shuffleString(str)` |
| `color()`, `color.hex()` | `color()` |
| `color.rgb()` | `rgb()` |
| `color.word(lang)` | no equivalent, see below |
| `buffer(len)` | `bytes(len)` — a `Uint8Array` |

Three differences worth knowing.

The `inc` flag is gone. Boundaries are fixed per function instead:
`integer` includes both ends, `float` and `range` exclude the upper one. A
boolean at the end of a call is easy to get backwards, and getting it backwards
is silent.

`buffer()` returned a Node `Buffer`. `bytes()` returns a `Uint8Array`, because
ransu has no static dependency on a Node built-in and has to run on the edge.
`Buffer.from(bytes(32))` converts if you need the Node type.

`color.word()` returned a colour name in English, Japanese or Chinese. There
is no equivalent: translated word lists are locale data, and ransu does not ship
any. `color()` gives hex, `rgb()` or `hsl()` notation instead, with optional
opacity.

## From `random-js`

| `random-js`                                | ransu                                                   |
| ------------------------------------------ | ------------------------------------------------------- |
| `new Random(MersenneTwister19937.seed(x))` | `new Random(x, { engine: mt19937 })`                    |
| `r.integer(min, max)`                      | `r.integer(min, max)` — same inclusive bounds           |
| `r.real(min, max)`                         | `r.float(min, max)`                                     |
| `r.pick(arr)`                              | `r.pick(arr)`                                           |
| `r.shuffle(arr)`                           | `r.shuffleInPlace(arr)`, or `r.shuffle(arr)` for a copy |

## From `seedrandom`

```ts
// before
const rng = seedrandom("seed");
rng();

// after
const r = new Random("seed");
r.random();
```

To keep an existing `seedrandom` instance and feed it to ransu:

```ts
import { fromSeedrandom } from "ransu/compat";

new Random(fromSeedrandom(rng));
```

## From `uuid`

Drop-in: same names, same argument order.

```ts
import { v4, v5, parse, validate } from "ransu/uuid";
```

## From `nanoid`

```ts
import { nanoid } from "ransu/nanoid";
```

Same alphabet, same default length, same collision profile.

## From `d3-random`

d3 returns a callable source; ransu returns a sampler object.

```ts
// before
const r = d3.randomNormal(170, 6);
r();

// after
const r = normal({ mean: 170, sd: 6 });
r.sample();
```

## Into libraries that expect `Math.random`

```ts
import { toMathRandom } from "ransu/compat";

const rng = toMathRandom(new Random(42));
lodash.shuffle(deck, rng); // now deterministic
```
