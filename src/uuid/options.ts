import type { EngineLike } from "../engine/types";
import type { Source } from "../internal/source";
import { secureSourceFor } from "../internal/source";

/** Options common to every UUID version. */
export interface UuidOptions {
  /**
   * Draw from this engine instead of the platform CSPRNG. Identifiers default
   * to the CSPRNG; pass an engine only to make a test deterministic.
   */
  engine?: EngineLike;
}

/** Options for the time-based versions. */
export interface TimeUuidOptions extends UuidOptions {
  /** Fix the timestamp, in milliseconds since the Unix epoch. For tests. */
  now?: number;
}

export function resolveSource(engine?: EngineLike): Source {
  return secureSourceFor(engine);
}

/** 16 random bytes from the requested source. */
export function randomBytes16(source: Source): Uint8Array {
  const bytes = new Uint8Array(16);
  source.fillBytes(bytes);
  return bytes;
}
