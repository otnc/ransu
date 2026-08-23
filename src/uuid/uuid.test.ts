import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engine/xoshiro128pp";
import { RansuError } from "../internal/errors";
import { uuid } from "./index";

const CANONICAL =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Every version and the variant nibble, checked straight off the string. */
function assertShape(value: string, expectedVersion: number): void {
  expect(value).toMatch(CANONICAL);
  expect(uuid.version(value)).toBe(expectedVersion);
  // RFC 9562 variant: the 17th hex digit is one of 8, 9, a, b.
  expect("89ab").toContain(value[19]);
}

describe("uuid", () => {
  it("defaults to v4 when called directly", () => {
    assertShape(uuid(), 4);
  });

  it.each([
    ["v1", () => uuid.v1(), 1],
    ["v4", () => uuid.v4(), 4],
    ["v6", () => uuid.v6(), 6],
    ["v7", () => uuid.v7(), 7],
    ["v8", () => uuid.v8(), 8],
  ])("%s has the right version and variant bits", (_name, make, expected) => {
    for (let i = 0; i < 50; i++) assertShape(make(), expected);
  });

  it("v2 stamps the local domain and id", () => {
    const value = uuid.v2(uuid.DCE_DOMAIN.PERSON, 1000);
    assertShape(value, 2);
    expect(value.slice(0, 8)).toBe((1000).toString(16).padStart(8, "0"));
    expect(value.slice(21, 23)).toBe("00");
  });

  it("v3 matches the published Python vector", () => {
    expect(uuid.v3("python.org", uuid.NAMESPACE.DNS)).toBe(
      "6fa459ea-ee8a-3ca4-894e-db77e160355e"
    );
  });

  it("v5 matches the published Python vector", () => {
    expect(uuid.v5("python.org", uuid.NAMESPACE.DNS)).toBe(
      "886313e1-3b8a-5372-9b90-0c9aee199e5d"
    );
  });

  it("name-based versions are deterministic and namespace-sensitive", () => {
    expect(uuid.v5("a", uuid.NAMESPACE.DNS)).toBe(
      uuid.v5("a", uuid.NAMESPACE.DNS)
    );
    expect(uuid.v5("a", uuid.NAMESPACE.DNS)).not.toBe(
      uuid.v5("a", uuid.NAMESPACE.URL)
    );
    expect(uuid.v5("a", uuid.NAMESPACE.DNS)).not.toBe(
      uuid.v5("b", uuid.NAMESPACE.DNS)
    );
  });

  it("rejects an invalid namespace", () => {
    expect(() => uuid.v5("a", "not-a-uuid")).toThrow(RansuError);
  });

  it("v4 is reproducible when given an engine", () => {
    const a = uuid.v4({ engine: xoshiro128pp(1) });
    const b = uuid.v4({ engine: xoshiro128pp(1) });
    expect(a).toBe(b);
    assertShape(a, 4);
    expect(uuid.v4({ engine: xoshiro128pp(2) })).not.toBe(a);
  });

  it("v4 produces distinct values", () => {
    const seen = new Set(Array.from({ length: 5_000 }, () => uuid.v4()));
    expect(seen.size).toBe(5_000);
  });

  it("v7 sorts chronologically as a string", () => {
    const earlier = uuid.v7({ now: 1_700_000_000_000 });
    const later = uuid.v7({ now: 1_800_000_000_000 });
    expect(earlier < later).toBe(true);
    expect(uuid.compare(earlier, later)).toBe(-1);
  });

  it("v7 stays strictly increasing inside one millisecond", () => {
    const values = Array.from({ length: 3_000 }, () =>
      uuid.v7({ now: 1_750_000_000_000 })
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i] > values[i - 1]).toBe(true);
    }
    expect(new Set(values).size).toBe(values.length);
  });

  it("v1 stays unique inside one millisecond", () => {
    const values = Array.from({ length: 2_000 }, () =>
      uuid.v1({ now: 1_750_000_000_000 })
    );
    expect(new Set(values).size).toBe(values.length);
  });

  it("converts between v1 and v6 losslessly", () => {
    const one = uuid.v1({ now: 1_700_000_000_123 });
    const six = uuid.v1ToV6(one);
    assertShape(six, 6);
    expect(uuid.v6ToV1(six)).toBe(one);
  });

  it("v6 sorts chronologically where v1 does not", () => {
    const a = uuid.v6({ now: 1_700_000_000_000 });
    const b = uuid.v6({ now: 1_800_000_000_000 });
    expect(a < b).toBe(true);
  });

  it("v8 keeps the supplied payload outside the version and variant bits", () => {
    const data = new Uint8Array(16).fill(0xaa);
    const value = uuid.v8(data);
    assertShape(value, 8);
    expect(value.slice(0, 8)).toBe("aaaaaaaa");
    expect(value.endsWith("aaaaaaaaaaaa")).toBe(true);
  });

  it("v8 rejects the wrong payload size", () => {
    expect(() => uuid.v8(new Uint8Array(8))).toThrow(RansuError);
  });

  it("recovers timestamps from v1, v6 and v7", () => {
    const now = 1_700_000_000_123;
    expect(uuid.timestamp(uuid.v7({ now }))).toBe(now);
    expect(uuid.timestamp(uuid.v1({ now }))).toBe(now);
    expect(uuid.timestamp(uuid.v6({ now }))).toBe(now);
    expect(() => uuid.timestamp(uuid.v4())).toThrow(RansuError);
  });

  it("round-trips through parse and stringify", () => {
    const value = uuid.v4();
    expect(uuid.stringify(uuid.parse(value))).toBe(value);
    expect(uuid.parse(value)).toHaveLength(16);
  });

  it("validates", () => {
    expect(uuid.validate(uuid.v4())).toBe(true);
    expect(uuid.validate(uuid.NIL)).toBe(true);
    expect(uuid.validate(uuid.MAX)).toBe(true);
    expect(uuid.validate("nope")).toBe(false);
    expect(uuid.validate(42)).toBe(false);
    expect(() => uuid.parse("nope")).toThrow(RansuError);
  });

  it("compares by byte order", () => {
    expect(uuid.compare(uuid.NIL, uuid.MAX)).toBe(-1);
    expect(uuid.compare(uuid.MAX, uuid.NIL)).toBe(1);
    expect(uuid.compare(uuid.NIL, uuid.NIL)).toBe(0);
  });
});
