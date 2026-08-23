---
title: Runtimes
description: Where ransu runs, and how it finds a secure random source.
---

| Runtime                         | Status                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| Node 19+                        | Full support                                                  |
| Node 18                         | Full support in CommonJS; in ESM, secure APIs need a polyfill |
| Deno, Bun                       | Full support                                                  |
| Browsers                        | Full support                                                  |
| Cloudflare Workers, Vercel Edge | Full support                                                  |
| React Native                    | Needs `react-native-get-random-values`                        |

ransu has zero dependencies and **no static import of any Node built-in**, so
bundling it for an edge runtime pulls in nothing that will fail to resolve.

## Finding the CSPRNG, synchronously

No public API returns a Promise — not even UUID v5, which needs a SHA-1. That
constraint shapes two things.

**Finding a secure source.** In order:

1. `globalThis.crypto.getRandomValues` — browsers, Deno, Bun, workerd, Node 19+
2. `process.getBuiltinModule('node:crypto')` — Node 22.3+, still synchronous
3. `require('node:crypto')` — the CommonJS build on older Node
4. Nothing: secure APIs throw `NO_CRYPTO`, and seeding falls back to a weaker
   source rather than refusing to run

**Hashing.** `crypto.subtle.digest` is asynchronous, so UUID v3 and v5 use
synchronous MD5 and SHA-1 implementations bundled with the library. They are
used for identifier derivation and nothing else.

## Why not WebAssembly

A WASM kernel has to be instantiated, and `WebAssembly.instantiate` is
asynchronous. The synchronous `new WebAssembly.Module()` is capped at 4 KB on a
browser main thread and is not permitted at runtime in Cloudflare Workers, so a
WASM core could not keep the no-Promise contract everywhere.

Beyond that, the hot path is a handful of 32-bit operations, and the JS-to-WASM
call overhead is larger than the work itself. WASM only pays off for bulk buffer
fills, where a JIT-compiled JavaScript loop is already close.

So: no WASM in the core, and none planned unless a measurement says otherwise.
`pnpm bench` is in the repository so you can check the claim yourself.
