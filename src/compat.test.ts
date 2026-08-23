import { describe, expect, it } from "vitest";
import {
  fromMathRandom,
  fromPureRand,
  fromSeedrandom,
  toMathRandom,
} from "./compat";
import { pcg32 } from "./engine/pcg32";
import { xoshiro128pp } from "./engine/xoshiro128pp";
import { Random } from "./random";

describe("toMathRandom", () => {
  it("returns doubles in [0, 1) from a Random", () => {
    const fn = toMathRandom(new Random(1));
    for (let i = 0; i < 1_000; i++) {
      const value = fn();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("stays reproducible, which is the whole point", () => {
    const a = Array.from({ length: 8 }, toMathRandom(new Random(7)));
    const b = Array.from({ length: 8 }, toMathRandom(new Random(7)));
    expect(a).toEqual(b);
  });

  it("accepts a bare engine as well", () => {
    const fn = toMathRandom(pcg32(3));
    expect(fn()).toBeGreaterThanOrEqual(0);
    expect(Array.from({ length: 5 }, toMathRandom(pcg32(3)))).toEqual(
      Array.from({ length: 5 }, toMathRandom(pcg32(3)))
    );
  });

  it("passes a plain function straight through", () => {
    const fn = () => 0.25;
    expect(toMathRandom(fn)).toBe(fn);
  });

  it("round-trips back into ransu", () => {
    const drop = toMathRandom(new Random(11));
    const readopted = new Random(fromMathRandom(drop));
    expect([1, 2, 3, 4, 5, 6]).toContain(readopted.integer(1, 6));
  });
});

describe("adopting other generators", () => {
  it("wraps a seedrandom-shaped function", () => {
    let counter = 0;
    const engine = fromSeedrandom(() => {
      counter += 0.1;
      return counter % 1;
    });
    expect(engine.seedable).toBe(false);
    expect(typeof engine.nextUint32()).toBe("number");
  });

  it("wraps a pure-rand generator", () => {
    const inner = xoshiro128pp(5);
    const engine = fromPureRand({ unsafeNext: () => inner.nextUint32() | 0 });
    const values = Array.from({ length: 100 }, () => engine.nextUint32());
    expect(
      Array.prototype.every.call(
        values,
        (value) => value >= 0 && value <= 0xffffffff
      )
    ).toBe(true);
    expect(new Random(engine).integer(1, 6)).toBeGreaterThanOrEqual(1);
  });
});
