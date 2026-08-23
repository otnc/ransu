import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "./engine/xoshiro128pp";
import { NANOID_ALPHABET, nanoid } from "./nanoid";

describe("nanoid", () => {
  it("defaults to 21 characters from the standard alphabet", () => {
    const value = nanoid();
    expect(value).toHaveLength(21);
    for (const char of value) expect(NANOID_ALPHABET).toContain(char);
  });

  it("honours a custom size and alphabet", () => {
    expect(nanoid(8)).toHaveLength(8);
    expect(nanoid(100, { alphabet: "ab" })).toMatch(/^[ab]{100}$/);
  });

  it("is uniform over its 64-character alphabet", () => {
    const counts = new Map<string, number>();
    for (const char of nanoid(64_000))
      counts.set(char, (counts.get(char) ?? 0) + 1);
    expect(counts.size).toBe(64);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1_200);
    }
  });

  it("is reproducible with an engine", () => {
    expect(nanoid(21, { engine: xoshiro128pp(7) })).toBe(
      nanoid(21, { engine: xoshiro128pp(7) })
    );
  });
});
