/**
 * Writes the package.json `exports` map from the entry list.
 *
 * Node resolves subpaths from package.json and nowhere else, so the map has to
 * live there — but it does not have to be maintained there. Run with `--check`
 * to fail instead of writing, which is what CI does.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { entries } from "./entries.mjs";

const pkgUrl = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(pkgUrl, "utf8"));

const names = Object.keys(entries);
const ordered = ["index", ...names.filter((n) => n !== "index").sort()];

const exportsMap = {};
for (const name of ordered) {
  const subpath = name === "index" ? "." : `./${name}`;
  exportsMap[subpath] = {
    types: {
      import: `./dist/${name}.d.mts`,
      require: `./dist/${name}.d.cts`,
    },
    import: `./dist/${name}.mjs`,
    require: `./dist/${name}.cjs`,
  };
}
exportsMap["./package.json"] = "./package.json";

const next = {
  ...pkg,
  main: "./dist/index.cjs",
  module: "./dist/index.mjs",
  types: "./dist/index.d.mts",
  exports: exportsMap,
};

const before = JSON.stringify(pkg, null, 2);
const after = JSON.stringify(next, null, 2);

if (process.argv.includes("--check")) {
  if (before !== after) {
    console.error(
      "package.json exports are stale. Run `npm run sync:exports`."
    );
    process.exit(1);
  }
  console.log(`exports: ${ordered.length} subpaths, in sync`);
} else {
  writeFileSync(pkgUrl, `${after}\n`);
  console.log(`exports: wrote ${ordered.length} subpaths`);
}
