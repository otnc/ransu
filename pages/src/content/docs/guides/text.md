---
title: Text and Unicode
description: Random strings over any alphabet, including emoji and full Unicode.
---

```ts
ransu.string(12); // 'k3Xq7bWm1zPd'
ransu.string(8, ransu.alphabets.base58);
ransu.hex(32);
ransu.shuffleString("ransu");
```

Uniform for **any** alphabet size, not just powers of two. Sizes that are a
power of two take a bit-slicing fast path; the rest use rejection.

## Alphabets

`lower`, `upper`, `letters`, `digits`, `alphanumeric`, `hex`, `hexUpper`,
`binary`, `octal`, `base32`, `base32hex`, `base58`, `base62`, `base64url`,
`unambiguous`, `ascii`.

`unambiguous` drops the characters people misread when transcribing a code by
hand — `0`/`O`, `1`/`l`/`I`.

## Emoji and astral characters

`length` counts characters, never UTF-16 units, and a surrogate pair is never
split:

```ts
ransu.string(5, "🍎🍊🍇"); // '🍇🍎🍇🍊🍎'
ransu.string(5, ransu.graphemes("👍🏽🎉")); // skin tones stay intact
```

`graphemes()` splits on user-perceived characters using `Intl.Segmenter`, so
emoji sequences, combining marks and flags survive.

## Full Unicode

```ts
ransu.char({ blocks: "emoji" }); // '🚀'
ransu.unicodeString(10, { blocks: "kana" });
ransu.codePoint({ blocks: ["greek", "cyrillic"] });
ransu.unicodeString(20, { ranges: [[0x4e00, 0x9fff]] });
```

| Option                                                    | Effect                                       |
| --------------------------------------------------------- | -------------------------------------------- |
| `ranges`                                                  | Explicit inclusive `[first, last]` pairs     |
| `blocks`                                                  | One or more names from `unicodeRanges`       |
| `bmpOnly`                                                 | Keep every character to a single UTF-16 unit |
| `allowControl` / `allowPrivateUse` / `allowNoncharacters` | Opt back in                                  |
| `filter`                                                  | Arbitrary per-code-point rejection           |

Blocks: `ascii`, `latin`, `latin1`, `latinExtended`, `greek`, `cyrillic`,
`hebrew`, `arabic`, `devanagari`, `thai`, `hiragana`, `katakana`, `kana`,
`kanji`, `hangul`, `cjk`, `punctuation`, `currency`, `arrows`, `math`, `box`,
`blockElements`, `geometric`, `braille`, `emoji`, `symbols`, `printable`,
`bmp`, `all`.

### What can never come out

Surrogates are not scalar values, so they are excluded with no way to opt in —
otherwise you could build a malformed string. Controls, private-use areas and
noncharacters are excluded by default and can be re-enabled.

`all` includes a great many **unassigned** code points, which render as tofu.
That is why `printable` is the default. Deciding which code points are assigned
would need a large Unicode table, which ransu deliberately does not ship.

### Reusing options

Building the range set costs a normalisation pass. When the same options are
used repeatedly, build it once:

```ts
import { CodePointSet } from "ransu/unicode";

const kana = new CodePointSet({ blocks: "kana" });
ransu.char(kana);
```
