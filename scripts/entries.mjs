/**
 * The single source of truth for what ransu publishes.
 *
 * `tsdown.config.ts` builds these, and `sync-exports.mjs` turns the same list
 * into the package.json `exports` map. Adding a subpath means adding one line
 * here and nothing else.
 *
 * The key becomes the subpath (`index` becomes `.`) and the output basename.
 */
export const entries = {
  index: "src/index.ts",
  engines: "src/engines/index.ts",
  distributions: "src/distributions/index.ts",
  uuid: "src/uuid/index.ts",
  nanoid: "src/nanoid.ts",
  ulid: "src/ulid.ts",
  token: "src/token.ts",
  unicode: "src/unicode/index.ts",
  time: "src/time.ts",
  hash: "src/hash.ts",
  secure: "src/secure.ts",
  compat: "src/compat.ts",
};

/** The CommonJS root comes from a default-only entry; see src/index.cjs.ts. */
export const cjsEntries = { ...entries, index: "src/index.cjs.ts" };
