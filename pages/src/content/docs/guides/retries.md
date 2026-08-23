---
title: Retries and scheduling
description: Backoff and jitter, so a fleet stops retrying in lockstep.
---

```ts
import { backoff, jitter, date, duration } from "ransu/time";
```

## Backoff

```ts
backoff(attempt); // full jitter, the default
backoff(attempt, { base: 250, max: 60_000 });
backoff(attempt, { strategy: "decorrelated", previous });
```

Retrying on a fixed schedule makes every client in a fleet retry at the same
instant, which is exactly when the service can least afford it. The strategies:

| Strategy       | Delay                            | When                                   |
| -------------- | -------------------------------- | -------------------------------------- |
| `full`         | anywhere in `[0, cap)`           | The default. Strongest de-synchroniser |
| `equal`        | `cap/2` plus a random half       | When you want a floor on the wait      |
| `decorrelated` | walks up from the previous delay | Recovers faster after a long outage    |
| `none`         | plain exponential                | Tests, and reasoning about the cap     |

`cap` is `min(max, base × factor^attempt)`, with `base` 100 ms, `factor` 2 and
`max` 30 s by default.

```ts
let previous = 100;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    return await send();
  } catch {
    previous = backoff(attempt, { strategy: "decorrelated", previous });
    await sleep(previous);
  }
}
```

## Jitter

Spread anything that would otherwise line up — poll intervals, cache TTLs, cron
offsets:

```ts
jitter(60_000, 0.1); // a one-minute poll, spread across [54s, 66s)
```

## Dates

```ts
date(new Date("2020-01-01"), new Date("2021-01-01"));
pastDate(30); // some point in the last 30 days
futureDate(7); // some point in the next 7 days
duration(100, 500); // milliseconds
```

`date` takes `Date` objects or millisecond numbers, and the range is half-open.
