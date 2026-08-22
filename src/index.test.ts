import { describe, expect, it } from "vitest";
import { pcg32 } from "./engines/pcg32";
import ransu, {
  alphabets,
  engine,
  integer,
  pick,
  Random,
  RansuError,
  seed,
  shuffle,
  uuid,
} from "./index";
import * as secure from "./secure";

describe("the default export", () => {
  it("is callable and returns a double in [0, 1)", () => {
    const value = ransu();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it("exposes the stem-named surface", () => {
    expect([1, 2, 3, 4, 5, 6]).toContain(ransu.integer(1, 6));
    expect(["a", "b"]).toContain(ransu.pick(["a", "b"]));
    expect(ransu.shuffle([1, 2, 3])).toHaveLength(3);
    expect(ransu.string(10)).toHaveLength(10);
    expect(uuid.validate(ransu.uuid.v7())).toBe(true);
    expect(ransu.nanoid()).toHaveLength(21);
  });

  it("is the same function object as the named export", () => {
    // One name, one function: the namespace does not wrap anything.
    expect(ransu.integer).toBe(integer);
    expect(ransu.pick).toBe(pick);
    expect(ransu.shuffle).toBe(shuffle);
    expect(ransu.alphabets).toBe(alphabets);
    expect(ransu.default).toBe(ransu);
  });

  it("keeps namespace names in step with Random methods", () => {
    const instance = new Random(1);
    const stems = [
      "random",
      "float",
      "float32",
      "integer",
      "below",
      "range",
      "bigint",
      "bool",
      "chance",
      "oneIn",
      "sign",
      "bits",
      "bigBits",
      "bytes",
      "fillBytes",
      "floats",
      "integers",
      "stream",
      "pick",
      "tryPick",
      "pickIndex",
      "pickKey",
      "pickEntry",
      "choices",
      "sample",
      "reservoir",
      "combination",
      "takeOut",
      "weightedSample",
      "shuffle",
      "shuffleInPlace",
      "partialShuffle",
      "permutation",
      "shuffleString",
      "weighted",
      "weightedTable",
    ] as const;

    for (const name of stems) {
      expect(typeof (ransu as unknown as Record<string, unknown>)[name]).toBe(
        "function"
      );
      expect(
        typeof (instance as unknown as Record<string, unknown>)[name]
      ).toBe("function");
    }
  });

  it("survives destructuring", () => {
    const { integer, pick: choose } = ransu;
    expect([1, 2, 3]).toContain(integer(1, 3));
    expect(["x"]).toContain(choose(["x"]));
  });
});

describe("seeding the global", () => {
  it("makes the top-level functions deterministic", () => {
    seed(2024);
    const first = [integer(1, 1000), integer(1, 1000), integer(1, 1000)];
    seed(2024);
    expect([integer(1, 1000), integer(1, 1000), integer(1, 1000)]).toEqual(
      first
    );
  });

  it("reaches the namespace too, since both share one instance", () => {
    seed("shared");
    const viaNamespace = ransu.integer(1, 1_000_000);
    seed("shared");
    expect(integer(1, 1_000_000)).toBe(viaNamespace);
  });

  it("swaps the unseedable default engine for a deterministic one", () => {
    seed(1);
    expect(engine().seedable).toBe(true);
    expect(engine().algorithm).toBe("xoshiro128++");
  });
});

describe("Random", () => {
  it("accepts a seed, an engine or a plain function", () => {
    expect(new Random(1).integer(1, 6)).toBe(new Random(1).integer(1, 6));
    expect(new Random(pcg32(1)).engine.algorithm).toBe("pcg32");
    expect(new Random(() => 0.5).random()).toBe(0.5);
  });

  it("takes an engine factory in the options position", () => {
    const r = new Random(7, { engine: pcg32 });
    expect(r.engine.algorithm).toBe("pcg32");
    expect(r.integer(1, 100)).toBe(
      new Random(7, { engine: pcg32 }).integer(1, 100)
    );
  });

  it("rejects an engine in both positions at once", () => {
    expect(() => new Random(pcg32(1), { engine: pcg32 })).toThrow(RansuError);
  });

  it("is unseeded but well separated by default", () => {
    const a = new Random().integer(0, 2 ** 40);
    const b = new Random().integer(0, 2 ** 40);
    expect(a).not.toBe(b);
  });

  it("clones, splits and round-trips state", () => {
    const r = new Random(5);
    r.integer(1, 100);

    const copy = r.clone();
    expect(copy.integer(1, 1_000_000)).toBe(r.integer(1, 1_000_000));

    const state = r.getState();
    const expected = r.integer(1, 1_000_000);
    expect(new Random(0).setState(state).integer(1, 1_000_000)).toBe(expected);

    const [x, y] = new Random(5).split(2);
    expect(x.integer(1, 2 ** 40)).not.toBe(y.integer(1, 2 ** 40));
  });

  it("re-seeds in place", () => {
    const r = new Random(1);
    r.integer(1, 6);
    r.seed(9);
    expect(r.integer(1, 1_000_000)).toBe(new Random(9).integer(1, 1_000_000));
  });

  it("yields an endless stream", () => {
    const r = new Random(3);
    const values: number[] = [];
    for (const value of r.stream()) {
      values.push(value);
      if (values.length === 5) break;
    }
    expect(values).toHaveLength(5);
  });

  it("builds a reusable weighted table", () => {
    const table = new Random(4).weightedTable(["a", "b"], [1, 0]);
    for (let i = 0; i < 100; i++) expect(table.pick()).toBe("a");
  });
});

describe("ransu/secure", () => {
  it("mirrors the core API", () => {
    expect([1, 2, 3, 4, 5, 6]).toContain(secure.integer(1, 6));
    expect(secure.string(16)).toHaveLength(16);
    expect(secure.shuffle([1, 2, 3])).toHaveLength(3);
    expect(uuid.validate(secure.uuid())).toBe(true);
  });

  it("refuses to be seeded", () => {
    expect(() => secure.seed()).toThrow(RansuError);
    expect(() => secure.seed()).toThrow(/cannot be seeded/);
  });

  it("never leaks the global stream into the secure one", () => {
    seed(123);
    const before = integer(1, 1_000_000);
    secure.integer(1, 6);
    seed(123);
    expect(integer(1, 1_000_000)).toBe(before);
  });
});

describe("errors", () => {
  it("carry a machine-readable code and an actionable message", () => {
    try {
      pick([]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RansuError);
      expect((error as RansuError).code).toBe("EMPTY_COLLECTION");
      expect((error as RansuError).message).toMatch(/tryPick/);
    }
  });
});

describe("no API returns a Promise", () => {
  it("holds across the whole namespace", () => {
    const calls: (() => unknown)[] = [
      () => ransu(),
      () => ransu.random(),
      () => ransu.integer(1, 6),
      () => ransu.float(),
      () => ransu.bool(),
      () => ransu.bytes(8),
      () => ransu.bits(8),
      () => ransu.bigint(0n, 10n),
      () => ransu.pick([1]),
      () => ransu.sample([1, 2, 3], 2),
      () => ransu.shuffle([1, 2]),
      () => ransu.weighted(["a"], [1]),
      () => ransu.string(4),
      () => ransu.hex(4),
      () => ransu.uuid(),
      () => ransu.uuid.v1(),
      () => ransu.uuid.v3("a", uuid.NAMESPACE.DNS),
      () => ransu.uuid.v5("a", uuid.NAMESPACE.DNS),
      () => ransu.uuid.v7(),
      () => ransu.nanoid(),
      () => ransu.ulid(),
      () => ransu.token(),
      () => ransu.otp(),
      () => ransu.password(),
    ];

    for (const call of calls) {
      const result = call() as { then?: unknown };
      expect(result).not.toBeInstanceOf(Promise);
      expect(
        typeof result === "object" && result !== null && "then" in result
      ).toBe(false);
    }
  });
});
