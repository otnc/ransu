import { raise } from "../internal/errors";
import { v1Timestamp, v7Timestamp } from "./clock";
import { parse, version } from "./codec";
import { v6ToV1Bytes } from "./v6";

/**
 * The creation time of a time-based UUID, in Unix milliseconds.
 *
 * Versions 1, 6 and 7 carry a timestamp; the others do not, and throw.
 *
 * @example
 * ```ts
 * timestamp(v7()); // 1756890764019
 * timestamp(v1()); // the same instant, read from a different layout
 *
 * new Date(timestamp(v7())); // 2026-08-23T09:12:44.019Z
 * ```
 */
export function timestamp(value: string): number {
  const v = version(value);
  const bytes = parse(value);
  if (v === 1) return v1Timestamp(bytes);
  if (v === 6) return v1Timestamp(v6ToV1Bytes(bytes));
  if (v === 7) return v7Timestamp(bytes);
  // v2 overwrites the low timestamp bits with a local ID, so it is excluded.
  return raise(
    "INVALID_ARGUMENT",
    `timestamp(): UUID version ${v} carries no recoverable timestamp. Only v1, v6 and v7 do.`
  );
}
