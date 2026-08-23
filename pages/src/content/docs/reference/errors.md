---
title: Errors
description: Every error code, and what triggers it.
---

ransu throws exactly one error type. `code` is for programs, `message` is for
people, and every message says what to do instead.

```ts
import { RansuError } from "ransu";

try {
  pick([]);
} catch (error) {
  if (error instanceof RansuError && error.code === "EMPTY_COLLECTION") {
    // …
  }
}
```

| Code                | Trigger                                               |
| ------------------- | ----------------------------------------------------- |
| `EMPTY_COLLECTION`  | Picking from an empty collection                      |
| `INVALID_ARGUMENT`  | A parameter is the wrong shape or out of bounds       |
| `INVALID_RANGE`     | `min > max`, or an empty range                        |
| `INVALID_WEIGHTS`   | Negative, NaN, all-zero, or a length mismatch         |
| `NOT_INTEGER`       | A non-integer where an integer is required            |
| `NO_CRYPTO`         | The runtime has no CSPRNG and a secure API was called |
| `RANGE_TOO_LARGE`   | A range wider than 2^53 asked of an integer API       |
| `SAMPLE_TOO_LARGE`  | `k > n` without replacement                           |
| `STATE_MISMATCH`    | Restoring state into a different algorithm or version |
| `UNSEEDABLE_ENGINE` | Seeding something that must not be seeded             |

## No silent fallbacks

Bounds are never swapped, ranges are never truncated, and a missing CSPRNG never
degrades to `Math.random`. Each of those would produce plausible-looking output
that is quietly wrong, which is worse than a stack trace.
