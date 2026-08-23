import { assertLength } from "../internal/assert";
import type { Source } from "../internal/source";
import { CodePointSet, type UnicodeOptions } from "./code-point-set";

/**
 * Resolved sets, keyed by the options that describe them.
 *
 * Building a set sorts the ranges, subtracts the undrawable holes and lays out
 * the prefix sums, which is far more work than a draw. Writing
 * `char({ blocks: "emoji" })` inside a loop is the obvious way to use this API,
 * so the obvious way has to be the fast one.
 *
 * A `filter` is a closure, so options carrying one are not comparable and skip
 * the cache. The bound keeps a program that generates option objects from
 * holding every set it ever built.
 */
const cache = new Map<string, CodePointSet>();
const CACHE_LIMIT = 64;

function keyFor(options: UnicodeOptions): string | undefined {
  if (options.filter) return undefined;
  const blocks =
    typeof options.blocks === "string"
      ? options.blocks
      : (options.blocks?.join(",") ?? "");
  const ranges = options.ranges
    ? options.ranges.map(([a, b]) => `${a}-${b}`).join(",")
    : "";
  const flags =
    (options.bmpOnly ? 1 : 0) |
    (options.allowControl ? 2 : 0) |
    (options.allowPrivateUse ? 4 : 0) |
    (options.allowNoncharacters ? 8 : 0);
  return `${blocks}|${ranges}|${flags}`;
}

function resolve(
  options: UnicodeOptions | CodePointSet | undefined
): CodePointSet {
  if (options instanceof CodePointSet) return options;
  const key = keyFor(options ?? {});
  if (key === undefined) return new CodePointSet(options);

  const hit = cache.get(key);
  if (hit) return hit;

  const set = new CodePointSet(options);
  if (cache.size >= CACHE_LIMIT) {
    cache.delete(cache.keys().next().value as string);
  }
  cache.set(key, set);
  return set;
}

/** A uniformly chosen Unicode code point. */
export function randomCodePoint(
  src: Source,
  options?: UnicodeOptions | CodePointSet
): number {
  return resolve(options).pick(src);
}

/** A uniformly chosen character, as a string of one code point. */
export function randomChar(
  src: Source,
  options?: UnicodeOptions | CodePointSet
): string {
  return String.fromCodePoint(resolve(options).pick(src));
}

/** A random string of `length` code points, not UTF-16 units. */
export function randomChars(
  src: Source,
  length: number,
  options?: UnicodeOptions | CodePointSet
): string {
  assertLength(length, "length");
  const set = resolve(options);
  const parts = new Array<string>(length);
  for (let i = 0; i < length; i++)
    parts[i] = String.fromCodePoint(set.pick(src));
  return parts.join("");
}
