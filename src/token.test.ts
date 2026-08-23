import { describe, expect, it } from "vitest";
import { RansuError } from "./internal/errors";
import { otp, password, token } from "./token";

describe("token, otp and password", () => {
  it("token is URL-safe and sized by entropy", () => {
    expect(token()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(token(3)).toHaveLength(4);
  });

  it("otp keeps leading zeros", () => {
    const codes = Array.from({ length: 2_000 }, () => otp(6));
    for (const code of codes) expect(code).toMatch(/^\d{6}$/);
    expect(codes.some((code) => code.startsWith("0"))).toBe(true);
  });

  it("password includes every enabled class", () => {
    for (let i = 0; i < 300; i++) {
      const value = password(12, { symbols: true });
      expect(value).toHaveLength(12);
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/\d/);
      expect(value).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
    }
  });

  it("password can drop ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(password(20, { unambiguous: true })).not.toMatch(/[0O1lI]/);
    }
  });

  it("password rejects impossible requests", () => {
    expect(() => password(2, { symbols: true })).toThrow(RansuError);
    expect(() =>
      password(10, {
        lower: false,
        upper: false,
        digits: false,
        symbols: false,
      })
    ).toThrow(RansuError);
  });
});
