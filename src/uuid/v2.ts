import { raise } from "../internal/errors";
import { v1Bytes } from "./clock";
import { brand, stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/**
 * Version 2 — DCE Security. Defined by DCE 1.1, not RFC 9562. Included for
 * completeness but not recommended: it trades 32 bits of timestamp for a local
 * ID, leaving far fewer distinct values per node than v1.
 */
export function v2(
  localDomain: number,
  localId: number,
  options: TimeUuidOptions = {}
): string {
  if (!Number.isInteger(localDomain) || localDomain < 0 || localDomain > 0xff) {
    raise(
      "INVALID_ARGUMENT",
      "v2(): localDomain must be an integer within [0, 255]."
    );
  }
  if (!Number.isInteger(localId) || localId < 0 || localId > 0xffffffff) {
    raise(
      "INVALID_ARGUMENT",
      "v2(): localId must be an integer within [0, 2^32)."
    );
  }

  const bytes = v1Bytes(
    resolveSource(options.engine),
    options.now,
    new Uint8Array(16)
  );
  bytes[0] = (localId >>> 24) & 0xff;
  bytes[1] = (localId >>> 16) & 0xff;
  bytes[2] = (localId >>> 8) & 0xff;
  bytes[3] = localId & 0xff;
  bytes[9] = localDomain;
  return stringify(brand(bytes, 2));
}

/** Domain constants for {@link v2}. */
export const DCE_DOMAIN = { PERSON: 0, GROUP: 1, ORG: 2 } as const;
