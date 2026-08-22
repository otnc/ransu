import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engines/xoshiro128pp";
import { RansuError } from "../internal/errors";
import { createSource } from "../internal/source";
import { graphemes, randomString } from "../strings/random-string";
import { unicodeRanges } from "./blocks";
import { CodePointSet } from "./code-point-set";
import { randomChar, randomCodePoint, randomUnicodeString } from "./draw";

const src = () => createSource(xoshiro128pp("unicode"));

describe("CodePointSet", () => {
  it("counts a single range exactly", () => {
    const set = new CodePointSet({ ranges: [[0x41, 0x5a]] });
    expect(set.size).toBe(26);
    expect(set.at(0)).toBe(0x41);
    expect(set.at(25)).toBe(0x5a);
  });

  it("walks across several ranges in order", () => {
    const set = new CodePointSet({
      ranges: [
        [0x41, 0x43],
        [0x61, 0x62],
      ],
    });
    expect(set.size).toBe(5);
    expect([0, 1, 2, 3, 4].map((i) => set.at(i))).toEqual([
      0x41, 0x42, 0x43, 0x61, 0x62,
    ]);
  });

  it("merges overlapping and adjacent ranges", () => {
    const set = new CodePointSet({
      ranges: [
        [0x10, 0x20],
        [0x18, 0x30],
        [0x31, 0x40],
      ],
      allowControl: true,
    });
    expect(set.ranges).toEqual([[0x10, 0x40]]);
    expect(set.size).toBe(0x31);
  });

  it("never includes surrogates", () => {
    const set = new CodePointSet({ blocks: "all" });
    for (const [start, end] of set.ranges) {
      expect(end < 0xd800 || start > 0xdfff).toBe(true);
    }
    expect(set.size).toBe(0x10ffff + 1 - 2048 - 66 - 65 - 137468);
  });

  it("excludes controls, private use and noncharacters by default", () => {
    const set = new CodePointSet({ blocks: "all" });
    const contains = (cp: number) =>
      set.ranges.some(([start, end]) => cp >= start && cp <= end);

    expect(contains(0x00)).toBe(false);
    expect(contains(0x7f)).toBe(false);
    expect(contains(0xe000)).toBe(false);
    expect(contains(0xfffe)).toBe(false);
    expect(contains(0xfdd0)).toBe(false);
    expect(contains(0x41)).toBe(true);
  });

  it("opts back in on request", () => {
    const set = new CodePointSet({
      blocks: "all",
      allowControl: true,
      allowPrivateUse: true,
      allowNoncharacters: true,
    });
    // Everything except the 2048 surrogates.
    expect(set.size).toBe(0x110000 - 2048);
  });

  it("honours bmpOnly", () => {
    const set = new CodePointSet({ blocks: "all", bmpOnly: true });
    for (const [, end] of set.ranges) expect(end).toBeLessThanOrEqual(0xffff);
  });

  it("rejects an unknown block and an empty result", () => {
    expect(() => new CodePointSet({ blocks: "nope" as never })).toThrow(
      RansuError
    );
    expect(() => new CodePointSet({ ranges: [[0x00, 0x1f]] })).toThrow(
      /no code points/
    );
  });

  it("rejects an out-of-bounds index", () => {
    const set = new CodePointSet({ ranges: [[0x41, 0x5a]] });
    expect(() => set.at(26)).toThrow(RansuError);
    expect(() => set.at(-1)).toThrow(RansuError);
  });
});

describe("randomCodePoint", () => {
  it("stays inside the requested block", () => {
    const s = src();
    for (let i = 0; i < 2_000; i++) {
      const cp = randomCodePoint(s, { blocks: "hiragana" });
      expect(cp).toBeGreaterThanOrEqual(0x3041);
      expect(cp).toBeLessThanOrEqual(0x309f);
    }
  });

  it("is uniform across a small set", () => {
    const s = src();
    const counts = new Map<number, number>();
    for (let i = 0; i < 60_000; i++) {
      const cp = randomCodePoint(s, {
        ranges: [[0x41, 0x43]],
        allowControl: true,
      });
      counts.set(cp, (counts.get(cp) ?? 0) + 1);
    }
    expect(counts.size).toBe(3);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(19_000);
      expect(count).toBeLessThan(21_000);
    }
  });

  it("spreads evenly across several ranges of different sizes", () => {
    const s = src();
    let small = 0;
    const draws = 60_000;
    for (let i = 0; i < draws; i++) {
      const cp = randomCodePoint(s, {
        ranges: [
          [0x41, 0x41],
          [0x61, 0x69],
        ],
      });
      if (cp === 0x41) small++;
    }
    // One code point out of ten.
    expect(small / draws).toBeCloseTo(0.1, 2);
  });

  it("applies a filter by rejection", () => {
    const s = src();
    for (let i = 0; i < 500; i++) {
      const cp = randomCodePoint(s, {
        blocks: "ascii",
        filter: (value) => value % 2 === 0,
      });
      expect(cp % 2).toBe(0);
    }
  });

  it("gives up on a filter that never passes", () => {
    expect(() =>
      randomCodePoint(src(), { blocks: "ascii", filter: () => false })
    ).toThrow(/rejected 1000 draws/);
  });

  it("reuses a prebuilt set", () => {
    const set = new CodePointSet({ blocks: "katakana" });
    const s = src();
    for (let i = 0; i < 500; i++) {
      expect(randomCodePoint(s, set)).toBeGreaterThanOrEqual(0x30a0);
    }
  });
});

describe("randomChar and randomUnicodeString", () => {
  it("produces well-formed single characters", () => {
    const s = src();
    for (let i = 0; i < 2_000; i++) {
      const char = randomChar(s, { blocks: "emoji" });
      expect([...char]).toHaveLength(1);
      expect(char.codePointAt(0)).toBeGreaterThan(0x2000);
    }
  });

  it("counts length in code points, not UTF-16 units", () => {
    const s = src();
    const value = randomUnicodeString(s, 10, { blocks: "emoji" });
    expect([...value]).toHaveLength(10);
    // Astral characters take two UTF-16 units each.
    expect(value.length).toBeGreaterThan(10);
  });

  it("never emits a lone surrogate", () => {
    const s = src();
    const value = randomUnicodeString(s, 5_000, { blocks: "all" });
    expect([...value]).toHaveLength(5_000);
    for (const char of value) {
      const cp = char.codePointAt(0) as number;
      expect(cp < 0xd800 || cp > 0xdfff).toBe(true);
    }
  });

  it("defaults to the printable blocks", () => {
    const s = src();
    for (const char of randomUnicodeString(s, 500)) {
      const cp = char.codePointAt(0) as number;
      expect(cp).toBeGreaterThanOrEqual(0x20);
      expect(cp).not.toBe(0x7f);
    }
  });

  it("is reproducible for a given seed", () => {
    expect(randomUnicodeString(src(), 32, { blocks: "cjk" })).toBe(
      randomUnicodeString(src(), 32, { blocks: "cjk" })
    );
  });
});

describe("randomString with astral alphabets", () => {
  it("never splits a surrogate pair", () => {
    const s = src();
    const value = randomString(s, 200, "🍎🍊🍇🍓");
    expect([...value]).toHaveLength(200);
    for (const char of value) expect("🍎🍊🍇🍓").toContain(char);
  });

  it("draws uniformly from an astral alphabet", () => {
    const s = src();
    const counts = new Map<string, number>();
    for (const char of randomString(s, 40_000, "🍎🍊🍇🍓")) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9_400);
      expect(count).toBeLessThan(10_600);
    }
  });

  it("accepts grapheme clusters as an alphabet", () => {
    const s = src();
    const units = graphemes("👍🏽🎉");
    const value = randomString(s, 50, units);
    for (const unit of graphemes(value)) expect(units).toContain(unit);
  });

  it("handles a one-character alphabet without consuming randomness", () => {
    expect(randomString(src(), 5, "x")).toBe("xxxxx");
    expect(randomString(src(), 3, "🍎")).toBe("🍎🍎🍎");
  });

  it("mixes ASCII and astral characters", () => {
    const s = src();
    const value = randomString(s, 500, "ab🍎");
    expect([...value]).toHaveLength(500);
    for (const char of value) expect(["a", "b", "🍎"]).toContain(char);
  });
});

describe("graphemes", () => {
  it("keeps emoji sequences together", () => {
    expect(graphemes("👍🏽")).toEqual(["👍🏽"]);
    expect(graphemes("a👍🏽b")).toEqual(["a", "👍🏽", "b"]);
  });

  it("splits plain text per character", () => {
    expect(graphemes("ransu")).toEqual(["r", "a", "n", "s", "u"]);
  });
});

describe("unicodeRanges", () => {
  it("has every range well ordered and in bounds", () => {
    for (const [name, ranges] of Object.entries(unicodeRanges)) {
      for (const [start, end] of ranges) {
        expect(start, name).toBeGreaterThanOrEqual(0);
        expect(end, name).toBeLessThanOrEqual(0x10ffff);
        expect(end, name).toBeGreaterThanOrEqual(start);
      }
    }
  });
});
