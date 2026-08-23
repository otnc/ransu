import { nativeRandomUUID } from "../internal/csprng";
import { brand, stringify } from "./codec";
import { randomBytes16, resolveSource, type UuidOptions } from "./options";

/**
 * Version 4 — 122 random bits (RFC 9562 §5.4).
 *
 * The other 6 bits are fixed: 4 for the version and 2 for the variant. This is
 * the default, and what `uuid()` gives you. With no explicit engine it uses
 * `crypto.randomUUID()` where the platform has it, which is several times
 * faster than assembling the bytes here.
 *
 * @example
 * ```ts
 * v4(); // "919108f7-52d1-4320-9bac-f847db4148a8"
 *
 * // An explicit engine opts out of crypto.randomUUID, so this is reproducible.
 * import { xoshiro128pp } from "ransu/engine";
 * v4({ engine: xoshiro128pp(42) }); // "39817b65-27b9-45d0-9b51-315d530a3211"
 * ```
 */
export function v4(options: UuidOptions = {}): string {
  if (options.engine === undefined) {
    const native = nativeRandomUUID();
    if (native) return native();
  }
  return stringify(brand(randomBytes16(resolveSource(options.engine)), 4));
}
