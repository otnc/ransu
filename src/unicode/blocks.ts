import { raise } from "../internal/errors";

/** An inclusive code point range, `[first, last]`. */
export type CodePointRange = readonly [number, number];

/**
 * The largest Unicode code point, `U+10FFFF`.
 *
 * @example
 * ```ts
 * MAX_CODE_POINT;                    // 1114111
 * codePoint({ ranges: [[0, MAX_CODE_POINT]] });
 * ```
 */
export const MAX_CODE_POINT = 0x10ffff;
export const SURROGATES: CodePointRange = [0xd800, 0xdfff];
export const CONTROL: readonly CodePointRange[] = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
];
export const PRIVATE_USE: readonly CodePointRange[] = [
  [0xe000, 0xf8ff],
  [0xf0000, 0xffffd],
  [0x100000, 0x10fffd],
];

/** U+FDD0..U+FDEF plus the last two code points of every plane. */
export const NONCHARACTERS: readonly CodePointRange[] = [
  [0xfdd0, 0xfdef],
  ...Array.from({ length: 17 }, (_, plane): CodePointRange => {
    const base = plane * 0x10000;
    return [base + 0xfffe, base + 0xffff];
  }),
];

const ASCII: readonly CodePointRange[] = [[0x20, 0x7e]];
const LATIN: readonly CodePointRange[] = [
  [0x41, 0x5a],
  [0x61, 0x7a],
];
const HIRAGANA: readonly CodePointRange[] = [[0x3041, 0x309f]];
const KATAKANA: readonly CodePointRange[] = [[0x30a0, 0x30ff]];
const KANJI: readonly CodePointRange[] = [[0x4e00, 0x9fff]];
const HANGUL: readonly CodePointRange[] = [[0xac00, 0xd7a3]];
const PUNCTUATION: readonly CodePointRange[] = [[0x2000, 0x206f]];
const CURRENCY: readonly CodePointRange[] = [[0x20a0, 0x20bf]];
const ARROWS: readonly CodePointRange[] = [[0x2190, 0x21ff]];
const MATH: readonly CodePointRange[] = [[0x2200, 0x22ff]];
const BOX: readonly CodePointRange[] = [[0x2500, 0x257f]];
const BLOCKS: readonly CodePointRange[] = [[0x2580, 0x259f]];
const GEOMETRIC: readonly CodePointRange[] = [[0x25a0, 0x25ff]];
const BRAILLE: readonly CodePointRange[] = [[0x2800, 0x28ff]];
const GREEK: readonly CodePointRange[] = [
  [0x0391, 0x03a9],
  [0x03b1, 0x03c9],
];
const CYRILLIC: readonly CodePointRange[] = [[0x0400, 0x04ff]];
const EMOJI: readonly CodePointRange[] = [
  [0x1f300, 0x1f5ff],
  [0x1f600, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f900, 0x1f9ff],
  [0x1fa70, 0x1faff],
  [0x2600, 0x26ff],
  [0x2700, 0x27bf],
];

/**
 * The named Unicode blocks the string functions accept.
 *
 * @example
 * ```ts
 * import { char, unicodeRanges } from "ransu";
 *
 * Object.keys(unicodeRanges); // "printable", "latin", "hiragana", ...
 *
 * char({ blocks: "hiragana" });
 * char({ blocks: ["hiragana", "katakana"] });
 * ```
 */
export const unicodeRanges = {
  ascii: ASCII,
  latin: LATIN,
  latin1: [
    [0x20, 0x7e],
    [0xa0, 0xff],
  ],
  latinExtended: [[0x100, 0x24f]],
  greek: GREEK,
  cyrillic: CYRILLIC,
  hebrew: [[0x590, 0x5ff]],
  arabic: [[0x600, 0x6ff]],
  devanagari: [[0x900, 0x97f]],
  thai: [[0xe00, 0xe7f]],
  hiragana: HIRAGANA,
  katakana: KATAKANA,
  kana: [...HIRAGANA, ...KATAKANA],
  kanji: KANJI,
  hangul: HANGUL,
  cjk: [...HIRAGANA, ...KATAKANA, ...KANJI, ...HANGUL],
  punctuation: PUNCTUATION,
  currency: CURRENCY,
  arrows: ARROWS,
  math: MATH,
  box: BOX,
  blockElements: BLOCKS,
  geometric: GEOMETRIC,
  braille: BRAILLE,
  emoji: EMOJI,
  symbols: [...ARROWS, ...MATH, ...BOX, ...BLOCKS, ...GEOMETRIC],
  printable: [
    ...ASCII,
    [0xa0, 0x24f] as CodePointRange,
    ...GREEK,
    ...CYRILLIC,
    ...PUNCTUATION,
    ...CURRENCY,
    ...ARROWS,
    ...MATH,
    ...BOX,
    ...BLOCKS,
    ...GEOMETRIC,
    ...BRAILLE,
    ...HIRAGANA,
    ...KATAKANA,
    ...KANJI,
    ...HANGUL,
    ...EMOJI,
  ],
  bmp: [[0x0, 0xffff]],
  all: [[0x0, MAX_CODE_POINT]],
} as const satisfies Record<string, readonly CodePointRange[]>;

export type UnicodeBlock = keyof typeof unicodeRanges;

/** Look a block up by name, with a readable failure. */
export function blockRanges(name: UnicodeBlock): readonly CodePointRange[] {
  const block = unicodeRanges[name];
  if (!block) {
    raise("INVALID_ARGUMENT", `Unknown Unicode block "${String(name)}".`);
  }
  return block;
}
