import { raise } from "../internal/errors";
import { v1Timestamp, v7Timestamp } from "./clock";
import { parse, version } from "./codec";
import { v6ToV1Bytes } from "./v6";

/** The generation time of a version 1, 6 or 7 UUID, in Unix milliseconds. */
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
