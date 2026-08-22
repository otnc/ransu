/**
 * Fails if anything we write drifts out of English.
 *
 * Two checks, because two things can go wrong. Text in another script
 * (Cyrillic, CJK, Hangul, Arabic, Hebrew, Thai, Devanagari) is obvious once you
 * look for it. Text in another Latin-script language is not, but Spanish,
 * French, German and Portuguese prose nearly always carries an accented letter,
 * so an allowlist of the accented tokens we do use catches it.
 *
 * Every pattern here is built from code points rather than written out, so this
 * file is pure ASCII and needs no exemption from its own rule.
 *
 * Run with `--list` to print every non-ASCII character found instead.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "scripts", "pages/src", "README.md", "CONTRIBUTING.md"];

const SKIP = [
  "pages/src/content/docs/api", // generated from TSDoc
  "node_modules",
  "dist",
];

const range = (from, to) =>
  `${String.fromCodePoint(from)}-${String.fromCodePoint(to)}`;
const charClass = (...ranges) => new RegExp(`[${ranges.join("")}]`, "u");

/** Scripts that never belong in our English source. */
const FOREIGN_SCRIPTS = [
  [charClass(range(0x0400, 0x052f)), "Cyrillic"],
  [charClass(range(0x0590, 0x05ff)), "Hebrew"],
  [charClass(range(0x0600, 0x06ff)), "Arabic"],
  [charClass(range(0x0900, 0x097f)), "Devanagari"],
  [charClass(range(0x0e00, 0x0e7f)), "Thai"],
  [charClass(range(0xac00, 0xd7a3)), "Hangul"],
  [charClass(range(0x3040, 0x30ff), range(0x4e00, 0x9fff)), "Japanese/Chinese"],
];

/**
 * Non-ASCII tokens we do mean to ship. Anything else carrying an accented
 * letter is treated as prose in another language.
 */
const ALLOWED_TOKENS = new Set([
  String.fromCodePoint(0x72, 0x61, 0x6e, 0x73, 0x16b), // ransu, with a macron
  String.fromCodePoint(0x4e71, 0x6570), // the characters it romanises
  String.fromCodePoint(0x48, 0xf6, 0x72, 0x6d, 0x61, 0x6e, 0x6e), // Hormann
]);

/** Typography, maths and shortcut glyphs, which carry no language. */
const NEUTRAL = new RegExp(
  `[${range(0x2010, 0x2015)}` +
    // curly quotes, ellipsis, no-break space, middle dot
    `${String.fromCodePoint(0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0xa0, 0xb7)}` +
    // maths and arrows
    `${String.fromCodePoint(0xb1, 0xd7, 0xf7, 0x2212, 0x2190, 0x2192)}` +
    `${String.fromCodePoint(0x2264, 0x2265, 0x2248, 0xa7, 0xb0, 0x2211, 0x221a)}` +
    // Greek letters used as maths symbols, and the command glyph
    `${String.fromCodePoint(0x3bb, 0x3c3, 0x3bc, 0x3c0, 0x2318)}]`,
  "gu"
);

/** Emoji, which the examples use on purpose. */
const EMOJI = new RegExp(
  `[${range(0x1f000, 0x1faff)}${range(0x2600, 0x27bf)}` +
    `${range(0xfe00, 0xfe0f)}${range(0x2b00, 0x2bff)}` +
    // zero-width joiner, which builds the multi-part emoji
    `${String.fromCodePoint(0x200d)}]`,
  "gu"
);

/** Accented Latin and the inverted punctuation Spanish uses. */
const ACCENTED = charClass(
  range(0x00c0, 0x024f),
  String.fromCodePoint(0xbf, 0xa1)
);

function walk(target, out = []) {
  if (SKIP.some((skip) => target.replaceAll("\\", "/").includes(skip))) {
    return out;
  }
  const stats = statSync(target, { throwIfNoEntry: false });
  if (!stats) return out;
  if (stats.isDirectory()) {
    for (const entry of readdirSync(target)) walk(join(target, entry), out);
    return out;
  }
  if (/\.(ts|mts|mjs|js|md|mdx|json|yaml|yml)$/.test(target)) out.push(target);
  return out;
}

/** Strip surrounding punctuation and a possessive, leaving the bare word. */
function bareWord(word) {
  return word
    .replace(/^[^\p{L}]+/u, "")
    .replace(/[^\p{L}]+$/u, "")
    .replace(/['’]s$/u, "");
}

const files = ROOTS.flatMap((root) => walk(root));
const problems = [];
const inventory = new Map();

for (const file of files) {
  const where = relative(".", file).replaceAll("\\", "/");
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      const at = `${where}:${index + 1}`;
      const words = line.match(/\S+/gu) ?? [];

      for (const [pattern, script] of FOREIGN_SCRIPTS) {
        const offending = words.filter(
          (word) => pattern.test(word) && !ALLOWED_TOKENS.has(bareWord(word))
        );
        if (offending.length > 0) {
          problems.push(`${at}  ${script}: ${offending.join(" ")}`);
        }
      }

      const stripped = line.replace(NEUTRAL, "").replace(EMOJI, "");
      for (const word of stripped.match(/\S+/gu) ?? []) {
        if (!ACCENTED.test(word)) continue;
        if (ALLOWED_TOKENS.has(bareWord(word))) continue;
        problems.push(`${at}  non-English word: ${word}`);
      }

      for (const char of line) {
        if (char.codePointAt(0) > 127) {
          inventory.set(char, (inventory.get(char) ?? 0) + 1);
        }
      }
    });
}

if (process.argv.includes("--list")) {
  for (const [char, count] of [...inventory].sort((a, b) => b[1] - a[1])) {
    const code = char.codePointAt(0).toString(16).toUpperCase();
    console.log(`  ${char}  U+${code.padStart(4, "0")}  ${count}`);
  }
  process.exit(0);
}

if (problems.length > 0) {
  console.error("Non-English text found:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    "\nEverything shipped is written in English. If a name genuinely needs an" +
      " accent, add it to ALLOWED_TOKENS in scripts/check-language.mjs."
  );
  process.exit(1);
}

console.log(`language: ${files.length} files, English only`);
