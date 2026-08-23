---
title: Naming
description: The four rules every function name in ransu follows.
---

You should be able to guess a name before you look it up. These are the rules
that make that possible; a name that breaks one of them is a bug worth
reporting.

## 1. A name says what you get, or what you do

A generator is named for the value it hands back:

```ts
integer(1, 6); // an integer
float(); // a float
bytes(16); // bytes
color(); // a colour
uuid(); // a UUID
```

An operation on a collection **you** supply is named for the action instead:

```ts
pick(items);
sample(items, 3);
shuffle(items);
```

Singular returns one, plural returns many — `float`/`floats`,
`integer`/`integers`, `char`/`chars`.

## 2. A name reads as English

Say the name out loud with its qualifier attached; the word order follows from
that. "weighted pick", "pick index", "shuffle in place", "hash integer", "past
date":

```ts
weightedPick(items, weights);
pickIndex(items);
shuffleInPlace(items);
hashInteger("user-42", 0, 99);
pastDate({ days: 30 });
```

A bare adjective is not a name. This function used to be called `weighted()`,
which said nothing about whether you got one item or several.

## 3. The prevailing word wins over a new one

Where Python's `random`, lodash or an RFC already has a word for something,
ransu uses their word rather than a better one: `shuffle`, `sample`, `choices`,
`reservoir`, `uuid.v7`. Knowing one of those libraries should not cost you a
second vocabulary.

That is why `reservoir()` keeps an algorithm's name. It is the term the
technique is documented under everywhere else, and it is shorter than any
description of it.

## 4. Short wins, but never by abbreviating

Between two understandable names, ransu takes the shorter. But `int`, `rdm` and
`str` are not names — they are typing saved at the reader's expense.

A name only ever grows longer for one of two reasons: to spell out a
short form (`hashInt` became `hashInteger`), or to complete a pair.

| Pair                         | Why both exist                     |
| ---------------------------- | ---------------------------------- |
| `angle` / `angleDegrees`     | radians and degrees                |
| `pastDate` / `futureDate`    | either side of now                 |
| `onSphere` / `inSphere`      | the surface and the volume         |
| `pick` / `weightedPick`      | uniform and weighted               |
| `sample` / `weightedSample`  | uniform and weighted, many at once |

## No two names for one function

Every function has exactly one name. The namespace property, the named export
and the `Random` method are the same function object, not three wrappers:

```ts
import ransu, { integer, Random } from "ransu";

ransu.integer === integer; // true
```

The same rule applies across names. `bool()` is the fair coin and `chance(p)`
is the weighted one:

```ts
bool(); // true or false, evenly
chance(0.25); // true a quarter of the time
oneIn(20); // true once in twenty
```

While `bool(p)` also accepted a probability, `bool(0.25)` and `chance(0.25)`
were one function reachable under two names, and you had to pick between them
for no reason. Now each covers a case the other does not.
