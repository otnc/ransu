import { assertInteger } from "../../internal/assert";
import { raise } from "../../internal/errors";

/** Counts are non-negative integers. */
export function assertCount(value: number, name: string): void {
  assertInteger(value, name);
  if (value < 0)
    raise("INVALID_ARGUMENT", `${name} must be >= 0, got ${value}.`);
}
