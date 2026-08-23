import { raise } from "../internal/errors";
import { brand, stringify } from "./codec";
import { randomBytes16, resolveSource, type UuidOptions } from "./options";

/**
 * Version 8 — custom (RFC 9562 §5.8).
 *
 * The RFC leaves all 122 free bits to you and fixes only the version and
 * variant. Pass 16 bytes and those 6 bits are overwritten in place; the other
 * 122 are yours. Omit the bytes for a random v8, which is a v4 wearing a
 * different version nibble.
 *
 * @example
 * ```ts
 * v8(); // random, but tagged version 8
 *
 * // Your own layout: here a big-endian counter in the leading bytes.
 * const data = new Uint8Array(16);
 * new DataView(data.buffer).setBigUint64(0, 1756890764019n);
 * v8(data);
 * ```
 */
export function v8(data?: Uint8Array, options: UuidOptions = {}): string {
  if (data === undefined) {
    return stringify(brand(randomBytes16(resolveSource(options.engine)), 8));
  }
  if (data.length !== 16) {
    raise(
      "INVALID_ARGUMENT",
      `v8(): data must be exactly 16 bytes, got ${data.length}.`
    );
  }
  return stringify(brand(Uint8Array.from(data), 8));
}
