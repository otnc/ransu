import { nativeRandomUUID } from "../internal/csprng";
import { brand, stringify } from "./codec";
import { randomBytes16, resolveSource, type UuidOptions } from "./options";

/**
 * Version 4 — 122 random bits. The default. With no explicit engine this uses
 * `crypto.randomUUID()` where available, which is several times faster.
 */
export function v4(options: UuidOptions = {}): string {
  if (options.engine === undefined) {
    const native = nativeRandomUUID();
    if (native) return native();
  }
  return stringify(brand(randomBytes16(resolveSource(options.engine)), 4));
}
