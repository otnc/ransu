import { describe, expect, it } from "vitest";
import { RansuError } from "./internal/errors";
import { ulid } from "./ulid";

describe("ulid", () => {
  it("is 26 Crockford base32 characters", () => {
    expect(ulid()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("sorts chronologically", () => {
    const earlier = ulid({ now: 1_700_000_000_000 });
    const later = ulid({ now: 1_800_000_000_000 });
    expect(earlier < later).toBe(true);
  });

  it("increases monotonically inside one millisecond when asked", () => {
    const now = 1_750_000_000_000;
    const values = Array.from({ length: 500 }, () =>
      ulid({ now, monotonic: true })
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i] > values[i - 1]).toBe(true);
    }
  });

  it("recovers its timestamp", () => {
    const now = 1_700_000_000_123;
    expect(ulid.timestamp(ulid({ now }))).toBe(now);
    expect(() => ulid.timestamp("too-short")).toThrow(RansuError);
  });
});
