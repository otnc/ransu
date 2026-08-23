import { randomHex, randomString } from "../strings/random-string";
import type { CodePointSet, UnicodeOptions } from "../unicode/code-point-set";
import * as draw from "../unicode/draw";
import { globalSource } from "./instance";

/** A random string over `alphabet` (default alphanumeric). */
export function string(
  length: number,
  alphabet?: string | ArrayLike<string>
): string {
  return randomString(globalSource(), length, alphabet);
}

/** A random lowercase hexadecimal string. */
export function hex(length: number): string {
  return randomHex(globalSource(), length);
}

/** A uniformly chosen Unicode code point. Defaults to the `printable` blocks. */
export function codePoint(options?: UnicodeOptions | CodePointSet): number {
  return draw.randomCodePoint(globalSource(), options);
}

/** A uniformly chosen character, as a string of one code point. */
export function char(options?: UnicodeOptions | CodePointSet): string {
  return draw.randomChar(globalSource(), options);
}

/** A random string of `length` code points, not UTF-16 units. */
export function chars(
  length: number,
  options?: UnicodeOptions | CodePointSet
): string {
  return draw.randomChars(globalSource(), length, options);
}
