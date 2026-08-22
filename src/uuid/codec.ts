import { raise } from "../internal/errors";

/** Byte -> two hex characters, precomputed. */
const HEX: string[] = /* @__PURE__ */ (() => {
  const table = new Array<string>(256);
  for (let i = 0; i < 256; i++) table[i] = (i + 0x100).toString(16).slice(1);
  return table;
})();

const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/** The all-zero UUID (RFC 9562 §5.9). */
export const NIL = "00000000-0000-0000-0000-000000000000";
/** The all-one UUID (RFC 9562 §5.10). */
export const MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";

/** Format 16 bytes as the canonical dashed, lowercase representation. */
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

/** Parse a UUID string into its 16 bytes. */
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

/** Whether `value` is a well-formed UUID string. */
export function validate(value: unknown): value is string {
  return typeof value === "string" && isWellFormed(value);
}

/** The version nibble of a UUID string. */
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
 */
export function compare(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 16; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}
