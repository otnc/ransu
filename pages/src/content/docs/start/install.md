---
title: Install
description: Adding ransu to a project, and what it needs from the runtime.
---

```sh
npm install ransu
# or
pnpm add ransu
```

## Requirements

Node.js 18 or newer, or any runtime that exposes `globalThis.crypto`:

- Node, Deno, Bun
- Browsers
- Cloudflare Workers, Vercel Edge and other `workerd`-style runtimes
- React Native, with a `crypto.getRandomValues` polyfill

ransu has **zero dependencies** and no static import of any Node built-in, so
bundling it for the browser or an edge runtime pulls in nothing extra.

## What needs a secure source

Only the identifier APIs and `ransu/secure` require a CSPRNG. Everything else
falls back to a weaker source for seeding rather than refusing to run, so a
runtime without `crypto` can still use the whole library except for tokens.

If a secure source is missing and you ask for one, you get a `NO_CRYPTO` error
that names the polyfill to install rather than a silently weak token.

## Module systems

Both work, and `require` gives you the namespace itself rather than a `.default`
wrapper:

```js
import ransu from "ransu";
import { integer } from "ransu";

const ransu = require("ransu");
const { integer } = require("ransu");
```
