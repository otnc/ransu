import { describe, expect, it } from "vitest";
import {
  bucket,
  hashFloat,
  hashInteger,
  hashPick,
  hashRandom,
  rollout,
} from "./hash";
import { RansuError } from "./internal/errors";

describe("hashFloat", () => {
  it("is stable for the same key", () => {
    expect(hashFloat("user-42")).toBe(hashFloat("user-42"));
    expect(hashFloat(7)).toBe(hashFloat(7));
  });

  it("differs between keys and between salts", () => {
    expect(hashFloat("a")).not.toBe(hashFloat("b"));
    expect(hashFloat("a", "experiment-1")).not.toBe(
      hashFloat("a", "experiment-2")
    );
    expect(hashFloat("a")).not.toBe(hashFloat("a", "salt"));
  });

  it("spreads keys evenly", () => {
    const buckets = new Array<number>(10).fill(0);
    const draws = 20_000;
    for (let i = 0; i < draws; i++)
      buckets[Math.floor(hashFloat(`user-${i}`) * 10)]++;
    // Six standard errors of a binomial count, so the bound moves with the
    // draw count instead of being a number someone has to remember to update.
    const expected = draws / buckets.length;
    const tolerance = 6 * Math.sqrt(draws * 0.1 * 0.9);
    for (const count of buckets) {
      expect(Math.abs(count - expected)).toBeLessThan(tolerance);
    }
  });

  it("stays within [0, 1)", () => {
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 5_000; i++) {
      const value = hashFloat(`k${i}`);
      if (value < lowest) lowest = value;
      if (value > highest) highest = value;
    }
    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThan(1);
  });
});

describe("hashInteger and hashPick", () => {
  it("are stable and in range", () => {
    expect(hashInteger("x", 1, 6)).toBe(hashInteger("x", 1, 6));
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 2_000; i++) {
      const value = hashInteger(`k${i}`, 1, 6);
      if (value < lowest) lowest = value;
      if (value > highest) highest = value;
    }
    expect(lowest).toBeGreaterThanOrEqual(1);
    expect(highest).toBeLessThanOrEqual(6);
  });

  it("hashPick returns a member, always the same one", () => {
    const variants = ["control", "blue", "green"] as const;
    expect(hashPick("user-1", variants)).toBe(hashPick("user-1", variants));
    for (let i = 0; i < 500; i++) {
      expect(variants).toContain(hashPick(`user-${i}`, variants));
    }
  });
});

describe("bucket", () => {
  it("is stable and evenly distributed", () => {
    expect(bucket("u1", 16)).toBe(bucket("u1", 16));
    const counts = new Array<number>(16).fill(0);
    const draws = 32_000;
    for (let i = 0; i < draws; i++) counts[bucket(`user-${i}`, 16)]++;
    const expected = draws / counts.length;
    const tolerance = 6 * Math.sqrt(draws * (1 / 16) * (15 / 16));
    for (const count of counts) {
      expect(Math.abs(count - expected)).toBeLessThan(tolerance);
    }
  });

  it("rejects a non-positive bucket count", () => {
    expect(() => bucket("u", 0)).toThrow(RansuError);
  });
});

describe("rollout", () => {
  it("hits roughly the requested share", () => {
    const draws = 40_000;
    let inside = 0;
    for (let i = 0; i < draws; i++) if (rollout(`user-${i}`, 0.25)) inside++;
    // Four standard errors of a proportion.
    const tolerance = 4 * Math.sqrt((0.25 * 0.75) / draws);
    expect(Math.abs(inside / draws - 0.25)).toBeLessThan(tolerance);
  });

  it("only ever adds keys as the percentage grows", () => {
    // The property that makes a gradual rollout safe: nobody gets taken back
    // out of the experiment when you widen it.
    const at10 = new Set<string>();
    for (let i = 0; i < 5_000; i++) {
      const key = `user-${i}`;
      if (rollout(key, 0.1)) at10.add(key);
    }
    for (const key of at10) expect(rollout(key, 0.5)).toBe(true);
  });

  it("is all or nothing at the extremes", () => {
    for (let i = 0; i < 200; i++) {
      expect(rollout(`k${i}`, 0)).toBe(false);
      expect(rollout(`k${i}`, 1)).toBe(true);
    }
  });
});

describe("hashRandom", () => {
  it("gives a whole reproducible stream per key", () => {
    const a = hashRandom("seed-key");
    const b = hashRandom("seed-key");
    expect(Array.from({ length: 8 }, () => a.integer(1, 1000))).toEqual(
      Array.from({ length: 8 }, () => b.integer(1, 1000))
    );
    expect(hashRandom("other").integer(1, 1_000_000)).not.toBe(
      hashRandom("seed-key").integer(1, 1_000_000)
    );
  });
});
