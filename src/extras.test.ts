import { describe, expect, it } from "vitest";
import { color, hsl, rgb } from "./color";
import { coin, d20, d6, dice } from "./dice";
import {
  angle,
  angleDegrees,
  inSphere,
  inCircle,
  inRect,
  onCircle,
  onSphere,
  unitVector,
} from "./geometry";
import { seed } from "./global/instance";
import { pickValue, subset } from "./global/collections";
import { sampleIntegers } from "./global/numbers";
import { RansuError } from "./internal/errors";

describe("pickValue and subset", () => {
  it("pickValue returns a value of the object or Map", () => {
    for (let i = 0; i < 200; i++) {
      expect([1, 2, 3]).toContain(pickValue({ a: 1, b: 2, c: 3 }));
      expect(["x"]).toContain(pickValue(new Map([["k", "x"]])));
    }
  });

  it("pickValue rejects an empty target", () => {
    expect(() => pickValue({})).toThrow(RansuError);
  });

  it("subset keeps roughly the requested share", () => {
    const items = Array.from({ length: 1_000 }, (_, i) => i);
    let kept = 0;
    for (let i = 0; i < 200; i++) kept += subset(items, 0.25).length;
    expect(Math.abs(kept / 200 / 1_000 - 0.25)).toBeLessThan(0.01);
  });

  it("subset preserves order and membership", () => {
    const items = Array.from({ length: 200 }, (_, i) => i);
    const result = subset(items, 0.5);
    expect(result).toEqual([...result].sort((a, b) => a - b));
    for (const value of result) expect(items).toContain(value);
  });

  it("subset is all or nothing at the extremes", () => {
    const items = [1, 2, 3];
    expect(subset(items, 0)).toEqual([]);
    expect(subset(items, 1)).toEqual(items);
    expect(() => subset(items, 1.5)).toThrow(RansuError);
  });
});

describe("sampleIntegers", () => {
  it("returns distinct values inside the range", () => {
    for (let i = 0; i < 200; i++) {
      const drawn = sampleIntegers(10, 5, 40);
      expect(new Set(drawn).size).toBe(10);
      expect(
        drawn.every(
          (value) => value >= 5 && value <= 40 && Number.isInteger(value)
        )
      ).toBe(true);
    }
  });

  it("handles a range far too large to materialise", () => {
    // The point of the function: Python writes sample(range(10**9), 10).
    const drawn = sampleIntegers(10, 0, 1_000_000_000);
    expect(new Set(drawn).size).toBe(10);
    expect(drawn.every((value) => value >= 0 && value <= 1_000_000_000)).toBe(
      true
    );
  });

  it("can take the whole range", () => {
    expect(sampleIntegers(5, 1, 5).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("is uniform over the range", () => {
    const counts = new Array<number>(10).fill(0);
    for (let i = 0; i < 40_000; i++) {
      for (const value of sampleIntegers(3, 0, 9)) counts[value]++;
    }
    // Each value should appear in 3/10 of the draws.
    for (const count of counts) {
      expect(count).toBeGreaterThan(11_000);
      expect(count).toBeLessThan(13_000);
    }
  });

  it("refuses more values than the range holds", () => {
    expect(() => sampleIntegers(6, 1, 5)).toThrow(/only 5 distinct/);
    expect(sampleIntegers(0, 1, 5)).toEqual([]);
  });
});

describe("dice", () => {
  it("reads the usual notation", () => {
    for (let i = 0; i < 500; i++) {
      expect(dice("d6")).toBeGreaterThanOrEqual(1);
      expect(dice("d6")).toBeLessThanOrEqual(6);
      expect(dice("3d6")).toBeGreaterThanOrEqual(3);
      expect(dice("3d6")).toBeLessThanOrEqual(18);
      expect(dice("2d10+3")).toBeGreaterThanOrEqual(5);
      expect(dice("2d10+3")).toBeLessThanOrEqual(23);
      expect(dice("1d4-1")).toBeGreaterThanOrEqual(0);
      expect(dice("1d4-1")).toBeLessThanOrEqual(3);
    }
  });

  it("tolerates spacing and capital D", () => {
    expect(() => dice(" 2 D 6 + 1 ")).not.toThrow();
  });

  it("reports every die when asked", () => {
    const result = dice.detail("4d6+2");
    expect(result.dice).toHaveLength(4);
    expect(result.modifier).toBe(2);
    expect(result.total).toBe(
      result.dice.reduce((a, b) => a + b, 0) + result.modifier
    );
  });

  it("rejects nonsense", () => {
    expect(() => dice("hello")).toThrow(/dice notation/);
    expect(() => dice("0d6")).toThrow(RansuError);
    expect(() => dice("2d1")).toThrow(/at least 2 sides/);
  });

  it("covers every face of a d20", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) seen.add(d20());
    expect(seen.size).toBe(20);
  });

  it("sums repeated dice", () => {
    for (let i = 0; i < 500; i++) {
      const total = d6(3);
      expect(total).toBeGreaterThanOrEqual(3);
      expect(total).toBeLessThanOrEqual(18);
    }
  });

  it("coin lands on both sides", () => {
    const seen = new Set(Array.from({ length: 200 }, () => coin()));
    expect([...seen].sort()).toEqual(["heads", "tails"]);
  });

  it("is reproducible once seeded", () => {
    seed(7);
    const first = [dice("3d6"), dice("3d6"), dice("3d6")];
    seed(7);
    expect([dice("3d6"), dice("3d6"), dice("3d6")]).toEqual(first);
  });
});

describe("geometry", () => {
  it("unitVector has length one", () => {
    for (const dimensions of [1, 2, 3, 5]) {
      for (let i = 0; i < 200; i++) {
        const v = unitVector(dimensions);
        expect(v).toHaveLength(dimensions);
        const length = Math.hypot(...v);
        expect(length).toBeCloseTo(1, 10);
      }
    }
  });

  it("onCircle sits on the circumference", () => {
    for (let i = 0; i < 500; i++) {
      const [x, y] = onCircle(3);
      expect(Math.hypot(x, y)).toBeCloseTo(3, 10);
    }
  });

  it("inCircle fills the disc by area, not by radius", () => {
    // Half the area of a unit disc lies inside radius sqrt(1/2). Without the
    // square root in the implementation this lands near 0.71 instead.
    let inner = 0;
    const draws = 200_000;
    for (let i = 0; i < draws; i++) {
      const [x, y] = inCircle(1);
      if (Math.hypot(x, y) <= Math.SQRT1_2) inner++;
    }
    // Four standard errors of a proportion at this sample size.
    expect(Math.abs(inner / draws - 0.5)).toBeLessThan(0.005);
  });

  it("onSphere and inSphere respect the radius", () => {
    for (let i = 0; i < 300; i++) {
      expect(Math.hypot(...onSphere(2))).toBeCloseTo(2, 10);
      expect(Math.hypot(...inSphere(2))).toBeLessThanOrEqual(2);
    }
  });

  it("inSphere fills by volume", () => {
    // Half the volume of a unit ball lies inside radius (1/2)^(1/3).
    let inner = 0;
    const draws = 200_000;
    const half = 0.5 ** (1 / 3);
    for (let i = 0; i < draws; i++) {
      if (Math.hypot(...inSphere(1)) <= half) inner++;
    }
    expect(Math.abs(inner / draws - 0.5)).toBeLessThan(0.005);
  });

  it("inRect stays inside", () => {
    for (let i = 0; i < 500; i++) {
      const [x, y] = inRect({ x: 10, y: 20, width: 4, height: 6 });
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThan(14);
      expect(y).toBeGreaterThanOrEqual(20);
      expect(y).toBeLessThan(26);
    }
  });

  it("angles cover their range", () => {
    for (let i = 0; i < 500; i++) {
      expect(angle()).toBeLessThan(2 * Math.PI);
      expect(angleDegrees()).toBeLessThan(360);
    }
  });
});

describe("color", () => {
  it("returns a CSS hex colour", () => {
    for (let i = 0; i < 500; i++) expect(color()).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("rgb channels stay in range", () => {
    for (let i = 0; i < 500; i++) {
      const [r, g, b, a] = rgb();
      expect(
        [r, g, b].every((v) => Number.isInteger(v) && v >= 0 && v <= 255)
      ).toBe(true);
      expect(a).toBe(1);
    }
  });

  it("honours channel constraints", () => {
    for (let i = 0; i < 500; i++) {
      const [h, s, l] = hsl({
        hue: [200, 220],
        saturation: [0.5, 0.5],
        lightness: [0.4, 0.4],
      });
      expect(h).toBeGreaterThanOrEqual(200);
      expect(h).toBeLessThanOrEqual(220);
      expect(s).toBe(0.5);
      expect(l).toBe(0.4);
    }
  });

  it("a fixed hsl maps to one hex", () => {
    expect(color({ hue: 0, saturation: 1, lightness: 0.5 })).toBe("#ff0000");
  });

  it("rejects out-of-gamut constraints", () => {
    expect(() => hsl({ saturation: [0, 2] })).toThrow(RansuError);
    expect(() => hsl({ hue: [300, 100] })).toThrow(/must be <=/);
  });

  it("adds opacity only when asked", () => {
    expect(color()).toMatch(/^#[0-9a-f]{6}$/);
    expect(color({ alpha: true })).toMatch(/^#[0-9a-f]{8}$/);
    expect(color({ alpha: 0.5 })).toMatch(/^#[0-9a-f]{6}80$/);
  });

  it("writes each CSS notation", () => {
    expect(color({ format: "rgb" })).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
    expect(color({ format: "rgb", alpha: 0.4 })).toMatch(
      /^rgb\(\d+ \d+ \d+ \/ 0\.4\)$/
    );
    expect(color({ format: "hsl" })).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
    expect(color({ format: "hsl", alpha: 0.2 })).toMatch(
      /^hsl\(\d+ \d+% \d+% \/ 0\.2\)$/
    );
  });

  it("alpha stays inside its span", () => {
    for (let i = 0; i < 500; i++) {
      const [, , , a] = rgb({ alpha: [0.25, 0.75] });
      expect(a).toBeGreaterThanOrEqual(0.25);
      expect(a).toBeLessThanOrEqual(0.75);
    }
    expect(rgb()[3]).toBe(1);
  });
});
