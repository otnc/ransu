# Contributing

Thanks for your interest in improving ransu!
This guide gets you set up and explains how the project is put together.
If anything here is unclear, opening an issue to ask is welcome.

## Getting set up

You'll need Node.js >= 20 and pnpm.

```sh
corepack enable
pnpm install
```

This is a pnpm workspace: the library is the root package and `pages/` is the
documentation site. Commit `pnpm-lock.yaml`.

### Dependency versions live in one place

Every version is declared once in the `catalog:` block of
`pnpm-workspace.yaml`, and each package writes `catalog:` instead of a range.
Bumping TypeScript means editing one line, and the library and the docs site
cannot drift onto different versions.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Bundle ESM/CJS + type declarations with tsdown |
| `pnpm test` | Unit tests — the everyday loop, a few seconds |
| `pnpm test:stat` | Statistical suite: KS and chi-square against exact distributions |
| `pnpm test:all` | Both — what CI runs |
| `pnpm test:watch` | Keep the unit tests running |
| `pnpm test:coverage` | Coverage report |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |
| `pnpm format` | Format everything with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm lint` | Lint with ESLint, including type-aware rules |
| `pnpm lint:fix` | Lint, writing the fixes |
| `pnpm check` | Format then lint, writing both |
| `pnpm ci` | The same checks without writing — what CI runs |
| `pnpm sync:exports` | Regenerate the package.json `exports` map from `scripts/entries.mjs` |
| `pnpm check:exports` | Fail if that map is stale |
| `pnpm bench` | Measure throughput against `Math.random` (needs `pnpm build` first) |
| `pnpm docs` | Run the documentation site locally |
| `pnpm docs:build` | Build the site, including the generated API reference |
| `pnpm docs:deploy` | Push the built docs to Cloudflare, live immediately (needs `pnpm docs:build` first) |
| `pnpm docs:version` | Upload a Cloudflare version/preview without shifting production traffic (needs `pnpm docs:build` first) |
| `pnpm smoke` | Check every import shape against the built `dist/` (needs `pnpm build` first) |
| `pnpm check:types` | Check the published types resolve under every module mode (needs `pnpm build` first) |
| `pnpm check:examples` | Run and type-check every `@example` against the built package (needs `pnpm build` first) |

Before opening a pull request, make sure the full set passes:

```sh
pnpm ci && pnpm typecheck && pnpm check:exports && pnpm test:all &&
  pnpm build && pnpm smoke && pnpm check:types && pnpm check:examples
```

## Conventions

- **Prettier formats, ESLint checks** (`.prettierrc.json`, `eslint.config.js`).
  Running `pnpm check` before you commit handles both.
  ESLint runs the **type-aware** rule set, so it needs a TypeScript program and
  is slower than a syntax-only linter — that is deliberate: those are the rules
  that catch an `any` leaking out of `new Array(n)` or a predicate narrowing an
  argument to `never`.
- **Tests live next to the code** as `*.test.ts` and run with vitest.
- **Comments and docs are in English** and kept minimal.
  Explain surprising behaviour and the reasoning behind it; skip what the code already says.
  Don't reference internal or unpublished documents from a comment — a reader of the source cannot follow the link.
- **One name per function.** The namespace property, the named export and the
  `Random` method are the same function object, not three wrappers. Do not add
  an alias for an existing name.
- **Type-only imports use `import type`** (`verbatimModuleSyntax` is on).

## Naming

Four rules. Every public name follows them, and a name that does not is a bug.

**1. A name says what you get, or what you do.** A generator is named for its
value (`integer`, `float`, `bytes`, `color`, `char`, `uuid`); an operation on a
collection you supply is named for the action (`pick`, `sample`, `shuffle`).
Singular returns one, plural returns many: `float`/`floats`, `char`/`chars`.

**2. A name reads as English.** Say it out loud with the qualifier attached and
the word order follows: "weighted pick", "pick index", "shuffle in place",
"hash integer", "past date". Whichever order is English is the one to write. A
bare adjective is not a name, because it says nothing about what comes back.

**3. Follow the prevailing vocabulary before inventing one.** Where Python's
`random`, lodash or the RFCs already have a word for this, use their word:
`shuffle`, `sample`, `choices`, `reservoir`, `uuid.v7`. A reader who knows one
of those should not have to learn a second name for the same idea.

**4. Short wins, but never by abbreviating.** Prefer the shorter name when both
are understandable; `int`, `rdm` and `str` are not names. Only lengthen a name
to spell out a short form or to complete a pair (`angle`/`angleDegrees`,
`pastDate`/`futureDate`, `onSphere`/`inSphere`).

Two names must never overlap. `bool()` is the fair coin, `chance(p)` is the
weighted one and `oneIn(n)` is the count form; each writes a case the others
cannot.

## Adding a subpath

`exports` has to live in package.json because Node reads nothing else, but it
is generated. Add one line to `scripts/entries.mjs` and run `pnpm build` —
the build config and the exports map both come from that list.

Keep one subpath to one thing. A module that takes a `Source` as its first
argument is internal and must not be published: bind it to the global instance
in `src/global/` or to an instance in `src/random.ts` first.

## Tests

Two suites, split because they answer different questions.

- **unit** — boundaries, error codes, round-trips, types. Runs in seconds, so
  run it constantly.
- **statistical** — Kolmogorov–Smirnov against exact CDFs, chi-square against
  exact pmfs, and tail rates. Needs millions of draws, so it lives in
  `*.stat.test.ts` and runs separately. CI runs both.

Derive expected counts from the draw count rather than writing them out. A
hardcoded `20_000` silently becomes a test of the wrong hypothesis the moment
someone changes the sample size — which is exactly what happened here once.

Assert once per test, not once per element. `expect()` builds an assertion
object, so 200,000 of them cost far more than generating the values they check.

## Language

Everything shipped is written in English: comments, error messages, guides.

The built docs still contain other languages inside **dependency** bundles:
Starlight inlines Pagefind’s search-UI translation table. That is not our
prose, and `pnpm docs:build` already prunes the Pagefind UI bundles the site
never loads.

## Documentation site

`pages/` is an Astro Starlight site. The guides are written by hand; the **API
reference is generated from the TSDoc comments in `src/`** by
`starlight-typedoc` during `pnpm docs:build`, so published signatures cannot
drift from the ones that ship. `pages/src/content/docs/api` is generated and
not committed.

Write TSDoc on everything exported. It is the reference.

## Benchmarks

`pnpm bench` compares ransu against `Math.random` and against the raw engines.

Each case is compiled with its own `new Function` **and a unique comment
marker**. Both matter: V8 keeps a compilation cache keyed on source text, so two
generated loops with identical bodies share one compiled function and one
feedback vector. Without the marker every engine funnels through the same call
site and everything measured after the first looks megamorphic — which is how an
earlier version of this harness reported `nativeMath` at 40 ns instead of 14.

Treat a change of less than ~10% as noise, and re-run before believing it.

## Pull requests

Keep each change focused and add tests for any new behaviour.

## Releasing (maintainers)

Releasing is one manual step.
From the Actions tab, run the `release` workflow (`workflow_dispatch`) and give it a `version` input — either a bump keyword (`patch` / `minor` / `major` / `prerelease`) or an explicit version like `0.1.0`.
The workflow runs the checks and build, bumps `package.json`, publishes to npm with provenance via **trusted publishing** (OIDC — no `NPM_TOKEN` needed), pushes the version commit and tag, and creates a GitHub Release with generated notes.

Trusted publishing must be configured once on npmjs.com:
package **Settings → Publishing access → Trusted publishers → GitHub**, pointing at this repository's `release.yml` workflow.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
