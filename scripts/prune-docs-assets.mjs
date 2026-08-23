/**
 * Drops the Pagefind bundles the site never loads.
 *
 * Pagefind emits its stock search UI alongside the index. Starlight ships its
 * own UI and only loads `pagefind.js`, so those bundles are dead weight — about
 * 150 KB of it, carrying UI strings for some thirty languages that a reader
 * would never see but a grep certainly will.
 *
 * Nothing is deleted on a hunch: each candidate is removed only after scanning
 * the built HTML and JavaScript proves nothing references it.
 */
import { readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "pages/dist";
const PAGEFIND = join(DIST, "pagefind");

/** Only ever considered: the stock UI. The index and engine are never touched. */
const CANDIDATES = [
  "pagefind-ui.js",
  "pagefind-ui.css",
  "pagefind-modular-ui.js",
  "pagefind-modular-ui.css",
  "pagefind-component-ui.js",
  "pagefind-component-ui.css",
  "pagefind-highlight.js",
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(html|js|css)$/.test(full)) out.push(full);
  }
  return out;
}

let haystack = "";
for (const file of walk(DIST)) {
  // A file cannot count as a reference to itself.
  if (CANDIDATES.some((name) => file.endsWith(name))) continue;
  haystack += readFileSync(file, "utf8");
}

let removed = 0;
let bytes = 0;

for (const name of CANDIDATES) {
  const path = join(PAGEFIND, name);
  const stats = statSync(path, { throwIfNoEntry: false });
  if (!stats) continue;
  if (haystack.includes(name)) {
    console.log(`  kept    ${relative(DIST, path)} (referenced)`);
    continue;
  }
  unlinkSync(path);
  removed++;
  bytes += stats.size;
}

const kb = Math.round(bytes / 1024);
console.log(
  `docs assets: pruned ${removed} unused Pagefind bundles (${kb} KB)`
);
