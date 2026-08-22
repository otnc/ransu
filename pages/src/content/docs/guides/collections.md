---
title: Collections
description: Picking, sampling and shuffling, with the right algorithm for the shape.
---

Arrays, typed arrays, strings, `Set`, `Map` and generators all work anywhere a
collection is accepted.

```ts
ransu.pick(items); // one element (throws if empty)
ransu.tryPick(items); // …or undefined
ransu.pickIndex(items);
ransu.pickKey(obj);
ransu.pickEntry(obj);

ransu.choices(items, 5); // 5, with replacement
ransu.sample(items, 5); // 5 distinct, random order
ransu.combination(items, 5); // 5 distinct, original order
ransu.reservoir(stream, 5); // 5 from an iterable of unknown length

ransu.shuffle(items); // a new array
ransu.shuffleInPlace(items); // the only mutating one
ransu.partialShuffle(items, 3); // top 3 of a million, in O(k)
ransu.permutation(52);
ransu.takeOut(items); // remove one and return it

ransu.weighted(items, [1, 3, 6]);
ransu.weightedSample(items, w, 3); // distinct, weighted
```

## Empty collections

`pick([])` throws `EMPTY_COLLECTION` so that the return type stays `T` rather
than `T | undefined`. When empty is expected, use `tryPick`.

## Which sampling function

| You want                            | Use              | Cost             |
| ----------------------------------- | ---------------- | ---------------- |
| Repeats allowed, `k` may exceed `n` | `choices`        | `O(k)`           |
| Distinct, order does not matter     | `combination`    | `O(k)` or `O(n)` |
| Distinct, shuffled result           | `sample`         | `O(k)` or `O(n)` |
| From a stream of unknown length     | `reservoir`      | one pass         |
| Just the top few of a huge array    | `partialShuffle` | `O(k)`           |

`sample` picks its algorithm from the shape: Floyd's when `k` is small relative
to `n` (no copy of the input), a partial Fisher–Yates otherwise. Both give every
subset equal probability.

## Repeated weighted draws

`weighted` is a single linear pass with no allocation — right for a one-off.
When the same weights are sampled over and over, build the table once:

```ts
const loot = ransu.weightedTable(items, [70, 25, 5]);
loot.pick(); // O(1), via Vose's alias method
```

## Mutation

Only two functions mutate, and both say so: `shuffleInPlace` and `takeOut`.
Everything else returns a new array.
