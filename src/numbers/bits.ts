import { assertLength } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";

/**
 * An integer from `n` random bits, like Python's `getrandbits`. Up to 53 bits
 * fit exactly in a `number`; beyond that use {@link bigBits}.
 */
export function bits(src: Source, n: number): number {
  assertLength(n, "n");
  if (n === 0) return 0;
  if (n > 53) {
    raise(
      "RANGE_TOO_LARGE",
      `bits(${n}): a JavaScript number holds at most 53 bits exactly. Use bigBits(${n}) instead.`
    );
  }
  if (n <= 32) return n === 32 ? src.u32() : src.u32() >>> (32 - n);
  const high = src.u32() >>> (64 - n);
  return high * 0x100000000 + src.u32();
}

/** An integer built from `n` random bits, with no width limit. */
export function bigBits(src: Source, n: number): bigint {
  assertLength(n, "n");
  let out = 0n;
  let remaining = n;
  while (remaining >= 32) {
    out = (out << 32n) | BigInt(src.u32());
    remaining -= 32;
  }
  if (remaining > 0) {
    out = (out << BigInt(remaining)) | BigInt(src.u32() >>> (32 - remaining));
  }
  return out;
}
