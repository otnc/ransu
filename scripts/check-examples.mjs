/**
 * Runs every `@example` in the source against the built package.
 *
 * The API reference is generated from the TSDoc comments, so an example that
 * drifts is published as documentation. Executing them makes that a build
 * failure instead: a renamed function, a changed signature or a typo in a
 * snippet stops the release rather than reaching the site.
 *
 * Only the code is checked. The trailing `// 4` on a line is illustrative, not
 * an assertion — the values are random.
 *
 * Needs `pnpm build` first, because it imports what will actually ship.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { entries } from "./entries.mjs";

const root = new URL("..", import.meta.url).pathname.replace(
  /^\/([A-Z]:)/,
  "$1"
);

function walk(dir, out = []) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") && !full.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

/** Which subpath a source file ends up published under. */
function subpathFor(file) {
  const rel = relative(root, file).split("\\").join("/");
  let best = "index";
  let bestLength = -1;
  for (const [name, entry] of Object.entries(entries)) {
    if (name === "index") continue;
    // A directory entry (`src/uuid/index.ts`) owns everything beneath it. A
    // file entry (`src/compat.ts`) owns only itself — treating its parent as a
    // prefix would make every top-level module resolve to the same subpath.
    const dir = entry.endsWith("/index.ts")
      ? entry.slice(0, -"/index.ts".length)
      : null;
    const owns = rel === entry || (dir !== null && rel.startsWith(`${dir}/`));
    if (owns && entry.length > bestLength) {
      best = name;
      bestLength = entry.length;
    }
  }
  return best;
}

const FENCE =
  /@example\s*\n(?:\s*\*\s*\n)*\s*\*\s*```ts\n([\s\S]*?)\s*\*\s*```/g;

function examplesIn(text) {
  const found = [];
  for (const match of text.matchAll(FENCE)) {
    const code = match[1]
      .split("\n")
      .map((line) => line.replace(/^\s*\*( |$)/, ""))
      .join("\n");
    const line = text.slice(0, match.index).split("\n").length;
    found.push({ code, line });
  }
  return found;
}

/** `default` is a module export name but not a usable parameter name. */
const RESERVED = new Set(["default", "class", "function", "new", "delete"]);

const modules = new Map();
async function scopeFor(subpath) {
  if (!modules.has(subpath)) {
    const file = subpath === "index" ? "index.mjs" : `${subpath}.mjs`;
    const url = pathToFileURL(join(root, "dist", file)).href;
    const rootUrl = pathToFileURL(join(root, "dist", "index.mjs")).href;
    const [own, base] = await Promise.all([
      import(url),
      subpath === "index" ? Promise.resolve({}) : import(rootUrl),
    ]);
    // The module's own names win, so `secure`'s integer is not shadowed by the
    // global one of the same name.
    modules.set(subpath, { ...base, ...own });
  }
  return modules.get(subpath);
}

const IMPORT =
  /^import (?:(\w+)(?:, )?)?(?:\{([^}]*)\})? from "ransu(?:\/([\w-]+))?";$/gm;

/**
 * Resolve any `import ... from "ransu/x"` the snippet opens with.
 *
 * An example a reader can copy needs its imports, but `new Function` cannot
 * hold an import statement. Each one is resolved against the built package and
 * folded into the scope, then dropped from the code that runs.
 */
async function resolveImports(code) {
  const extra = {};
  let stripped = code;
  for (const match of code.matchAll(IMPORT)) {
    const [line, defaultName, named, subpath] = match;
    const module = await scopeFor(subpath ?? "index");
    if (defaultName) extra[defaultName] = module.default;
    for (const raw of (named ?? "").split(",")) {
      const name = raw
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop();
      if (name) extra[name] = module[name];
    }
    stripped = stripped.replace(line, "");
  }
  return { extra, stripped };
}

let checked = 0;
const failures = [];

for (const file of walk(join(root, "src"))) {
  const found = examplesIn(readFileSync(file, "utf8"));
  if (found.length === 0) continue;
  const scope = await scopeFor(subpathFor(file));

  for (const { code, line } of found) {
    checked++;
    const where = `${relative(root, file).split("\\").join("/")}:${line}`;
    try {
      const { extra, stripped } = await resolveImports(code);
      const merged = { ...scope, ...extra };
      const names = Object.keys(merged).filter(
        (n) => /^[A-Za-z_$][\w$]*$/.test(n) && !RESERVED.has(n)
      );
      const run = new Function(...names, `"use strict";\n${stripped}`);
      run(...names.map((n) => merged[n]));
    } catch (error) {
      failures.push({ where, code, error });
    }
  }
}

for (const { where, code, error } of failures) {
  console.error(`\n${where}`);
  for (const line of code.trim().split("\n")) console.error(`  ${line}`);
  console.error(`  -> ${error instanceof Error ? error.message : error}`);
}

if (failures.length > 0) {
  console.error(`\nexamples: ${failures.length} of ${checked} failed`);
  process.exit(1);
}
console.log(`examples: ${checked} ran, all fine`);
