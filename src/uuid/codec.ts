import { raise } from "../internal/errors";

/** Byte -> two hex characters, precomputed. */
const HEX: string[] = /* @__PURE__ */ (() => {
  const table = new Array<string>(256);
  for (let i = 0; i < 256; i++) table[i] = (i + 0x100).toString(16).slice(1);
  return table;
})();

/**
 * The canonical form, with the fields RFC 9562 actually constrains.
 *
 * `[1-8]` is the version nibble: RFC 9562 4.1 defines versions 1 through 8 and
 * reserves 9 through 14. `[89ab]` is the variant: 4.2 requires the two high
 * bits of octet 8 to be `10`, which those four hex digits are exactly. Nil
 * (5.9) and Max (5.10) satisfy neither field and are named separately.
 */
const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/**
 * The Nil UUID: all 128 bits zero (RFC 9562 §5.9).
 *
 * A defined placeholder for "no UUID", distinct from any generated one.
 *
 * @example
 * ```ts
 * NIL;           // "00000000-0000-0000-0000-000000000000"
 * validate(NIL); // true
 *
 * // Sorts before every other UUID.
 * compare(NIL, v4()); // -1
 * ```
 */
export const NIL = "00000000-0000-0000-0000-000000000000";
/**
 * The Max UUID: all 128 bits one (RFC 9562 §5.10).
 *
 * The counterpart to {@link NIL}, useful as an inclusive upper bound in a
 * range query.
 *
 * @example
 * ```ts
 * MAX;           // "ffffffff-ffff-ffff-ffff-ffffffffffff"
 * compare(v4(), MAX); // -1
 * ```
 */
export const MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";

/**
 * Format 16 bytes as the canonical dashed, lowercase representation
 * (RFC 9562 §4).
 *
 * @example
 * ```ts
 * stringify(new Uint8Array(16)); // "00000000-0000-0000-0000-000000000000"
 *
 * // Reads 16 bytes from an offset, for slicing out of a larger buffer.
 * stringify(new Uint8Array(32), 16);
 * ```
 */
export function stringify(bytes: Uint8Array, offset = 0): string {
  if (bytes.length - offset < 16) {
    raise("INVALID_ARGUMENT", "stringify(): needs at least 16 bytes.");
  }
  const b = bytes;
  const o = offset;
  return (
    `${HEX[b[o]]}${HEX[b[o + 1]]}${HEX[b[o + 2]]}${HEX[b[o + 3]]}-` +
    `${HEX[b[o + 4]]}${HEX[b[o + 5]]}-` +
    `${HEX[b[o + 6]]}${HEX[b[o + 7]]}-` +
    `${HEX[b[o + 8]]}${HEX[b[o + 9]]}-` +
    `${HEX[b[o + 10]]}${HEX[b[o + 11]]}${HEX[b[o + 12]]}${HEX[b[o + 13]]}${HEX[b[o + 14]]}${HEX[b[o + 15]]}`
  );
}

/**
 * Parse a UUID string into its 16 bytes. Throws when the string is not one.
 *
 * @example
 * ```ts
 * parse("919108f7-52d1-4320-9bac-f847db4148a8");
 * // Uint8Array(16) [ 145, 145, 8, 247, ... ]
 * ```
 */
export function parse(value: string): Uint8Array {
  if (!isWellFormed(value)) {
    raise("INVALID_ARGUMENT", `parse(): "${value}" is not a valid UUID.`);
  }
  const hex = value.replace(/-/g, "");
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Whether a string matches the canonical form.
 *
 * Separate from {@link validate} on purpose: a type predicate narrows an
 * already-`string` argument to `never` in its negative branch, which would make
 * the value unusable in the error message.
 */
function isWellFormed(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Whether `value` is a well-formed UUID string.
 *
 * Checks the fields RFC 9562 constrains, not just the shape: the version
 * nibble must be 1 through 8 (§4.1) and the variant must be `10xx` (§4.2).
 * Nil (§5.9) and Max (§5.10) are accepted as the two named exceptions.
 *
 * @example
 * ```ts
 * validate(v4());       // true
 * validate(NIL);        // true
 * validate(MAX);        // true
 * validate("nope");     // false
 * validate(42);         // false
 *
 * // Right shape, but no such version and the wrong variant bits.
 * validate("11111111-1111-9111-1111-111111111111"); // false
 * ```
 */
export function validate(value: unknown): value is string {
  return typeof value === "string" && isWellFormed(value);
}

/**
 * The version nibble of a UUID string (RFC 9562 §4.1).
 *
 * @example
 * ```ts
 * version(v4()); // 4
 * version(v7()); // 7
 *
 * // The two named UUIDs carry no version; these are their raw nibbles.
 * version(NIL); // 0
 * version(MAX); // 15
 * ```
 */
export function version(value: string): number {
  if (!isWellFormed(value)) {
    raise("INVALID_ARGUMENT", `version(): "${value}" is not a valid UUID.`);
  }
  return Number.parseInt(value.slice(14, 15), 16);
}

/** Stamp the version and the RFC 9562 variant bits into a 16-byte buffer. */
export function brand(bytes: Uint8Array, uuidVersion: number): Uint8Array {
  bytes[6] = (bytes[6] & 0x0f) | (uuidVersion << 4);
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes;
}

/**
 * Byte-order comparison, which is also chronological order for the
 * time-ordered versions 6 and 7.
 *
 * Returns a number suitable for `Array.prototype.sort`.
 *
 * @example
 * ```ts
 * [v7(), v7(), v7()].sort(compare); // oldest first
 *
 * compare(NIL, MAX); // -1
 * compare(NIL, NIL); // 0
 * ```
 */
export function compare(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 16; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}
