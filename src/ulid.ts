import type { EngineLike } from "./engine/types";
import { raise } from "./internal/errors";
import { secureSourceFor } from "./internal/source";

// ULID: 48 bits of millisecond timestamp plus 80 random bits, in Crockford
// base32. Sorts chronologically as text, like UUID v7 but shorter.

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;
/** ULID timestamps are 48 bits: 2^48 - 1 milliseconds. */
const MAX_TIME = 281474976710655;

export interface UlidOptions {
  /** Draw from this engine instead of the CSPRNG. For deterministic tests. */
  engine?: EngineLike;
  /** Fix the timestamp, in milliseconds since the Unix epoch. For tests. */
  now?: number;
  /** Keep IDs increasing within one millisecond by incrementing the random field. */
  monotonic?: boolean;
}

function encodeTime(now: number): string {
  if (!Number.isInteger(now) || now < 0 || now > MAX_TIME) {
    raise(
      "INVALID_ARGUMENT",
      `ulid(): the timestamp ${now} does not fit in 48 bits.`
    );
  }
  let out = "";
  let value = now;
  for (let i = 0; i < TIME_LENGTH; i++) {
    out = CROCKFORD[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out;
}

let lastTime = -1;
let lastRandom: number[] = [];

function drawRandom(engine: EngineLike | undefined): number[] {
  const src = secureSourceFor(engine);
  const out = new Array<number>(RANDOM_LENGTH);
  for (let i = 0; i < RANDOM_LENGTH; i++) out[i] = src.u32() >>> 27;
  return out;
}

/** Increment a base32 digit array, carrying from the least significant end. */
function increment(digits: number[]): number[] {
  const out = digits.slice();
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] < 31) {
      out[i] += 1;
      return out;
    }
    out[i] = 0;
  }
  raise(
    "INVALID_ARGUMENT",
    "ulid(): the monotonic random field overflowed within one millisecond."
  );
}

function generate(options: UlidOptions = {}): string {
  const now = options.now ?? Date.now();

  let digits: number[];
  if (
    options.monotonic &&
    now === lastTime &&
    lastRandom.length === RANDOM_LENGTH
  ) {
    digits = increment(lastRandom);
  } else {
    digits = drawRandom(options.engine);
  }

  lastTime = now;
  lastRandom = digits;

  let random = "";
  for (let i = 0; i < RANDOM_LENGTH; i++) random += CROCKFORD[digits[i]];
  return encodeTime(now) + random;
}

/** The generation time of a ULID, in Unix milliseconds. */
function timestamp(value: string): number {
  if (value.length !== TIME_LENGTH + RANDOM_LENGTH) {
    raise(
      "INVALID_ARGUMENT",
      `ulid.timestamp(): "${value}" is not a 26-character ULID.`
    );
  }
  let out = 0;
  for (let i = 0; i < TIME_LENGTH; i++) {
    const index = CROCKFORD.indexOf(value[i].toUpperCase());
    if (index < 0) {
      raise(
        "INVALID_ARGUMENT",
        `ulid.timestamp(): "${value}" contains a non-base32 character.`
      );
    }
    out = out * 32 + index;
  }
  return out;
}

/**
 * `ulid()` makes one; `ulid.timestamp()` reads the time back out.
 *
 * Lexicographic order matches time order, which is what makes a ULID sort
 * correctly as a plain string in a database index.
 *
 * @example
 * ```ts
 * const id = ulid(); // "01K39XQZP4W8YHN2VBTKD7A3RM"
 * ulid.timestamp(id); // 1756890764019, the millisecond it was made
 *
 * // Two made in the same millisecond still sort in creation order.
 * ulid() < ulid(); // true
 * ```
 */
export interface UlidApi {
  (options?: UlidOptions): string;
  timestamp: typeof timestamp;
}

/**
 * A ULID: 26 characters of Crockford base32, time-ordered.
 *
 * 48 bits of millisecond timestamp then 80 bits of randomness, encoded so
 * that lexicographic order is time order. Shorter than a UUID and
 * case-insensitive, with no dashes to strip.
 *
 * @example
 * ```ts
 * const id = ulid(); // "01K39XQZP4W8YHN2VBTKD7A3RM"
 * ulid.timestamp(id); // 1756890764019
 *
 * // Sorts in creation order as a plain string.
 * ulid() < ulid(); // true
 * ```
 */
export const ulid: UlidApi = /* @__PURE__ */ Object.assign(generate, {
  timestamp,
});
