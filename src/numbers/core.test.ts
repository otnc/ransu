import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engine/xoshiro128pp";
import { RansuError } from "../internal/errors";
import { createSource } from "../internal/source";
import { randomBigInt } from "./bigint";
import { bigBits, bits } from "./bits";
import { bool, chance, oneIn, sign } from "./bool";
import { bytes, floats, integers } from "./bytes";
import { float, random } from "./float";
import { below, integer, range } from "./integer";

const src = () => createSource(xoshiro128pp(20260821));

describe("random / float", () => {
  it("stays within [0, 1)", () => {
    const s = src();
    for (let i = 0; i < 20_000; i++) {
      const value = random(s);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("uses the full 53 bits of mantissa", () => {
    const s = src();
    // With only 32 bits of entropy, every value would be a multiple of 2^-32.
    const fine = Array.from({ length: 200 }, () => random(s)).filter(
      (v) => v * 0x100000000 !== Math.floor(v * 0x100000000)
    );
    expect(fine.length).toBeGreaterThan(150);
  });

  it("maps onto [min, max)", () => {
    const s = src();
    for (let i = 0; i < 5_000; i++) {
      const value = float(s, -3, 7);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThan(7);
    }
  });

  it("treats a lone argument as the upper bound", () => {
    const s = src();
    for (let i = 0; i < 1_000; i++) {
      const value = float(s, 5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
    }
  });

  it("rejects a reversed range", () => {
    expect(() => float(src(), 5, 1)).toThrow(RansuError);
  });
});

describe("integer", () => {
  it("includes both ends", () => {
    const s = src();
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) seen.add(integer(s, 1, 6));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("returns min when the range holds one value", () => {
    expect(integer(src(), 4, 4)).toBe(4);
  });

  it("is unbiased over a range that does not divide 2^32", () => {
    // 3 is the classic case where `floor(random() * n)` skews: 2^32 % 3 != 0.
    const s = src();
    const counts = [0, 0, 0];
    const draws = 600_000;
    for (let i = 0; i < draws; i++) counts[integer(s, 0, 2)]++;

    const expected = draws / 3;
    // Chi-square with 2 degrees of freedom: 13.8 is the 0.999 quantile.
    const chi = counts.reduce(
      (acc, c) => acc + (c - expected) ** 2 / expected,
      0
    );
    expect(chi).toBeLessThan(13.8);
  });

  it("is unbiased over a large range", () => {
    const s = src();
    const buckets = new Array(10).fill(0);
    const draws = 200_000;
    for (let i = 0; i < draws; i++) {
      buckets[Math.floor(integer(s, 0, 999_999) / 100_000)]++;
    }
    const expected = draws / 10;
    const chi = buckets.reduce(
      (acc, c) => acc + (c - expected) ** 2 / expected,
      0
    );
    expect(chi).toBeLessThan(27.9); // 0.999 quantile, 9 degrees of freedom
  });

  it("handles ranges wider than 2^32", () => {
    const s = src();
    const min = -(2 ** 40);
    const max = 2 ** 40;
    for (let i = 0; i < 5_000; i++) {
      const value = integer(s, min, max);
      expect(Number.isSafeInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it("covers the whole 32-bit range exactly", () => {
    const s = src();
    for (let i = 0; i < 1_000; i++) {
      const value = integer(s, 0, 0xffffffff);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("refuses ranges beyond 2^53 instead of rounding", () => {
    expect(() => integer(src(), 0, Number.MAX_SAFE_INTEGER)).toThrow(/bigint/);
  });

  it("refuses non-integers and reversed bounds", () => {
    expect(() => integer(src(), 1.5, 3)).toThrow(RansuError);
    expect(() => integer(src(), 9, 2)).toThrow(
      /min \(9\) must be <= max \(2\)/
    );
  });
});

describe("below", () => {
  it("excludes the upper bound", () => {
    const s = src();
    for (let i = 0; i < 5_000; i++) {
      const value = below(s, 4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4);
    }
  });

  it("rejects zero and negative bounds", () => {
    expect(() => below(src(), 0)).toThrow(RansuError);
    expect(() => below(src(), -1)).toThrow(RansuError);
  });
});

describe("range", () => {
  it("behaves like Python randrange", () => {
    const s = src();
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) seen.add(range(s, 0, 10, 3));
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 3, 6, 9]);
  });

  it("accepts a negative step", () => {
    const s = src();
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) seen.add(range(s, 10, 0, -5));
    expect([...seen].sort((a, b) => a - b)).toEqual([5, 10]);
  });

  it("treats a lone argument as the exclusive upper bound", () => {
    const s = src();
    for (let i = 0; i < 500; i++) {
      const value = range(s, 5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
    }
  });

  it("rejects an empty or zero-step range", () => {
    expect(() => range(src(), 5, 5)).toThrow(RansuError);
    expect(() => range(src(), 0, 10, 0)).toThrow(RansuError);
  });
});

describe("bigint", () => {
  it("includes both ends and stays inside them", () => {
    const s = src();
    for (let i = 0; i < 2_000; i++) {
      const value = randomBigInt(s, 10n ** 30n, 10n ** 30n + 5n);
      expect(value).toBeGreaterThanOrEqual(10n ** 30n);
      expect(value).toBeLessThanOrEqual(10n ** 30n + 5n);
    }
  });

  it("is unbiased on a small range", () => {
    const s = src();
    const counts = new Map<bigint, number>();
    for (let i = 0; i < 60_000; i++) {
      const value = randomBigInt(s, 0n, 2n);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const value of [0n, 1n, 2n]) {
      expect(counts.get(value)).toBeGreaterThan(19_000);
      expect(counts.get(value)).toBeLessThan(21_000);
    }
  });
});

describe("bits", () => {
  it("respects the requested width", () => {
    const s = src();
    for (const width of [1, 7, 31, 32, 33, 53]) {
      for (let i = 0; i < 200; i++) {
        const value = bits(s, width);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(2 ** width);
      }
    }
  });

  it("returns 0 for a width of 0", () => {
    expect(bits(src(), 0)).toBe(0);
  });

  it("points at bigBits beyond 53 bits", () => {
    expect(() => bits(src(), 54)).toThrow(/bigBits/);
  });

  it("bigBits respects wide widths", () => {
    const s = src();
    for (let i = 0; i < 200; i++) {
      const value = bigBits(s, 130);
      expect(value).toBeGreaterThanOrEqual(0n);
      expect(value).toBeLessThan(2n ** 130n);
    }
  });
});

describe("bool and friends", () => {
  it("is fair by default", () => {
    const s = src();
    let trues = 0;
    for (let i = 0; i < 100_000; i++) if (bool(s)) trues++;
    expect(trues).toBeGreaterThan(49_000);
    expect(trues).toBeLessThan(51_000);
  });

  it("honours a probability", () => {
    const s = src();
    let trues = 0;
    for (let i = 0; i < 100_000; i++) if (chance(s, 0.25)) trues++;
    expect(trues).toBeGreaterThan(24_000);
    expect(trues).toBeLessThan(26_000);
  });

  it("short-circuits the certain cases", () => {
    expect(chance(src(), 0)).toBe(false);
    expect(chance(src(), 1)).toBe(true);
  });

  it("rejects probabilities outside [0, 1]", () => {
    expect(() => chance(src(), 1.5)).toThrow(RansuError);
  });

  it("oneIn(4) is true about a quarter of the time", () => {
    const s = src();
    let trues = 0;
    for (let i = 0; i < 40_000; i++) if (oneIn(s, 4)) trues++;
    expect(trues).toBeGreaterThan(9_400);
    expect(trues).toBeLessThan(10_600);
  });

  it("sign returns only -1 and 1", () => {
    const s = src();
    const seen = new Set(Array.from({ length: 500 }, () => sign(s)));
    expect([...seen].sort()).toEqual([-1, 1]);
  });
});

describe("bulk helpers", () => {
  it("bytes fills every requested length", () => {
    const s = src();
    for (const n of [0, 1, 3, 4, 5, 64, 4096]) {
      expect(bytes(s, n)).toHaveLength(n);
    }
  });

  it("floats and integers return typed arrays", () => {
    const s = src();
    expect(floats(s, 10)).toBeInstanceOf(Float64Array);
    const values = integers(s, 1_000, 5, 9);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(9);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
