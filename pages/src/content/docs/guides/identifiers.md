---
title: Identifiers
description: Every UUID version, plus ULID, nanoid, tokens, one-time codes and passwords.
---

```ts
ransu.uuid(); // v4
ransu.uuid.v7(); // time-sortable
ransu.nanoid(); // 21 URL-safe characters
ransu.ulid({ monotonic: true });
ransu.token(32); // a base64url secret
ransu.otp(6); // '042317'
ransu.password(16, { symbols: true });
```

All of them draw from the platform CSPRNG by default, whichever entry point you
came through.

## Which identifier

| Need                              | Use                                                  |
| --------------------------------- | ---------------------------------------------------- |
| A database primary key            | `uuid.v7()` — sorts by time, so indexes stay compact |
| A short URL-safe id               | `nanoid()`                                           |
| A sortable id shorter than a UUID | `ulid()`                                             |
| A derived, stable id              | `uuid.v5(name, namespace)`                           |
| A session token or secret         | `token()`                                            |
| Compatibility with existing data  | whichever version that data uses                     |

## UUID: every version

RFC 9562 defines v1 through v8, and all of them are here.

| Version | What it is                                                   |
| ------- | ------------------------------------------------------------ |
| `v1`    | 60-bit timestamp, clock sequence and node ID                 |
| `v2`    | DCE Security. Included for completeness, **not recommended** |
| `v3`    | MD5 of a namespace and a name — deterministic                |
| `v4`    | 122 random bits. The default                                 |
| `v5`    | SHA-1 of a namespace and a name — prefer this over v3        |
| `v6`    | v1 reordered so byte order matches time order                |
| `v7`    | Unix milliseconds plus randomness. Sorts chronologically     |
| `v8`    | Custom: your own 122 bits                                    |

Plus `NIL`, `MAX`, `parse`, `stringify`, `validate`, `version`, `compare`,
`timestamp`, `v1ToV6` and `v6ToV1`.

Names and argument order match the `uuid` package, so it is a drop-in
replacement:

```ts
ransu.uuid.v5("python.org", ransu.uuid.NAMESPACE.DNS);
// '886313e1-3b8a-5372-9b90-0c9aee199e5d'
```

### No MAC address

JavaScript cannot read one, so v1 and v6 use a random node ID with the
multicast bit set, exactly as RFC 9562 §6.10 requires.

### Monotonic within a millisecond

v7 uses the RFC 9562 method-3 counter, so identifiers made in the same
millisecond still increase. When the counter runs out it borrows the next
millisecond rather than repeating.

## Deterministic identifiers for tests

Pass an engine and the identifier becomes reproducible. Each engine keeps its
own clock and node state, so a fresh seeded engine always replays the same way:

```ts
import { xoshiro128pp } from "ransu/engines";

uuid.v4({ engine: xoshiro128pp(1) });
uuid.v7({ engine: xoshiro128pp(1), now: 1_700_000_000_000 });
```

Do this in tests only. An identifier drawn from a seeded engine is predictable
by anyone who can guess the seed.
