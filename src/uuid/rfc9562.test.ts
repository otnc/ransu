import { describe, expect, it } from "vitest";
import { xoshiro128pp } from "../engine/xoshiro128pp";
import { uuid } from "./index";

// Conformance to RFC 9562, checked against the RFC's own text rather than
// against what this implementation happens to produce. Where the RFC prints a
// worked example, that string is the expectation; where it only states a rule,
// the rule is recomputed here from the definition.

const GREGORIAN_OFFSET = 12219292800000n;

function hexOf(value: string): string {
  return value.replace(/-/g, "");
}

function fieldsOf(value: string) {
  const hex = hexOf(value);
  return {
    version: Number.parseInt(hex.slice(12, 13), 16),
    variant: Number.parseInt(hex.slice(16, 17), 16) >>> 2,
    bytes: uuid.parse(value),
  };
}

describe("RFC 9562 A.1 test vectors", () => {
  // The RFC prints these UUIDs beside the inputs that produce them, so they
  // pin the byte layout of every field, not just the shape.

  it("v3 matches the DNS namespace example", () => {
    expect(uuid.v3("www.example.com", uuid.NAMESPACE.DNS)).toBe(
      "5df41881-3aed-3515-88a7-2f4a814cf09e"
    );
  });

  it("v5 matches the DNS namespace example", () => {
    expect(uuid.v5("www.example.com", uuid.NAMESPACE.DNS)).toBe(
      "2ed6657d-e927-568b-95e1-2665a8aea6a2"
    );
  });

  it("the namespace UUIDs are the ones in Appendix A", () => {
    expect(uuid.NAMESPACE).toEqual({
      DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
      X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
    });
  });

  it("Nil is 5.9 and Max is 5.10", () => {
    expect(uuid.NIL).toBe("00000000-0000-0000-0000-000000000000");
    expect(uuid.MAX).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
  });
});

describe("RFC 9562 4.1 version and 4.2 variant", () => {
  const made: [string, number][] = [
    [uuid.v1(), 1],
    [uuid.v2(0, 1000), 2],
    [uuid.v3("x", uuid.NAMESPACE.DNS), 3],
    [uuid.v4(), 4],
    [uuid.v5("x", uuid.NAMESPACE.DNS), 5],
    [uuid.v6(), 6],
    [uuid.v7(), 7],
    [uuid.v8(), 8],
  ];

  it("stamps the version nibble of every version", () => {
    for (const [value, expected] of made) {
      expect(fieldsOf(value).version).toBe(expected);
      expect(uuid.version(value)).toBe(expected);
    }
  });

  it("stamps variant 10xx on every version", () => {
    // 4.2 fixes the two most significant bits of octet 8 to binary 10.
    for (const [value] of made) expect(fieldsOf(value).variant).toBe(0b10);
  });

  it("rejects a version the RFC does not define", () => {
    // 9 through 14 are reserved for the future, so nothing may claim them.
    expect(uuid.validate("11111111-1111-9111-8111-111111111111")).toBe(false);
    expect(uuid.validate("11111111-1111-0111-8111-111111111111")).toBe(false);
  });

  it("rejects a variant outside 10xx", () => {
    // 0xx is the NCS legacy variant and 11x is Microsoft's; neither is ours.
    expect(uuid.validate("11111111-1111-4111-1111-111111111111")).toBe(false);
    expect(uuid.validate("11111111-1111-4111-c111-111111111111")).toBe(false);
    for (const variant of ["8", "9", "a", "b"]) {
      expect(
        uuid.validate(`11111111-1111-4111-${variant}111-111111111111`)
      ).toBe(true);
    }
  });
});

describe("RFC 9562 5.1 version 1", () => {
  /** The 60-bit timestamp of 5.1, computed exactly rather than in floats. */
  function expectedFields(unixMillis: number) {
    const t = (BigInt(unixMillis) + GREGORIAN_OFFSET) * 10000n;
    return {
      timeLow: Number(t & 0xffffffffn),
      timeMid: Number((t >> 32n) & 0xffffn),
      timeHigh: Number((t >> 48n) & 0x0fffn),
    };
  }

  it("packs the timestamp as 100-nanosecond intervals since 1582-10-15", () => {
    for (const millis of [
      0,
      1,
      Date.UTC(2000, 0, 1),
      Date.UTC(2026, 7, 23),
      Date.UTC(2100, 0, 1),
      Date.UTC(5236, 2, 15),
    ]) {
      const hex = hexOf(uuid.v1({ now: millis }));
      const want = expectedFields(millis);
      expect(Number.parseInt(hex.slice(0, 8), 16)).toBe(want.timeLow);
      expect(Number.parseInt(hex.slice(8, 12), 16)).toBe(want.timeMid);
      expect(Number.parseInt(hex.slice(12, 16), 16) & 0x0fff).toBe(
        want.timeHigh
      );
    }
  });

  it("sets the multicast bit on the random node ID", () => {
    // 6.10: a node ID that is not a real MAC must set that bit, so it can
    // never collide with hardware.
    for (let i = 0; i < 20; i++) {
      const bytes = uuid.parse(uuid.v1({ engine: xoshiro128pp(i) }));
      expect(bytes[10] & 0x01).toBe(0x01);
    }
  });

  it("keeps the clock sequence inside its 14 bits", () => {
    const bytes = uuid.parse(uuid.v1());
    expect(bytes[8] & 0xc0).toBe(0x80);
  });
});

describe("RFC 9562 5.6 version 6", () => {
  it("is version 1 with the timestamp reordered, and reverses cleanly", () => {
    const one = uuid.v1({ now: Date.UTC(2022, 1, 22, 19, 22, 22) });
    const six = uuid.v1ToV6(one);
    expect(uuid.version(six)).toBe(6);
    expect(uuid.v6ToV1(six)).toBe(one);
  });

  it("orders as a string, which version 1 does not", () => {
    const millis = Date.UTC(2026, 0, 1);
    const sixes = [0, 1_000, 2_000, 3_000].map((offset) =>
      uuid.v6({ now: millis + offset })
    );
    expect([...sixes].sort()).toEqual(sixes);
  });

  it("carries the same timestamp as the version 1 it came from", () => {
    const millis = Date.UTC(2026, 7, 23);
    const one = uuid.v1({ now: millis });
    expect(uuid.timestamp(uuid.v1ToV6(one))).toBe(uuid.timestamp(one));
  });
});

describe("RFC 9562 5.7 version 7", () => {
  it("puts the Unix millisecond timestamp in the first 48 bits", () => {
    for (const millis of [0, 1, Date.UTC(2026, 7, 23), 2 ** 48 - 1]) {
      const bytes = uuid.parse(uuid.v7({ now: millis }));
      const packed =
        bytes[0] * 0x10000000000 +
        bytes[1] * 0x100000000 +
        bytes[2] * 0x1000000 +
        bytes[3] * 0x10000 +
        bytes[4] * 0x100 +
        bytes[5];
      expect(packed).toBe(millis);
      expect(uuid.timestamp(uuid.v7({ now: millis }))).toBe(millis);
    }
  });

  it("stays monotonic inside one millisecond", () => {
    // 6.2 method 3: rand_a holds a counter, so same-millisecond IDs still
    // increase. Without it they would be unordered noise.
    const now = Date.now();
    const batch = Array.from({ length: 500 }, () => uuid.v7({ now }));
    expect([...batch].sort()).toEqual(batch);
    expect(new Set(batch).size).toBe(batch.length);
  });

  it("orders across milliseconds too", () => {
    const start = Date.UTC(2026, 0, 1);
    const ids = [0, 1, 2, 3, 4].map((offset) =>
      uuid.v7({ now: start + offset })
    );
    expect([...ids].sort()).toEqual(ids);
  });
});

describe("RFC 9562 5.8 version 8", () => {
  it("keeps all 122 custom bits and overwrites only version and variant", () => {
    const data = new Uint8Array(16).fill(0xff);
    const bytes = uuid.parse(uuid.v8(data));

    // Everything except the version nibble and the two variant bits survives.
    for (const index of [0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15]) {
      expect(bytes[index]).toBe(0xff);
    }
    expect(bytes[6]).toBe(0x8f); // version 8, low nibble untouched
    expect(bytes[8]).toBe(0xbf); // variant 10, low six bits untouched
  });

  it("is reproducible from the same bytes", () => {
    const data = new Uint8Array(16);
    new DataView(data.buffer).setBigUint64(0, 1756890764019n);
    expect(uuid.v8(data)).toBe(uuid.v8(data));
  });
});

describe("RFC 9562 4 string representation", () => {
  it("round-trips through parse and stringify", () => {
    for (const value of [uuid.v1(), uuid.v4(), uuid.v7(), uuid.NIL, uuid.MAX]) {
      expect(uuid.stringify(uuid.parse(value))).toBe(value);
    }
  });

  it("is lowercase on output and case-insensitive on input", () => {
    const value = uuid.v4();
    expect(value).toBe(value.toLowerCase());
    expect(uuid.validate(value.toUpperCase())).toBe(true);
    expect(uuid.parse(value.toUpperCase())).toEqual(uuid.parse(value));
  });
});
