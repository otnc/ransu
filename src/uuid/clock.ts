import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";

// Shared timing state for the time-ordered UUID versions. Two UUIDs made in the
// same millisecond must still be distinct and ordered, which needs state that
// outlives a call. Being wall-clock dependent, it is not reproducible.

/** Milliseconds between 1582-10-15 and the Unix epoch. */
const GREGORIAN_OFFSET = 12219292800000;

/**
 * The largest Unix millisecond timestamp the 60-bit v1/v6 field can hold,
 * counting 100-nanosecond intervals from 1582-10-15.
 */
const MAX_V1_MILLIS = Math.floor((2 ** 60 - 1) / 10000) - GREGORIAN_OFFSET;

/** The largest Unix millisecond timestamp the 48-bit v7 field can hold. */
const MAX_V7_MILLIS = 2 ** 48 - 1;

/**
 * A caller-supplied `now` outside the field's range does not throw on its
 * own — it is just a number — so without this it silently wraps into a
 * plausible-looking UUID carrying the wrong instant. The likely way to hit
 * this by accident is passing epoch nanoseconds or microseconds where
 * milliseconds were expected.
 */
function assertMillis(value: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    raise(
      "INVALID_ARGUMENT",
      `now must be a Unix millisecond timestamp within [0, ${max}], got ${String(value)}.`
    );
  }
}

interface V1State {
  msecs: number;
  nsecs: number;
  clockSeq: number;
  node: Uint8Array;
}

// Keyed on the engine, not module-global: a caller who passes their own engine
// gets their own node ID, clock sequence and counter, so seeded generation is
// reproducible and cannot inherit state from an unrelated caller.
const v1States = new WeakMap<object, V1State>();

function initV1(source: Source): V1State {
  const seed = new Uint8Array(8);
  source.fillBytes(seed);
  const node = seed.slice(0, 6);
  // No MAC address exists in JavaScript, so the node ID is random with the
  // multicast bit set, as RFC 9562 §6.10 requires.
  node[0] |= 0x01;
  return {
    msecs: -Number.POSITIVE_INFINITY,
    nsecs: 0,
    clockSeq: ((seed[6] << 8) | seed[7]) & 0x3fff,
    node,
  };
}

/** Advance the v1 clock and write the 16 bytes of a version-1 UUID. */
export function v1Bytes(
  source: Source,
  now: number | undefined,
  out: Uint8Array
): Uint8Array {
  if (now !== undefined) assertMillis(now, MAX_V1_MILLIS);
  let state = v1States.get(source.engine);
  if (!state) {
    state = initV1(source);
    v1States.set(source.engine, state);
  }

  let msecs = now ?? Date.now();
  let nsecs = state.nsecs + 1;

  if (msecs < state.msecs) {
    // The clock went backwards: bump the sequence so ordering stays unique.
    state.clockSeq = (state.clockSeq + 1) & 0x3fff;
    nsecs = 0;
  } else if (msecs > state.msecs) {
    nsecs = 0;
  }
  if (nsecs >= 10000) {
    msecs += 1;
    nsecs = 0;
  }

  state.msecs = msecs;
  state.nsecs = nsecs;

  const gregorian = msecs + GREGORIAN_OFFSET;
  const timeLow = ((gregorian & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  const timeHighAndMid = ((gregorian / 0x100000000) * 10000) & 0xfffffff;

  out[0] = (timeLow >>> 24) & 0xff;
  out[1] = (timeLow >>> 16) & 0xff;
  out[2] = (timeLow >>> 8) & 0xff;
  out[3] = timeLow & 0xff;
  out[4] = (timeHighAndMid >>> 8) & 0xff;
  out[5] = timeHighAndMid & 0xff;
  out[6] = ((timeHighAndMid >>> 24) & 0x0f) | 0x10;
  out[7] = (timeHighAndMid >>> 16) & 0xff;
  out[8] = ((state.clockSeq >>> 8) & 0x3f) | 0x80;
  out[9] = state.clockSeq & 0xff;
  out.set(state.node, 10);

  return out;
}

/** Read the Unix millisecond timestamp back out of a v1 byte layout. */
export function v1Timestamp(bytes: Uint8Array): number {
  const timeLow =
    (bytes[0] * 0x1000000 + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) >>>
    0;
  const timeMid = (bytes[4] << 8) | bytes[5];
  const timeHigh = ((bytes[6] & 0x0f) << 8) | bytes[7];
  const intervals = (timeHigh * 0x10000 + timeMid) * 0x100000000 + timeLow;
  return Math.floor(intervals / 10000) - GREGORIAN_OFFSET;
}

interface V7State {
  /** The millisecond actually written into the last UUID. */
  emitted: number;
  /** The last caller-supplied `now`, tracked separately from {@link emitted}. */
  requested: number;
  counter: number;
}

const v7States = new WeakMap<object, V7State>();

/**
 * Write the 16 bytes of a version-7 UUID, using the RFC 9562 §6.2 method 3
 * monotonic counter so IDs stay ordered inside one millisecond.
 */
export function v7Bytes(
  source: Source,
  now: number | undefined,
  out: Uint8Array
): Uint8Array {
  if (now !== undefined) assertMillis(now, MAX_V7_MILLIS);
  const wall = now ?? Date.now();
  let state = v7States.get(source.engine);
  if (!state) {
    state = {
      emitted: -Number.POSITIVE_INFINITY,
      requested: Number.NaN,
      counter: 0,
    };
    v7States.set(source.engine, state);
  }

  if (now !== undefined && now !== state.requested) {
    // An explicit `now` is authoritative, even moving backwards: the freeze
    // below is for wall-clock skew, not for overriding the caller.
    state.requested = now;
    state.emitted = now;
    // Start low, leaving room to count up within this millisecond.
    state.counter = bounded(source, 0x800);
  } else if (wall > state.emitted) {
    state.emitted = wall;
    state.counter = bounded(source, 0x800);
  } else {
    state.counter += 1;
    if (state.counter > 0xfff) {
      // Counter exhausted: borrow the next millisecond rather than repeat.
      state.emitted += 1;
      state.counter = bounded(source, 0x800);
    }
  }

  // Fill the whole buffer before overwriting the deterministic bytes below,
  // rather than `fillBytes(out.subarray(8))`: a subarray is a fresh view
  // object on every call, and the few extra random bytes this then discards
  // are far cheaper than that allocation.
  source.fillBytes(out);

  const msecs = state.emitted;
  out[0] = Math.floor(msecs / 0x10000000000) & 0xff;
  out[1] = Math.floor(msecs / 0x100000000) & 0xff;
  out[2] = Math.floor(msecs / 0x1000000) & 0xff;
  out[3] = Math.floor(msecs / 0x10000) & 0xff;
  out[4] = Math.floor(msecs / 0x100) & 0xff;
  out[5] = msecs & 0xff;

  out[6] = 0x70 | ((state.counter >>> 8) & 0x0f);
  out[7] = state.counter & 0xff;
  out[8] = (out[8] & 0x3f) | 0x80;

  return out;
}

/** Read the Unix millisecond timestamp back out of a v7 byte layout. */
export function v7Timestamp(bytes: Uint8Array): number {
  return (
    bytes[0] * 0x10000000000 +
    bytes[1] * 0x100000000 +
    bytes[2] * 0x1000000 +
    bytes[3] * 0x10000 +
    bytes[4] * 0x100 +
    bytes[5]
  );
}
