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
