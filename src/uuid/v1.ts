import { v1Bytes } from "./clock";
import { stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/** Version 1 — 60-bit timestamp, clock sequence and node ID. */
export function v1(options: TimeUuidOptions = {}): string {
  return stringify(
    v1Bytes(resolveSource(options.engine), options.now, new Uint8Array(16))
  );
}
