import { describe, expect, it } from "vitest";
import { seed } from "./global/instance";
import { RansuError } from "./internal/errors";
import { backoff, date, duration, jitter, pastDate, futureDate } from "./time";

describe("date", () => {
  it("lands inside the range", () => {
    const from = new Date("2020-01-01T00:00:00Z");
    const to = new Date("2021-01-01T00:00:00Z");
    for (let i = 0; i < 2_000; i++) {
      const value = date(from, to);
      expect(value.getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(value.getTime()).toBeLessThan(to.getTime());
    }
  });

  it("accepts millisecond numbers too", () => {
    const value = date(0, 1_000);
    expect(value.getTime()).toBeGreaterThanOrEqual(0);
    expect(value.getTime()).toBeLessThan(1_000);
  });

  it("rejects a reversed range", () => {
    expect(() => date(100, 0)).toThrow(RansuError);
  });

  it("pastDate is in the past, futureDate in the future", () => {
    const now = Date.now();
    expect(pastDate(1).getTime()).toBeLessThanOrEqual(now + 5);
    expect(pastDate(1).getTime()).toBeGreaterThan(now - 86_400_000 - 5);
    expect(futureDate(1).getTime()).toBeGreaterThanOrEqual(now - 5);
  });
});

describe("duration and jitter", () => {
  it("duration stays in range", () => {
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 1_000; i++) {
      const value = duration(100, 200);
      if (value < lowest) lowest = value;
      if (value > highest) highest = value;
    }
    expect(lowest).toBeGreaterThanOrEqual(100);
    expect(highest).toBeLessThan(200);
  });

  it("jitter spreads within the factor", () => {
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 5_000; i++) {
      const value = jitter(1_000, 0.1);
      if (value < lowest) lowest = value;
      if (value > highest) highest = value;
    }
    expect(lowest).toBeGreaterThanOrEqual(900);
    expect(highest).toBeLessThan(1_100);
  });

  it("jitter of 0 is the identity", () => {
    expect(jitter(500, 0)).toBe(500);
  });

  it("rejects a negative factor", () => {
    expect(() => jitter(1, -0.1)).toThrow(RansuError);
  });
});

describe("backoff", () => {
  it("grows exponentially without jitter", () => {
    expect(backoff(0, { strategy: "none" })).toBe(100);
    expect(backoff(1, { strategy: "none" })).toBe(200);
    expect(backoff(2, { strategy: "none" })).toBe(400);
    expect(backoff(20, { strategy: "none" })).toBe(30_000);
  });

  it("full jitter covers the whole window", () => {
    const values = Array.from({ length: 5_000 }, () =>
      backoff(4, { strategy: "full" })
    );
    const cap = 100 * 2 ** 4;
    expect(
      Array.prototype.every.call(values, (value) => value >= 0 && value < cap)
    ).toBe(true);
    expect(Math.min(...values)).toBeLessThan(cap * 0.05);
    expect(Math.max(...values)).toBeGreaterThan(cap * 0.95);
  });

  it("equal jitter keeps half the delay", () => {
    const cap = 100 * 2 ** 4;
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 2_000; i++) {
      const value = backoff(4, { strategy: "equal" });
      if (value < lowest) lowest = value;
      if (value > highest) highest = value;
    }
    expect(lowest).toBeGreaterThanOrEqual(cap / 2);
    expect(highest).toBeLessThan(cap);
  });

  it("decorrelated walks up from the previous delay", () => {
    let previous = 100;
    for (let i = 0; i < 50; i++) {
      const value = backoff(i, { strategy: "decorrelated", previous });
      expect(value).toBeGreaterThanOrEqual(100);
      expect(value).toBeLessThanOrEqual(30_000);
      previous = value;
    }
  });

  it("never exceeds max", () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      expect(backoff(attempt, { max: 5_000 })).toBeLessThanOrEqual(5_000);
    }
  });

  it("is reproducible once the global is seeded", () => {
    seed(99);
    const first = [backoff(3), backoff(3), backoff(3)];
    seed(99);
    expect([backoff(3), backoff(3), backoff(3)]).toEqual(first);
  });

  it("rejects a negative attempt", () => {
    expect(() => backoff(-1)).toThrow(RansuError);
  });
});
