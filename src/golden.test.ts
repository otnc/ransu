import { describe, expect, it } from "vitest";
import { chacha20 } from "./engine/chacha20";
import { mt19937 } from "./engine/mt19937";
import { mulberry32 } from "./engine/mulberry32";
import { pcg32 } from "./engine/pcg32";
import { sfc32 } from "./engine/sfc32";
import type { Engine } from "./engine/types";
import { xoshiro128pp } from "./engine/xoshiro128pp";
import { xoshiro256pp } from "./engine/xoshiro256pp";
import { Random } from "./random";
import { uuid } from "./uuid/index";

// The reproducibility contract, pinned: a given seed must keep producing the
// same stream. A diff here is either a deliberate STREAM-BREAKING change or a bug.

function take(engine: Engine, n: number): number[] {
  return Array.from({ length: n }, () => engine.nextUint32());
}

describe("engine streams for seed 12345", () => {
  it("xoshiro128++", () => {
    expect(take(xoshiro128pp(12345), 8)).toMatchInlineSnapshot(`
      [
        167929222,
        929272951,
        383870417,
        1796976343,
        4075001364,
        4247825869,
        1971787897,
        3058605027,
      ]
    `);
  });

  it("xoshiro256++", () => {
    expect(take(xoshiro256pp(12345), 8)).toMatchInlineSnapshot(`
      [
        1573169414,
        1987895914,
        992466231,
        2822973708,
        1124965498,
        3768932966,
        3638315368,
        1618356719,
      ]
    `);
  });

  it("pcg32", () => {
    expect(take(pcg32(12345), 8)).toMatchInlineSnapshot(`
      [
        2722782280,
        3641586704,
        2632164002,
        2551542265,
        3983700204,
        3774380778,
        695313926,
        2569817933,
      ]
    `);
  });

  it("sfc32", () => {
    expect(take(sfc32(12345), 8)).toMatchInlineSnapshot(`
      [
        261194151,
        2615745154,
        1287619474,
        465199653,
        4103903655,
        3731705924,
        997594656,
        1181545423,
      ]
    `);
  });

  it("mulberry32", () => {
    expect(take(mulberry32(12345), 8)).toMatchInlineSnapshot(`
      [
        2744357186,
        140855749,
        1188244435,
        3227866602,
        763639442,
        2114833227,
        2653591513,
        3119409398,
      ]
    `);
  });

  it("mt19937", () => {
    expect(take(mt19937(12345), 8)).toMatchInlineSnapshot(`
      [
        376690009,
        4198914362,
        3230200409,
        3819821745,
        186795220,
        1050355269,
        2123063935,
        4255468837,
      ]
    `);
  });

  it("chacha20", () => {
    expect(take(chacha20(12345), 8)).toMatchInlineSnapshot(`
      [
        1274611588,
        525092305,
        214141204,
        747839383,
        3702660124,
        1625100372,
        4172281323,
        2674897198,
      ]
    `);
  });

  it("string seeds", () => {
    expect(take(xoshiro128pp("ransu"), 8)).toMatchInlineSnapshot(`
      [
        4080759794,
        3552010000,
        1881816085,
        1305969721,
        3314850839,
        1353104356,
        3402194301,
        1657506078,
      ]
    `);
  });
});

describe("derived APIs for seed 42", () => {
  it("float", () => {
    const r = new Random(42);
    expect(Array.from({ length: 5 }, () => r.random())).toMatchInlineSnapshot(`
      [
        0.3964157835823383,
        0.3640337591407433,
        0.04583931614392667,
        0.9172085039335006,
        0.033270170327400095,
      ]
    `);
  });

  it("integer", () => {
    const r = new Random(42);
    expect(Array.from({ length: 12 }, () => r.integer(1, 6)))
      .toMatchInlineSnapshot(`
      [
        3,
        5,
        3,
        1,
        1,
        6,
        6,
        4,
        1,
        5,
        4,
        1,
      ]
    `);
  });

  it("shuffle", () => {
    const r = new Random(42);
    expect(r.shuffle([1, 2, 3, 4, 5, 6, 7, 8])).toMatchInlineSnapshot(`
      [
        8,
        2,
        7,
        5,
        1,
        3,
        6,
        4,
      ]
    `);
  });

  it("sample", () => {
    const r = new Random(42);
    expect(
      r.sample(
        Array.from({ length: 20 }, (_, i) => i),
        5
      )
    ).toMatchInlineSnapshot(`
      [
        17,
        6,
        13,
        1,
        0,
      ]
    `);
  });

  it("weightedPick", () => {
    const r = new Random(42);
    expect(
      Array.from({ length: 8 }, () =>
        r.weightedPick(["a", "b", "c"], [1, 2, 7])
      )
    ).toMatchInlineSnapshot(`
      [
        "c",
        "c",
        "a",
        "c",
        "a",
        "c",
        "c",
        "b",
      ]
    `);
  });

  it("string", () => {
    const r = new Random(42);
    expect(r.string(24)).toMatchInlineSnapshot(`"yYwec14FcPKc0qobI8ngAxUr"`);
  });

  it("uuid v4 from a seeded engine", () => {
    expect(uuid.v4({ engine: xoshiro128pp(42) })).toMatchInlineSnapshot(
      `"39817b65-27b9-45d0-9b51-315d530a3211"`
    );
  });

  it("bytes", () => {
    const r = new Random(42);
    expect(Array.from(r.bytes(12))).toMatchInlineSnapshot(`
      [
        57,
        129,
        123,
        101,
        39,
        185,
        213,
        208,
        27,
        81,
        49,
        93,
      ]
    `);
  });

  it("bigint", () => {
    const r = new Random(42);
    expect(Array.from({ length: 4 }, () => r.bigint(0n, 2n ** 96n).toString()))
      .toMatchInlineSnapshot(`
      [
        "62814588239114582048031023670",
        "7263528882793999072931633751",
        "5271868560969043321212981044",
        "68211799101423060778194728100",
      ]
    `);
  });
});
