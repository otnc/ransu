import { raise } from "../internal/errors";
import { brand, stringify } from "./codec";
import { randomBytes16, resolveSource, type UuidOptions } from "./options";

/** Version 8 — custom. Pass 16 bytes for your own layout, or omit for random. */
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
