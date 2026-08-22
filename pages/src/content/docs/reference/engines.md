---
title: Engines
description: The nine generators, and when each is the right one.
---

```ts
import { xoshiro128pp, pcg32, mt19937 } from "ransu/engines";

new Random(42); // xoshiro128++
new Random(42, { engine: pcg32 });
new Random(mt19937(42)); // a constructed engine
```

| Engine         | State       | Period                | Use it when                                                       |
| -------------- | ----------- | --------------------- | ----------------------------------------------------------------- |
| `xoshiro128pp` | 4×32        | 2^128−1               | **The default.** 32-bit only, which is what JavaScript is fast at |
| `xoshiro256pp` | 4×64        | 2^256−1               | A stream has to line up with a Rust or C implementation           |
| `pcg32`        | 64+64       | 2^64                  | You need `advance(n)`: skip or rewind N draws in O(log N)         |
| `sfc32`        | 4×32        | ~2^127                | Minimal code, no jump-ahead needed                                |
| `mulberry32`   | 1×32        | 2^32                  | Code size dominates. Too short for long runs                      |
| `mt19937`      | 624×32      | 2^19937−1             | Interoperating with existing Mersenne Twister data                |
| `chacha20`     | key+counter | effectively unbounded | Seeded _and_ hard to predict                                      |
| `nativeMath`   | —           | —                     | `Math.random`. Fastest, not seedable                              |
| `cryptoRandom` | —           | —                     | The platform CSPRNG. Not seedable                                 |

## Writing your own

One required method:

```ts
const myEngine = {
  algorithm: "my-prng",
  seedable: false,
  nextUint32: () => 0, // 32 uniform bits
};

new Random(myEngine);
```

Optional members — `nextFloat64`, `fillBytes`, `getState`, `clone`, `split`,
`jump`, `reseed` — are detected once when the engine is adopted and used as a
fast path when present.

A bare `() => number` in `[0, 1)` also works, so `Math.random`, `seedrandom` and
similar drop straight in.

## MT19937 is for compatibility only

It is slow to seed, carries 2.5 KB of state, and fails statistical tests the
others pass. It is here so you can read existing data, not for new work.

## ChaCha20 is not a crypto API

It gives a stream that is both seeded and hard to predict — a prize draw you can
replay for an auditor. ransu does not expose it as a cryptographic primitive.
