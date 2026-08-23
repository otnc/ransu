import { describe, expect, it } from "vitest";
import { RansuError } from "../internal/errors";
import { chacha20 } from "./chacha20";
import { mt19937 } from "./mt19937";
import { mulberry32 } from "./mulberry32";
import { nativeMath } from "./native";
import { pcg32 } from "./pcg32";
import { sfc32 } from "./sfc32";
import type { Engine } from "./types";
import { xoshiro128pp } from "./xoshiro128pp";
import { xoshiro256pp } from "./xoshiro256pp";

const factories = {
  xoshiro128pp,
  xoshiro256pp,
  pcg32,
  sfc32,
  mulberry32,
  mt19937,
  chacha20,
};

type FactoryName = keyof typeof factories;
const names = Object.keys(factories) as FactoryName[];

function take(engine: Engine, n: number): number[] {
  return Array.from({ length: n }, () => engine.nextUint32());
}

describe.each(names)("%s", (name) => {
  const create = factories[name];

  it("produces 32-bit unsigned integers", () => {
    for (const value of take(create(1), 200)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("is deterministic for a given seed", () => {
    expect(take(create(12345), 32)).toEqual(take(create(12345), 32));
  });

  it("gives uncorrelated streams for adjacent seeds", () => {
    // Naive seeding is the classic way to get near-identical streams from
    // seeds 1 and 2; SeedSequence exists to prevent that.
    const a = take(create(1), 32);
    const b = take(create(2), 32);
    const shared = a.filter((value, i) => value === b[i]).length;
    expect(shared).toBeLessThan(3);
  });

  it("accepts string, bigint and byte-array seeds", () => {
    expect(take(create("hello"), 4)).toEqual(take(create("hello"), 4));
    expect(take(create(2n ** 70n), 4)).toEqual(take(create(2n ** 70n), 4));
    expect(take(create(Uint8Array.of(1, 2, 3)), 4)).toEqual(
      take(create(Uint8Array.of(1, 2, 3)), 4)
    );
    expect(take(create("hello"), 4)).not.toEqual(take(create("hellp"), 4));
  });

  it("round-trips its state", () => {
    const engine = create(7);
    take(engine, 17);
    const state = engine.getState?.();
    expect(state).toBeDefined();

    const expected = take(engine, 16);

    const restored = create(0);
    restored.setState?.(JSON.parse(JSON.stringify(state)));
    expect(take(restored, 16)).toEqual(expected);
  });

  it("rejects state from a different algorithm", () => {
    const engine = create(1);
    const other = name === "pcg32" ? sfc32(1) : pcg32(1);
    expect(() => engine.setState?.(other.getState?.() as never)).toThrow(
      RansuError
    );
  });

  it("clones without sharing state", () => {
    const engine = create(99);
    take(engine, 5);
    const copy = engine.clone?.() as Engine;
    expect(take(copy, 10)).toEqual(take(engine, 10));
  });

  it("re-seeds in place", () => {
    const engine = create(1);
    take(engine, 5);
    engine.reseed?.(42);
    expect(take(engine, 8)).toEqual(take(create(42), 8));
  });

  it("splits into streams that do not overlap in practice", () => {
    const children = create(5).split?.(2);
    const [a, b] = children;
    const first = new Set(take(a, 64));
    const second = take(b, 64);
    expect(second.filter((v) => first.has(v)).length).toBeLessThan(3);
  });

  it("fills bytes and words", () => {
    const engine = create(3);
    const bytes = new Uint8Array(37);
    engine.fillBytes?.(bytes);
    expect(bytes.some((b) => b !== 0)).toBe(true);

    const words = new Uint32Array(9);
    engine.fillUint32?.(words);
    expect(words.some((w) => w !== 0)).toBe(true);
  });

  it("produces doubles within [0, 1)", () => {
    const engine = create(11);
    for (let i = 0; i < 500; i++) {
      const value = engine.nextFloat64?.();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("spreads values across the whole 32-bit range", () => {
    // Sixteen buckets over 2^32; with 16k draws every bucket should be busy.
    const buckets = new Array(16).fill(0);
    const engine = create(2024);
    for (let i = 0; i < 16_000; i++) buckets[engine.nextUint32() >>> 28]++;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(700);
      expect(count).toBeLessThan(1300);
    }
  });
});

describe("nativeMath", () => {
  it("cannot be seeded and reports so", () => {
    expect(nativeMath.seedable).toBe(false);
  });

  it("still produces 32-bit values", () => {
    for (const value of take(nativeMath, 100)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("pcg32.advance", () => {
  it("matches stepping forward one draw at a time", () => {
    const stepped = pcg32(4);
    take(stepped, 1000);

    const jumped = pcg32(4);
    jumped.advance(1000);

    expect(take(jumped, 8)).toEqual(take(stepped, 8));
  });

  it("rewinds with a negative delta", () => {
    const engine = pcg32(9);
    const expected = take(engine, 4);
    engine.advance(-4);
    expect(take(engine, 4)).toEqual(expected);
  });
});

describe("xoshiro128pp.jump", () => {
  it("moves the state somewhere else entirely", () => {
    const engine = xoshiro128pp(1);
    const before = engine.getState().data.join(",");
    engine.jump();
    expect(engine.getState().data.join(",")).not.toBe(before);
  });
});

describe("mt19937", () => {
  it("matches the reference init_genrand vectors", () => {
    // Published output of the reference implementation for init_genrand(5489),
    // which is the documented MT19937 default seed.
    expect(take(mt19937.withScalarSeed(5489), 5)).toEqual([
      3499211612, 581869302, 3890346734, 3586334585, 545404204,
    ]);
  });

  it("matches the reference init_by_array vectors", () => {
    expect(
      take(mt19937.withArraySeed([0x123, 0x234, 0x345, 0x456]), 8)
    ).toEqual([
      1067595299, 955945823, 477289528, 4107218783, 4228976476, 3344332714,
      3355579695, 227628506,
    ]);
  });
});
