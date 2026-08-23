---
title: Numbers and ranges
description: Uniform numbers, and which end of a range is included.
---

```ts
ransu.random(); // [0, 1)
ransu.float(-1, 1); // [min, max)
ransu.integer(1, 6); // [min, max] — inclusive
ransu.below(arr.length); // [0, n)     — what indices want
ransu.range(0, 100, 5); // Python's randrange
ransu.bigint(0n, 2n ** 128n);
ransu.bool(); // true or false, evenly
ransu.chance(0.25); // true a quarter of the time
ransu.oneIn(20);
ransu.sign(); // -1 or 1
ransu.bits(12); // Python's getrandbits
ransu.bytes(32); // Uint8Array
ransu.floats(1000); // Float64Array
ransu.integers(1000, 1, 6); // bounds validated once, not per element
```

## Which end is included

This is the one thing worth memorising.

| Call                       | Range                        |
| -------------------------- | ---------------------------- |
| `integer(min, max)`        | **`[min, max]`** — both ends |
| `bigint(min, max)`         | **`[min, max]`** — both ends |
| `below(n)`                 | `[0, n)`                     |
| `range(start, stop, step)` | `[start, stop)`              |
| `float(min, max)`          | `[min, max)`                 |
| `date(from, to)`           | `[from, to)`                 |

`integer` matches Python's `randint` and a die: `integer(1, 6)` can return 6.
For an array index you want `below(arr.length)` or `pickIndex(arr)` — writing
`integer(0, arr.length)` is the classic off-by-one, and no type can catch it.

## No modulo bias

Ranges up to 2^32 use Lemire's nearly-divisionless method; larger ones use
rejection over two words. Anything wider than 2^53 throws `RANGE_TOO_LARGE` and
points you at `bigint`, rather than silently rounding.

```ts
ransu.integer(0, Number.MAX_SAFE_INTEGER);
// RansuError: integer(...) spans more than 2^53 values … Use bigint(min, max)
```

## Bulk draws

`floats(n)` and `integers(n, min, max)` return typed arrays and validate their
bounds **once** instead of per element. Use them for simulations.

```ts
const noise = ransu.floats(1_000_000);
const rolls = ransu.integers(1_000_000, 1, 6);
```
