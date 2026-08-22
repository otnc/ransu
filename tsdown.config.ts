import { defineConfig } from "tsdown";
import { cjsEntries, entries } from "./scripts/entries.mjs";

export default defineConfig({
  entry: entries,
  dts: true,
  clean: true,
  // ES2022 is the floor every supported runtime clears: Node 18, Deno, Bun,
  // workerd and every current browser.
  target: "es2022",
  // Neutral, not 'node': browsers and edge runtimes are first-class, and ransu
  // has no static dependency on any Node built-in.
  platform: "neutral",
  fixedExtension: true,
  format: {
    esm: {},
    cjs: {
      // Only the root differs: the CJS root exports a lone default so the
      // bundler emits `module.exports = ransu`.
      entry: cjsEntries,
    },
  },
});
