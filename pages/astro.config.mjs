import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

export default defineConfig({
  // Static output: the docs are pages, not an application. Cloudflare serves
  // them from Workers static assets, so there is no server to run.
  output: "static",
  site: "https://ransu.otnc.dev",
  integrations: [
    starlight({
      // The API reference is generated from the TSDoc comments in src/, so the
      // signatures on this site can never drift from the ones that ship.
      plugins: [
        starlightTypeDoc({
          entryPoints: [
            "../src/index.ts",
            "../src/engine/index.ts",
            "../src/distribution/index.ts",
            "../src/uuid/index.ts",
            "../src/unicode/index.ts",
            "../src/nanoid.ts",
            "../src/ulid.ts",
            "../src/token.ts",
            "../src/dice.ts",
            "../src/geometry.ts",
            "../src/color.ts",
            "../src/time.ts",
            "../src/hash.ts",
            "../src/secure.ts",
            "../src/compat.ts",
          ],
          tsconfig: "../tsconfig.json",
          output: "api",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: {
            excludeInternal: true,
            excludePrivate: true,
            gitRevision: "main",
          },
        }),
      ],
      title: "ransu",
      description:
        "Convenient and easy-to-use random functions for JavaScript.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/otnc/ransu",
        },
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/ransu",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/otnc/ransu/edit/main/pages/",
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "start/introduction" },
            { label: "Install", slug: "start/install" },
            { label: "Choosing an API", slug: "start/choosing" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Numbers and ranges", slug: "guides/numbers" },
            { label: "Collections", slug: "guides/collections" },
            { label: "Text and Unicode", slug: "guides/text" },
            { label: "Identifiers", slug: "guides/identifiers" },
            { label: "Distributions", slug: "guides/distributions" },
            { label: "Reproducibility", slug: "guides/reproducibility" },
            { label: "Security", slug: "guides/security" },
            {
              label: "Dice, shapes and colours",
              slug: "guides/dice-and-shapes",
            },
            { label: "Retries and scheduling", slug: "guides/retries" },
            { label: "Per-key randomness", slug: "guides/per-key" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Subpaths", slug: "reference/subpaths" },
            { label: "Engines", slug: "reference/engines" },
            { label: "Errors", slug: "reference/errors" },
            { label: "Runtimes", slug: "reference/runtimes" },
          ],
        },
        typeDocSidebarGroup,
        {
          label: "Migrating",
          items: [
            { label: "From other libraries", slug: "migrating/from-others" },
          ],
        },
      ],
    }),
  ],
});
