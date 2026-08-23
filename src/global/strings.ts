import { randomHex, randomString } from "../strings/random-string";
import type { CodePointSet, UnicodeOptions } from "../unicode/code-point-set";
import * as draw from "../unicode/draw";
import { globalSource } from "./instance";

/**
 * A random string over `alphabet` (default alphanumeric).
 *
 * @example
 * ```ts
 * string(12);                 // "yYwec14FcPKc"
 * string(6, "ABCDEF0123456789"); // "3E9A1C"
 * string(4, ["cat", "dog"]);  // "dogcatdogdog"
 * ```
 */
export function string(
  length: number,
  alphabet?: string | ArrayLike<string>
): string {
  return randomString(globalSource(), length, alphabet);
}

/**
 * A random lowercase hexadecimal string.
 *
 * @example
 * ```ts
 * hex(32); // "3f7a1c05e2b8..."
 * ```
 */
export function hex(length: number): string {
  return randomHex(globalSource(), length);
}

/**
 * A uniformly chosen Unicode code point. Defaults to the `printable` blocks.
 *
 * @example
 * ```ts
 * codePoint();                      // 12441
 * codePoint({ blocks: "hiragana" }); // 12395
 * ```
 */
export function codePoint(options?: UnicodeOptions | CodePointSet): number {
  return draw.randomCodePoint(globalSource(), options);
}

/**
 * A uniformly chosen character, as a string of one code point.
 *
 * @example
 * ```ts
 * char();                       // "符"
 * char({ blocks: "emoji" });    // an emoji
 * char({ blocks: ["hiragana", "katakana"] }); // "ネ"
 * ```
 */
export function char(options?: UnicodeOptions | CodePointSet): string {
  return draw.randomChar(globalSource(), options);
}

/**
 * A random string of `length` code points, not UTF-16 units.
 *
 * An astral character costs two UTF-16 units, so `chars(10)` can return a
 * string whose `.length` is more than ten. The count is of characters.
 *
 * @example
 * ```ts
 * chars(8, { blocks: "kana" }); // "へソむリあヴんケ"
 * chars(5, { blocks: "emoji" }).length; // 10, five astral characters
 * ```
 */
export function chars(
  length: number,
  options?: UnicodeOptions | CodePointSet
): string {
  return draw.randomChars(globalSource(), length, options);
}
