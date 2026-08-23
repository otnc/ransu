---
title: Per-key randomness
description: Stable answers derived from a key, with no shared state.
---

```ts
import { rollout, bucket, hashPick, hashFloat, hashRandom } from "ransu/hash";
```

Sometimes you do not want a _stream_ — you want the same answer for the same
key, on every machine, forever, with nothing to coordinate.

```ts
rollout(userId, 0.1); // in the 10% rollout?
bucket(userId, 16); // a stable shard
hashPick(userId, ["control", "blue", "green"]); // a stable variant
hashFloat(userId); // a stable [0, 1)
```

## Why not a seeded generator

A seeded generator gives you a _sequence_. Two processes that draw a different
number of values before reaching the same user get different answers, and any
restart or reorder shifts everyone. Deriving from the key sidesteps all of it:
there is no position to keep in sync.

## Growing a rollout only adds

`rollout(key, p)` is `hashFloat(key) < p`, so raising `p` can only ever bring
more keys in. Nobody gets taken back out when you widen an experiment — a
property CI checks explicitly.

```ts
rollout("user-7", 0.1); // false
rollout("user-7", 0.5); // may become true, never the reverse
```

## Salts keep experiments independent

Without a salt, every feature flag would bucket users identically and the same
unlucky 10% would get every experiment:

```ts
rollout(userId, 0.1, "new-checkout");
rollout(userId, 0.1, "new-search"); // an unrelated 10%
```

## A whole stream from a key

When one value is not enough — generating a consistent set of fixtures per user,
for example:

```ts
const r = hashRandom(userId);
r.integer(1, 100);
r.pick(themes);
```
