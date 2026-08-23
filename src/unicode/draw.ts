import { assertLength } from "../internal/assert";
import type { Source } from "../internal/source";
import { CodePointSet, type UnicodeOptions } from "./code-point-set";

function resolve(
  options: UnicodeOptions | CodePointSet | undefined
): CodePointSet {
  if (options instanceof CodePointSet) return options;
  return new CodePointSet(options);
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
