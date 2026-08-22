import { v7Bytes } from "./clock";
import { stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/**
 * Version 7 — Unix millisecond timestamp plus randomness. Sorts chronologically
 * as a string, and stays monotonic within a millisecond.
 */
export function v7(options: TimeUuidOptions = {}): string {
  return stringify(
    v7Bytes(resolveSource(options.engine), options.now, new Uint8Array(16))
  );
}
