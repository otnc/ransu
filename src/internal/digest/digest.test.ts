import { describe, expect, it } from "vitest";
import { md5 } from "./md5";
import { sha1 } from "./sha1";

const encoder = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("md5", () => {
  // RFC 1321 test suite.
  it.each([
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      "d174ab98d277d9f5a5611c2c9f419d9f",
    ],
    [
      "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      "57edf4a22be3c955ac49da2e2107b67a",
    ],
  ])("hashes %j", (input, expected) => {
    expect(hex(md5(encoder.encode(input)))).toBe(expected);
  });

  it("handles inputs that straddle a block boundary", () => {
    for (let n = 50; n < 70; n++) {
      expect(md5(new Uint8Array(n))).toHaveLength(16);
    }
  });
});

describe("sha1", () => {
  // FIPS 180-1 test vectors.
  it.each([
    ["", "da39a3ee5e6b4b0d3255bfef95601890afd80709"],
    ["abc", "a9993e364706816aba3e25717850c26c9cd0d89d"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "84983e441c3bd26ebaae4aa1f95129e5e54670f1",
    ],
  ])("hashes %j", (input, expected) => {
    expect(hex(sha1(encoder.encode(input)))).toBe(expected);
  });

  it('hashes a million "a"s', () => {
    const input = new Uint8Array(1_000_000).fill(0x61);
    expect(hex(sha1(input))).toBe("34aa973cd4c4daa4f61eeb2bdbad27316534016f");
  });
});
