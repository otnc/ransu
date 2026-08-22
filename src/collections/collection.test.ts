import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engines/xoshiro128pp";
import { RansuError } from "../internal/errors";
import { createSource } from "../internal/source";
import { choices, pick, pickEntry, pickIndex, pickKey, tryPick } from "./pick";
import { reservoir, sample } from "./sample";
import {
  partialShuffle,
  permutation,
  shuffle,
  shuffleInPlace,
  shuffleString,
} from "./shuffle";
import { AliasTable, weighted } from "./weighted";

const src = () => createSource(xoshiro128pp("collections"));

describe("pick", () => {
  it("only returns members of the collection", () => {
    const s = src();
    const items = ["a", "b", "c"];
    for (let i = 0; i < 500; i++) expect(items).toContain(pick(s, items));
  });

  it("is uniform", () => {
    const s = src();
    const counts = new Map<string, number>();
    for (let i = 0; i < 90_000; i++) {
      const value = pick(s, ["a", "b", "c"]);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const value of ["a", "b", "c"]) {
      expect(counts.get(value)).toBeGreaterThan(29_000);
      expect(counts.get(value)).toBeLessThan(31_000);
    }
  });

  it("throws on an empty collection but tryPick does not", () => {
    expect(() => pick(src(), [])).toThrow(RansuError);
    expect(() => pick(src(), [])).toThrow(/tryPick/);
    expect(tryPick(src(), [])).toBeUndefined();
  });

  it("accepts Sets, Maps, strings and generators", () => {
    const s = src();
    expect(["x", "y"]).toContain(pick(s, new Set(["x", "y"])));
    expect("abc").toContain(pick(s, "abc"));
    expect([1, 2, 3]).toContain(pick(s, new Map([[1, 1]]).keys()));
    expect([10, 20]).toContain(
      pick(
        s,
        (function* () {
          yield 10;
          yield 20;
        })()
      )
    );
  });

  it("pickIndex stays in bounds", () => {
    const s = src();
    for (let i = 0; i < 200; i++) {
      const index = pickIndex(s, [1, 2, 3, 4]);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });

  it("picks keys and entries of objects and Maps", () => {
    const s = src();
    expect(["a", "b"]).toContain(pickKey(s, { a: 1, b: 2 }));
    expect([1, 2]).toContain(pickEntry(s, { a: 1, b: 2 })[1]);
    expect(["k"]).toContain(pickKey(s, new Map([["k", 9]])));
  });
});

describe("choices", () => {
  it("samples with replacement, so k may exceed the input size", () => {
    const result = choices(src(), ["a", "b"], 10);
    expect(result).toHaveLength(10);
    for (const value of result) expect(["a", "b"]).toContain(value);
  });
});

describe("sample", () => {
  it("returns distinct elements", () => {
    const s = src();
    const items = Array.from({ length: 50 }, (_, i) => i);
    for (let i = 0; i < 200; i++) {
      const drawn = sample(s, items, 10);
      expect(new Set(drawn).size).toBe(10);
      for (const value of drawn) expect(items).toContain(value);
    }
  });

  it("covers both algorithms", () => {
    const s = src();
    const items = Array.from({ length: 20 }, (_, i) => i);
    // k*2 <= n takes Floyd's path, otherwise partial Fisher-Yates.
    expect(new Set(sample(s, items, 5)).size).toBe(5);
    expect(new Set(sample(s, items, 18)).size).toBe(18);
    expect(new Set(sample(s, items, 20)).size).toBe(20);
  });

  it("is uniform over subsets", () => {
    const s = src();
    const counts = new Map<string, number>();
    for (let i = 0; i < 60_000; i++) {
      const key = sample(s, [0, 1, 2, 3], 2).slice().sort().join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // Six possible 2-subsets of a 4-element set.
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9_200);
      expect(count).toBeLessThan(10_800);
    }
  });

  it("refuses k greater than the collection size", () => {
    expect(() => sample(src(), [1, 2], 3)).toThrow(/choices/);
  });

  it("returns an empty array for k = 0", () => {
    expect(sample(src(), [1, 2, 3], 0)).toEqual([]);
  });
});

describe("reservoir", () => {
  it("takes k items from a stream of unknown length", () => {
    const s = src();
    function* stream(n: number) {
      for (let i = 0; i < n; i++) yield i;
    }
    for (let i = 0; i < 100; i++) {
      const drawn = reservoir(s, stream(1_000), 5);
      expect(drawn).toHaveLength(5);
      expect(new Set(drawn).size).toBe(5);
    }
  });

  it("returns everything when the stream is shorter than k", () => {
    expect(reservoir(src(), [1, 2], 5).sort()).toEqual([1, 2]);
  });

  it("is roughly uniform across the stream", () => {
    const s = src();
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 20_000; i++) {
      for (const value of reservoir(
        s,
        Array.from({ length: 10 }, (_, k) => k),
        3
      )) {
        counts[value]++;
      }
    }
    // Each element should appear in 3/10 of the draws.
    for (const count of counts) {
      expect(count).toBeGreaterThan(5_400);
      expect(count).toBeLessThan(6_600);
    }
  });
});

describe("shuffle", () => {
  it("preserves the multiset and leaves the input alone", () => {
    const s = src();
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(s, input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(result.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("mutates only when asked", () => {
    const s = src();
    const input = [1, 2, 3, 4, 5];
    expect(shuffleInPlace(s, input)).toBe(input);
    expect(input.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("reaches every permutation with about equal frequency", () => {
    const s = src();
    const counts = new Map<string, number>();
    for (let i = 0; i < 60_000; i++) {
      const key = shuffle(s, [1, 2, 3]).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9_300);
      expect(count).toBeLessThan(10_700);
    }
  });

  it("partialShuffle returns k settled elements", () => {
    const s = src();
    const items = Array.from({ length: 1_000 }, (_, i) => i);
    const top = partialShuffle(s, items, 3);
    expect(top).toHaveLength(3);
    expect(new Set(top).size).toBe(3);
  });

  it("permutation contains every index once", () => {
    expect(permutation(src(), 100).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, i) => i)
    );
  });

  it("shuffleString keeps the same characters", () => {
    const result = shuffleString(src(), "ransu");
    expect(result.split("").sort().join("")).toBe("anrsu");
  });
});

describe("weighted", () => {
  it("follows the weights", () => {
    const s = src();
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 100_000; i++) {
      counts[weighted(s, ["a", "b", "c"] as const, [1, 3, 6])]++;
    }
    expect(counts.a / 100_000).toBeCloseTo(0.1, 2);
    expect(counts.b / 100_000).toBeCloseTo(0.3, 2);
    expect(counts.c / 100_000).toBeCloseTo(0.6, 2);
  });

  it("never returns a zero-weight element", () => {
    const s = src();
    for (let i = 0; i < 5_000; i++) {
      expect(weighted(s, ["never", "always"], [0, 1])).toBe("always");
    }
  });

  it("rejects bad weights", () => {
    expect(() => weighted(src(), ["a"], [1, 2])).toThrow(
      /must equal items.length/
    );
    expect(() => weighted(src(), ["a"], [-1])).toThrow(RansuError);
    expect(() => weighted(src(), ["a", "b"], [0, 0])).toThrow(RansuError);
    expect(() => weighted(src(), ["a"], [Number.NaN])).toThrow(RansuError);
  });
});

describe("AliasTable", () => {
  it("matches the requested distribution", () => {
    const s = src();
    const table = new AliasTable(["a", "b", "c", "d"] as const, [1, 1, 2, 6]);
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    for (let i = 0; i < 200_000; i++) counts[table.pick(s)]++;

    expect(counts.a / 200_000).toBeCloseTo(0.1, 2);
    expect(counts.b / 200_000).toBeCloseTo(0.1, 2);
    expect(counts.c / 200_000).toBeCloseTo(0.2, 2);
    expect(counts.d / 200_000).toBeCloseTo(0.6, 2);
  });

  it("handles a single element", () => {
    const table = new AliasTable(["only"], [1]);
    expect(table.pick(src())).toBe("only");
    expect(table.length).toBe(1);
  });
});
