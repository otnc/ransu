---
title: Security
description: Which APIs are safe for secrets, and which are not.
---

```ts
import { integer, shuffle, token } from "ransu/secure";
```

`ransu/secure` mirrors the root API on top of the platform CSPRNG and **refuses
to be seeded**. Reach for it whenever an attacker gaining an advantage would
matter.

## Which to use

| Situation                                 | Import from                 |
| ----------------------------------------- | --------------------------- |
| Session tokens, API keys, password resets | `ransu/secure` or `token()` |
| Invite and coupon codes                   | `ransu/secure`              |
| Prize draws, lotteries, matchmaking       | `ransu/secure`              |
| A shuffle a player must not predict       | `ransu/secure`              |
| Games, simulations, UI, test data         | `ransu`                     |

## Identifiers are already secure

`uuid`, `nanoid`, `ulid`, `token`, `otp` and `password` draw from the CSPRNG
even when imported from the root. You only lose that by passing an engine on
purpose, which exists for tests.

## Why not just seed something

A seeded generator is reproducible, and reproducible means predictable. Anyone
who learns the seed can compute every value you will ever draw from it. That is
why `ransu/secure` has no `seed`:

```ts
import { seed } from "ransu/secure";
seed();
// RansuError: ransu/secure cannot be seeded — a predictable stream would
// defeat its purpose.
```

## What ransu does not do

- It does not implement encryption, signing or key derivation.
- The ChaCha20 engine exists to give a _seeded_ stream that is hard to predict —
  a prize draw you can replay for an auditor. It is not exported as a
  cryptographic primitive.
- Timing side channels are out of scope, though the rejection loops in
  `ransu/secure` do not branch on secret values.
