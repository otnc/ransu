import { raise } from "../internal/errors";
import { v1Bytes } from "./clock";
import { brand, stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/**
 * Version 2 — DCE Security, defined by DCE 1.1 rather than RFC 9562.
 *
 * RFC 9562 §4.1 lists version 2 as reserved and does not specify it. It
 * replaces the low 32 bits of the v1 timestamp with a local ID and the low
 * byte of the clock sequence with a domain, which leaves roughly one distinct
 * value per 7 minutes per node. Included for completeness; do not choose it
 * for new work.
 *
 * @example
 * ```ts
 * v2(DCE_DOMAIN.PERSON, 1000); // "000003e8-9414-21ec-8400-9f6bdeced846"
 * v2(DCE_DOMAIN.GROUP, 20);
 * v2(DCE_DOMAIN.ORG, 42);
 * ```
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

/**
 * The local domains {@link v2} accepts, from DCE 1.1.
 *
 * @example
 * ```ts
 * v2(DCE_DOMAIN.PERSON, 1000); // a POSIX UID
 * v2(DCE_DOMAIN.GROUP, 20);    // a POSIX GID
 * v2(DCE_DOMAIN.ORG, 42);
 * ```
 */
export const DCE_DOMAIN = { PERSON: 0, GROUP: 1, ORG: 2 } as const;
