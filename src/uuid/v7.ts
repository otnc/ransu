import { v7Bytes } from "./clock";
import { stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/**
 * Version 7 — a Unix millisecond timestamp plus randomness (RFC 9562 §5.7).
 *
 * 48 bits of `unix_ts_ms`, then 12 bits of `rand_a` and 62 of `rand_b`. Two
 * made in the same millisecond stay ordered, because `rand_a` holds the
 * monotonic counter of §6.2 method 3 rather than plain randomness.
 *
 * This is the version to reach for when IDs become database keys: it sorts
 * chronologically, so inserts land at the end of the index instead of
 * scattering across it.
 *
 * @example
 * ```ts
 * v7(); // "017f22e2-79b0-7cc3-98c4-dc0c0c07398f"
 *
 * // Ordered even inside one millisecond.
 * const now = Date.now();
 * v7({ now }) < v7({ now }); // true
 *
 * // The time is readable again.
 * timestamp(v7()); // 1756890764019
 * ```
 */
export function v7(options: TimeUuidOptions = {}): string {
  return stringify(
    v7Bytes(resolveSource(options.engine), options.now, new Uint8Array(16))
  );
}
