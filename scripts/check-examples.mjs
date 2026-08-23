/**
 * Runs every `@example` in the source against the built package, and
 * type-checks it against the published declarations.
 *
 * The API reference is generated from the TSDoc comments, so an example that
 * drifts is published as documentation. Executing them makes that a build
 * failure instead: a renamed function, a changed signature or a typo in a
 * snippet stops the release rather than reaching the site.
 *
 * Execution alone missed a real mistake once: an example passed an option key
 * that does not exist on the type. JavaScript ignores an unknown object
 * property, so the snippet ran without error and asserted nothing wrong — only
 * `tsc`'s excess-property check catches that. Every example is now also
 * spliced into a synthetic file that imports the same way a reader would and
 * type-checked with the project's own compiler options.
 *
 * Only the code is checked at runtime. The trailing `// 4` on a line is
 * illustrative, not an assertion — the values are random.
 *
 * Needs `pnpm build` first, because it imports what will actually ship.
 */
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
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
// Unmerged, per subpath: exactly what `ransu/x` itself exports, with no index
// fallback baked in. The type-check needs this — `ransu/color` really has no
// `pick`, even though `scopeFor("color")` hands every example one anyway so a
// bare reference to a global still runs.
const ownOnly = new Map();
async function scopeFor(subpath) {
  if (!modules.has(subpath)) {
    const file = subpath === "index" ? "index.mjs" : `${subpath}.mjs`;
    const url = pathToFileURL(join(root, "dist", file)).href;
    const rootUrl = pathToFileURL(join(root, "dist", "index.mjs")).href;
    const [own, base] = await Promise.all([
      import(url),
      subpath === "index" ? Promise.resolve({}) : import(rootUrl),
    ]);
    ownOnly.set(subpath, own);
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

/** Every `import ... from "ransu[/x]"` in a snippet, without touching values. */
function explicitImportsIn(code) {
  const found = [];
  for (const match of code.matchAll(IMPORT)) {
    const [line, defaultName, named, subpath] = match;
    const names = (named ?? "")
      .split(",")
      .map((raw) =>
        raw
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)
          .pop()
      )
      .filter(Boolean);
    found.push({ line, defaultName, names, subpath: subpath ?? "index" });
  }
  return found;
}

let checked = 0;
const failures = [];
const forTypecheck = [];

for (const file of walk(join(root, "src"))) {
  const found = examplesIn(readFileSync(file, "utf8"));
  if (found.length === 0) continue;
  const ownSubpath = subpathFor(file);
  const scope = await scopeFor(ownSubpath);

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
    forTypecheck.push({ where, code, ownSubpath });
  }
}

if (failures.length > 0) {
  for (const { where, code, error } of failures) {
    console.error(`\n${where}`);
    for (const line of code.trim().split("\n")) console.error(`  ${line}`);
    console.error(`  -> ${error instanceof Error ? error.message : error}`);
  }
  console.error(
    `\nexamples: ${failures.length} of ${checked} failed at runtime`
  );
  process.exit(1);
}
console.log(`examples: ${checked} ran clean at runtime`);

/**
 * One synthetic module: one namespace import per subpath, then every example
 * in its own block. Inside a block, each name the example needs is aliased
 * with `typeof $ns.member`, which carries the real declared type without
 * widening to `any` — an object literal argument still gets tsc's
 * excess-property check against the real parameter type. Blocks exist so two
 * examples that both declare, say, `const rng = ...` cannot collide; the
 * aliases are re-declared per block for the same reason.
 */
function buildSyntheticSource(items) {
  const aliasOf = (subpath) => `$${subpath.replace(/-/g, "_")}`;
  const subpaths = new Set(["index"]);
  for (const { code, ownSubpath } of items) {
    subpaths.add(ownSubpath);
    for (const { subpath } of explicitImportsIn(code)) subpaths.add(subpath);
  }

  const chunks = [];
  let lineCount = 0;
  // `stripped` can be many lines in one string; tracking a running count is
  // the only way position math survives that, since `chunks.length` would
  // count a whole multi-line snippet as a single entry.
  const push = (text) => {
    chunks.push(text);
    lineCount += text.split("\n").length;
  };

  for (const subpath of subpaths) {
    const spec = subpath === "index" ? "ransu" : `ransu/${subpath}`;
    push(`import * as ${aliasOf(subpath)} from "${spec}";`);
  }

  const positions = [];
  for (const { code, where, ownSubpath } of items) {
    let stripped = code;
    const aliasLines = [];
    const seen = new Set();
    const alias = (localName, subpath, member) => {
      if (seen.has(localName)) return;
      seen.add(localName);
      const ns = aliasOf(subpath);
      aliasLines.push(
        `  const ${localName}: typeof ${ns}.${member} = ${ns}.${member};`
      );
    };

    for (const { line, defaultName, names, subpath } of explicitImportsIn(
      code
    )) {
      if (defaultName) alias(defaultName, subpath, "default");
      for (const name of names) alias(name, subpath, name);
      stripped = stripped.replace(line, "");
    }
    // Own-subpath names fill in whatever an explicit import did not cover.
    // Each is aliased against whichever namespace really declares it —
    // `ransu/color` has no `pick`, even though an example living in color.ts
    // can reach it unimported at runtime through the merged scope.
    for (const name of Object.keys(modules.get(ownSubpath) ?? {})) {
      // tsdown's chunk-splitting occasionally re-exports its own internal
      // chunk under a one-letter alias (`dice_exports as t`, for one). It
      // never reaches the .d.ts, so no real export is ever this short.
      if (name.length <= 1) continue;
      if (!/^[A-Za-z_$][\w$]*$/.test(name) || RESERVED.has(name)) continue;
      // Module namespace objects have a null prototype, so `Object.hasOwn`
      // rather than `.hasOwnProperty` is what actually works here.
      const declaredBy = Object.hasOwn(ownOnly.get(ownSubpath) ?? {}, name)
        ? ownSubpath
        : "index";
      alias(name, declaredBy, name);
    }

    push("{");
    for (const line of aliasLines) push(line);
    positions.push({ where, startLine: lineCount + 1 });
    push(stripped);
    push("}");
  }
  return { source: chunks.join("\n"), positions };
}

const { source, positions } = buildSyntheticSource(forTypecheck);

const typesFile = join(root, "scripts", ".examples-typecheck.ts");
// TypeScript normalises its own paths to forward slashes internally, so a
// Windows path from `path.join` never matches `d.file.fileName` by ===.
const normalize = (p) => p.replace(/\\/g, "/");
writeFileSync(typesFile, source);
try {
  const configPath = ts.findConfigFile(
    root,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  const program = ts.createProgram([typesFile], parsed.options);
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (d) => d.file && normalize(d.file.fileName) === normalize(typesFile)
    );

  if (diagnostics.length > 0) {
    for (const d of diagnostics) {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      const offset = d.file.getLineAndCharacterOfPosition(d.start).line + 1;
      const spot = [...positions].reverse().find((p) => p.startLine <= offset);
      console.error(`\n${spot ? spot.where : typesFile}`);
      console.error(`  -> ${msg}`);
    }
    console.error(
      `\nexamples: ${diagnostics.length} type error(s) across ${positions.length} examples`
    );
    process.exit(1);
  }
} finally {
  unlinkSync(typesFile);
}

console.log(`examples: ${checked} ran and type-checked clean`);
