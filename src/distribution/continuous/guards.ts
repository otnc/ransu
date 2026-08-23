import { assertFinite } from "../../internal/assert";
import { raise } from "../../internal/errors";

/** Distribution parameters are almost always strictly positive. */
export function assertPositive(value: number, name: string): void {
  assertFinite(value, name);
  if (value <= 0)
    raise("INVALID_ARGUMENT", `${name} must be greater than 0, got ${value}.`);
}
