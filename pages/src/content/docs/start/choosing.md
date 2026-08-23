---
title: Choosing an API
description: Namespace, named imports or an instance — and when each one fits.
---

There is one name per function. `ransu.integer`, the named export `integer` and
`Random#integer` are **the same function object**, not three wrappers.

## Three ways in

```ts
// 1. Namespace — the shortest thing to type.
import ransu from "ransu";
ransu.integer(1, 6);

// 2. Named exports — tree-shakeable.
import { integer, pick, shuffle } from "ransu";
integer(1, 6);

// 3. An instance — reproducible, and isolated from everyone else.
import { Random } from "ransu";
new Random(42).integer(1, 6);
```

## Which one

| Situation                                  | Use                 |
| ------------------------------------------ | ------------------- |
| A script, a prototype, a test fixture      | the namespace       |
| Application code where bundle size matters | named exports       |
| **A library you publish**                  | an instance, always |
| Anything that must replay identically      | an instance         |
| Tokens, invite codes, prize draws          | `ransu/secure`      |

### Libraries should own an instance

The namespace and the named exports both draw from one global stream, and any
application can re-seed it:

```ts
import { seed } from "ransu";
seed(42);
```

That is a feature for applications and a hazard for libraries. If your package
draws from the global, an application seeding it changes your behaviour. Own a
`new Random()` instead and nobody can reach it.

## Names with bare words

Named exports use plain words — `integer`, `sample`, `range`, `string`. That
keeps one name per function, at the cost of importing common identifiers into
your scope. If that collides, import the namespace or alias at the import site:

```ts
import { integer as randomInteger } from "ransu";
```
