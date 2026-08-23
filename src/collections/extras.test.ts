import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engine/xoshiro128pp";
import { RansuError } from "../internal/errors";
import { createSource } from "../internal/source";
import { combination, takeOut } from "./sample";
import { weightedSample } from "./weighted";

const src = () => createSource(xoshiro128pp("extras"));

describe("combination", () => {
  it("keeps the original order", () => {
    const s = src();
    const items = [10, 20, 30, 40, 50, 60, 70, 80];
    for (let i = 0; i < 500; i++) {
      const drawn = combination(s, items, 4);
      expect(drawn).toEqual([...drawn].sort((a, b) => a - b));
      expect(new Set(drawn).size).toBe(4);
    }
  });

  it("is uniform over subsets", () => {
    const s = src();
    const counts = new Map<string, number>();
    for (let i = 0; i < 60_000; i++) {
      const key = combination(s, [0, 1, 2, 3], 2).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9_200);
      expect(count).toBeLessThan(10_800);
    }
  });

  it("handles both algorithm paths and the edges", () => {
    const s = src();
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(combination(s, items, 3)).toHaveLength(3);
    expect(combination(s, items, 19)).toHaveLength(19);
    expect(combination(s, items, 20)).toEqual(items);
    expect(combination(s, items, 0)).toEqual([]);
    expect(() => combination(s, items, 21)).toThrow(RansuError);
  });
});

describe("takeOut", () => {
  it("removes exactly one element and returns it", () => {
    const s = src();
    const items = [1, 2, 3, 4, 5];
    const value = takeOut(s, items);
    expect(items).toHaveLength(4);
    expect(items).not.toContain(value);
    expect([1, 2, 3, 4, 5]).toContain(value);
  });

  it("drains an array without repeating or losing anything", () => {
    const s = src();
    const items = Array.from({ length: 50 }, (_, i) => i);
    const drawn: number[] = [];
    while (items.length > 0) drawn.push(takeOut(s, items));
    expect(drawn.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, i) => i)
    );
  });

  it("throws on an empty array", () => {
    expect(() => takeOut(src(), [])).toThrow(RansuError);
  });
});

describe("weightedSample", () => {
  it("returns k distinct elements", () => {
    const s = src();
    for (let i = 0; i < 500; i++) {
      const drawn = weightedSample(s, ["a", "b", "c", "d"], [1, 2, 3, 4], 2);
      expect(drawn).toHaveLength(2);
      expect(new Set(drawn).size).toBe(2);
    }
  });

  it("favours heavier items", () => {
    const s = src();
    const counts = { a: 0, b: 0, c: 0 };
    const draws = 60_000;
    for (let i = 0; i < draws; i++) {
      for (const value of weightedSample(
        s,
        ["a", "b", "c"] as const,
        [1, 2, 9],
        1
      )) {
        counts[value]++;
      }
    }
    expect(counts.a / draws).toBeCloseTo(1 / 12, 2);
    expect(counts.b / draws).toBeCloseTo(2 / 12, 2);
    expect(counts.c / draws).toBeCloseTo(9 / 12, 2);
  });

  it("never picks a zero-weight item while others remain", () => {
    const s = src();
    for (let i = 0; i < 2_000; i++) {
      expect(weightedSample(s, ["never", "always"], [0, 1], 1)).toEqual([
        "always",
      ]);
    }
  });

  it("falls back to zero-weight items only when it must", () => {
    const drawn = weightedSample(src(), ["never", "always"], [0, 1], 2);
    expect(drawn.sort()).toEqual(["always", "never"]);
  });

  it("validates its inputs", () => {
    expect(() => weightedSample(src(), ["a"], [1], 2)).toThrow(RansuError);
    expect(() => weightedSample(src(), ["a", "b"], [1], 1)).toThrow(
      /must equal items.length/
    );
    expect(() => weightedSample(src(), ["a"], [-1], 1)).toThrow(RansuError);
    expect(weightedSample(src(), ["a"], [1], 0)).toEqual([]);
  });
});
