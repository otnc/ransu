import { describe, expect, it } from "vitest";
import {
  bucket,
  hashFloat,
  hashInt,
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
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 100_000; i++)
      buckets[Math.floor(hashFloat(`user-${i}`) * 10)]++;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(9_400);
      expect(count).toBeLessThan(10_600);
    }
  });

  it("stays within [0, 1)", () => {
    for (let i = 0; i < 5_000; i++) {
      const value = hashFloat(`k${i}`);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("hashInt and hashPick", () => {
  it("are stable and in range", () => {
    expect(hashInt("x", 1, 6)).toBe(hashInt("x", 1, 6));
    for (let i = 0; i < 2_000; i++) {
      const value = hashInt(`k${i}`, 1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
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
    const counts = new Array(16).fill(0);
    for (let i = 0; i < 160_000; i++) counts[bucket(`user-${i}`, 16)]++;
    for (const count of counts) {
      expect(count).toBeGreaterThan(9_400);
      expect(count).toBeLessThan(10_600);
    }
  });

  it("rejects a non-positive bucket count", () => {
    expect(() => bucket("u", 0)).toThrow(RansuError);
  });
});

describe("rollout", () => {
  it("hits roughly the requested share", () => {
    let inside = 0;
    for (let i = 0; i < 100_000; i++) if (rollout(`user-${i}`, 0.25)) inside++;
    expect(inside / 100_000).toBeCloseTo(0.25, 2);
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
