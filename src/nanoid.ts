import type { EngineLike } from "./engine/types";
import { assertLength } from "./internal/assert";
import { secureSourceFor } from "./internal/source";
import { randomString } from "./strings/random-string";

/**
 * The default nanoid alphabet: exactly 64 URL-safe characters, so six bits
 * each and no modulo bias.
 *
 * @example
 * ```ts
 * NANOID_ALPHABET.length; // 64
 * nanoid(21, { alphabet: NANOID_ALPHABET }); // the default, spelled out
 * ```
 */
export const NANOID_ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export interface NanoidOptions {
  /** Draw from this engine instead of the CSPRNG. For deterministic tests. */
  engine?: EngineLike;
  /** Defaults to {@link NANOID_ALPHABET}. */
  alphabet?: string;
}

/**
 * A nanoid: 21 URL-safe characters by default. Drop-in for the `nanoid` package.
 *
 * @example
 * ```ts
 * nanoid();    // "V1StGXR8_Z5jdHi6B-myT"
 * nanoid(10);  // "IRFa-VaY2b"
 * nanoid(12, { alphabet: "0123456789abcdef" }); // "3f7a1c05e2b8"
 * ```
 */
export function nanoid(size = 21, options: NanoidOptions = {}): string {
  assertLength(size, "size");
  return randomString(
    secureSourceFor(options.engine),
    size,
    options.alphabet ?? NANOID_ALPHABET
  );
}
