import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "pages/dist",
      "pages/.astro",
      "pages/.wrangler",
      "pages/src/content/docs/api",
    ],
  },
  js.configs.recommended,
  // Type-aware rules. They need a program, so they cost a little more than the
  // syntax-only set, but they are the ones that catch a floating promise or an
  // unnecessary condition — exactly what a library like this should not ship.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Scripts and config files are plain JavaScript, outside the TS program.
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // The benchmark reports which runtime it is on, so it probes for globals
    // that only exist in some of them.
    files: ["scripts/bench.mjs"],
    languageOptions: { globals: { Bun: "readonly", Deno: "readonly" } },
  },
  {
    // Tests reach past the public types on purpose: they poke at wrong shapes
    // to prove the runtime rejects them.
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  eslintConfigPrettier
);
