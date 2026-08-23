import { assertLength } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";
import { alphabets } from "./alphabet";

const HAS_SURROGATE = /[\uD800-\uDBFF]/;

/**
 * Split a string into code points, so astral characters stay intact. Strings
 * without surrogates are used as-is, since indexing them is already correct.
 */
function units(alphabet: string | ArrayLike<string>): ArrayLike<string> {
  return typeof alphabet === "string" && HAS_SURROGATE.test(alphabet)
    ? Array.from(alphabet)
    : alphabet;
}

/**
 * Split `value` into grapheme clusters — what a reader calls "characters".
 *
 * A flag or an emoji with a skin-tone modifier is several code points that
 * display as one glyph; splitting on code points would break them apart.
 * This exists to build an alphabet {@link string} can then draw from.
 *
 * @example
 * ```ts
 * graphemes("👍🏽🎉"); // [ "👍🏽", "🎉" ], not four separate code points
 * string(5, graphemes("👍🏽🎉")); // a 5-emoji string, skin tones intact
 * ```
 */
export function graphemes(value: string, locale?: string): string[] {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Segmenter) return Array.from(value);
  const segmenter = new Segmenter(locale, { granularity: "grapheme" });
  return [...segmenter.segment(value)].map((part) => part.segment);
}

/**
 * A random string over `alphabet`, uniform for any alphabet size. Sizes that
 * are a power of two take a bit-slicing path; the rest use rejection.
 *
 * Pass an array to draw from multi-code-point units: `graphemes('👍🏽🎉')`.
 */
export function randomString(
  src: Source,
  length: number,
  alphabet: string | ArrayLike<string> = alphabets.alphanumeric
): string {
  assertLength(length, "length");
  const chars = units(alphabet);
  const size = chars.length;
  if (size === 0) {
    raise("EMPTY_COLLECTION", "randomString(): the alphabet is empty.");
  }
  if (length === 0) return "";
  if (size === 1) return String(chars[0]).repeat(length);

  const out = new Array<string>(length);

  if ((size & (size - 1)) === 0) {
    const width = Math.log2(size);
    const perWord = Math.floor(32 / width);
    const mask = size - 1;
    let word = 0;
    let left = 0;
    for (let i = 0; i < length; i++) {
      if (left === 0) {
        word = src.u32();
        left = perWord;
      }
      out[i] = chars[word & mask];
      word >>>= width;
      left--;
    }
    return out.join("");
  }

  for (let i = 0; i < length; i++) out[i] = chars[bounded(src, size)];
  return out.join("");
}

/** A random lowercase hexadecimal string of `length` characters. */
export function randomHex(src: Source, length: number): string {
  return randomString(src, length, alphabets.hex);
}
