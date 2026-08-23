import { v1Bytes } from "./clock";
import { stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/**
 * Version 1 — a 60-bit timestamp, a clock sequence and a node ID (RFC 9562 §5.1).
 *
 * The timestamp counts 100-nanosecond intervals since 1582-10-15, the date the
 * Gregorian calendar was adopted. JavaScript has no access to a MAC address, so
 * the node ID is random with the multicast bit set, which §6.10 requires so it
 * cannot be mistaken for a real hardware address.
 *
 * Prefer {@link v7} for new work: it sorts as a string, where v1 does not.
 *
 * @example
 * ```ts
 * v1(); // "c232ab00-9414-11ec-b3c8-9f6bdeced846"
 *
 * // Reproducible when you supply both the engine and the clock.
 * import { xoshiro128pp } from "ransu/engine";
 * v1({ engine: xoshiro128pp(42), now: 1645557742000 });
 * ```
 */
export function v1(options: TimeUuidOptions = {}): string {
  return stringify(
    v1Bytes(resolveSource(options.engine), options.now, new Uint8Array(16))
  );
}
