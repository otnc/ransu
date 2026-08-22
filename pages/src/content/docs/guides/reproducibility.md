---
title: Reproducibility
description: Seeds, state, splitting, and what stays the same between versions.
---

```ts
import { Random, engines } from "ransu";

const r = new Random(42); // xoshiro128++ by default
const p = new Random(42, { engine: engines.pcg32 });

r.integer(1, 6);
```

Same seed, same sequence — across runs, runtimes, and ESM versus CommonJS.

## Seeds

Numbers, bigints, strings, byte arrays and number arrays all work:

```ts
new Random(42);
new Random("my-fixture");
new Random(2n ** 70n);
new Random(new Uint8Array([1, 2, 3]));
```

Every seed goes through a mixing step first. Feeding a raw seed straight into a
PRNG is the classic way to get correlated streams from nearby seeds; `new
Random(1)` and `new Random(2)` are unrelated here.

## Saving and restoring

```ts
const snapshot = r.getState(); // plain JSON: send it anywhere
r.setState(snapshot); // exactly where it was
```

Restoring into a different algorithm throws `STATE_MISMATCH` instead of
producing quiet nonsense.

## Independent streams

```ts
const [a, b] = r.split(2); // for workers, shards, parallel simulations
```

Engines with a jump polynomial give non-overlapping streams; the others derive
child seeds, which is enough for practical independence.

## Seeding the global

```ts
import { seed, integer } from "ransu";

seed(42);
integer(1, 6); // deterministic from here on
```

The global starts on `Math.random`, which cannot be seeded, so `seed()` swaps in
xoshiro128++. Applications may do this; libraries should not rely on it.

## The stream contract

Within one major version, the same engine and seed produce the same output. That
covers engine bits, the core conversions, the order in which `shuffle`, `sample`
and `weighted` consume values, and every distribution algorithm.

A faster algorithm gets a **new name** rather than replacing an existing one.
CI holds golden snapshots of every engine's first outputs, so an accidental
change fails the build.

Time-based identifiers (UUID v1, v6, v7 and ULID) depend on the wall clock and
are outside this contract. Pass `now` to make them deterministic.
