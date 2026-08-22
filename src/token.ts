import { shuffleInPlace } from "./collections/shuffle";
import type { EngineLike } from "./engines/types";
import { assertLength } from "./internal/assert";
import { raise } from "./internal/errors";
import { secureSourceFor } from "./internal/source";
import { bounded } from "./numbers/integer";
import { alphabets } from "./strings/alphabet";
import { randomString } from "./strings/random-string";

const BASE64URL = alphabets.base64url;

export interface TokenOptions {
  /** Draw from this engine instead of the CSPRNG. For deterministic tests. */
  engine?: EngineLike;
}

/** Encode bytes as unpadded base64url, without Buffer or `btoa`. */
function base64url(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      BASE64URL[(n >>> 18) & 63] +
      BASE64URL[(n >>> 12) & 63] +
      BASE64URL[(n >>> 6) & 63] +
      BASE64URL[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += BASE64URL[(n >>> 18) & 63] + BASE64URL[(n >>> 12) & 63];
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out +=
      BASE64URL[(n >>> 18) & 63] +
      BASE64URL[(n >>> 12) & 63] +
      BASE64URL[(n >>> 6) & 63];
  }
  return out;
}

/** A URL-safe secret token with `bytes` bytes of entropy. CSPRNG-backed. */
export function token(bytes = 32, options: TokenOptions = {}): string {
  assertLength(bytes, "bytes");
  const buffer = new Uint8Array(bytes);
  secureSourceFor(options.engine).fillBytes(buffer);
  return base64url(buffer);
}

/** A numeric one-time code. Leading zeros are preserved. */
export function otp(digits = 6, options: TokenOptions = {}): string {
  assertLength(digits, "digits");
  return randomString(
    secureSourceFor(options.engine),
    digits,
    alphabets.digits
  );
}

export interface PasswordOptions extends TokenOptions {
  lower?: boolean;
  upper?: boolean;
  digits?: boolean;
  symbols?: boolean;
  /** Exclude characters that are easy to misread when transcribed. */
  unambiguous?: boolean;
  /** Guarantee at least one character from every enabled class. */
  requireEach?: boolean;
}

const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
const AMBIGUOUS = new Set("0O1lI|`");

/**
 * A random password. With `requireEach` the result holds at least one character
 * from every enabled class, then gets shuffled so their positions are random.
 */
export function password(length = 16, options: PasswordOptions = {}): string {
  assertLength(length, "length");
  const {
    lower = true,
    upper = true,
    digits = true,
    symbols = false,
    unambiguous = false,
    requireEach = true,
  } = options;

  const classes: string[] = [];
  if (lower) classes.push(alphabets.lower);
  if (upper) classes.push(alphabets.upper);
  if (digits) classes.push(alphabets.digits);
  if (symbols) classes.push(SYMBOLS);

  const filtered = unambiguous
    ? classes.map((set) => [...set].filter((c) => !AMBIGUOUS.has(c)).join(""))
    : classes;

  if (filtered.length === 0) {
    raise(
      "INVALID_ARGUMENT",
      "password(): at least one character class must be enabled."
    );
  }
  if (requireEach && length < filtered.length) {
    raise(
      "INVALID_ARGUMENT",
      `password(): length ${length} is too short to include all ${filtered.length} enabled classes.`
    );
  }

  const src = secureSourceFor(options.engine);
  const pool = filtered.join("");

  if (!requireEach) return randomString(src, length, pool);

  const chars: string[] = filtered.map((set) => set[bounded(src, set.length)]);
  for (let i = chars.length; i < length; i++)
    chars.push(pool[bounded(src, pool.length)]);
  return shuffleInPlace(src, chars).join("");
}
