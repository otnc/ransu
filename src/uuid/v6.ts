import { v1Bytes } from "./clock";
import { parse, stringify } from "./codec";
import { resolveSource, type TimeUuidOptions } from "./options";

/** Version 6 — the v1 fields reordered so byte order matches time order. */
export function v6(options: TimeUuidOptions = {}): string {
  const one = v1Bytes(
    resolveSource(options.engine),
    options.now,
    new Uint8Array(16)
  );
  return stringify(v1ToV6Bytes(one));
}

export function v1ToV6Bytes(v: Uint8Array): Uint8Array {
  const out = new Uint8Array(16);
  out[0] = ((v[6] & 0x0f) << 4) | ((v[7] >>> 4) & 0x0f);
  out[1] = ((v[7] & 0x0f) << 4) | ((v[4] & 0xf0) >>> 4);
  out[2] = ((v[4] & 0x0f) << 4) | ((v[5] & 0xf0) >>> 4);
  out[3] = ((v[5] & 0x0f) << 4) | ((v[0] & 0xf0) >>> 4);
  out[4] = ((v[0] & 0x0f) << 4) | ((v[1] & 0xf0) >>> 4);
  out[5] = ((v[1] & 0x0f) << 4) | ((v[2] & 0xf0) >>> 4);
  out[6] = 0x60 | (v[2] & 0x0f);
  out[7] = v[3];
  out.set(v.subarray(8), 8);
  return out;
}

export function v6ToV1Bytes(v: Uint8Array): Uint8Array {
  const out = new Uint8Array(16);
  out[0] = ((v[3] & 0x0f) << 4) | ((v[4] & 0xf0) >>> 4);
  out[1] = ((v[4] & 0x0f) << 4) | ((v[5] & 0xf0) >>> 4);
  out[2] = ((v[5] & 0x0f) << 4) | (v[6] & 0x0f);
  out[3] = v[7];
  out[4] = ((v[1] & 0x0f) << 4) | ((v[2] & 0xf0) >>> 4);
  out[5] = ((v[2] & 0x0f) << 4) | ((v[3] & 0xf0) >>> 4);
  out[6] = 0x10 | ((v[0] & 0xf0) >>> 4);
  out[7] = ((v[0] & 0x0f) << 4) | ((v[1] & 0xf0) >>> 4);
  out.set(v.subarray(8), 8);
  return out;
}

/** Convert a version 1 UUID into the equivalent, sortable version 6. */
export function v1ToV6(value: string): string {
  return stringify(v1ToV6Bytes(parse(value)));
}

/** Convert a version 6 UUID back into the equivalent version 1. */
export function v6ToV1(value: string): string {
  return stringify(v6ToV1Bytes(parse(value)));
}
