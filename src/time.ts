import { globalSource } from "./global/instance";
import { assertFinite, assertOrder } from "./internal/assert";
import { raise } from "./internal/errors";
import { float } from "./numbers/float";

/** Anything that can stand for a moment in time. */
export type TimeInput = Date | number;

function toMillis(value: TimeInput, name: string): number {
  const millis = value instanceof Date ? value.getTime() : value;
  assertFinite(millis, name);
  return millis;
}

/** A `Date` in `[from, to)`. */
export function date(from: TimeInput, to: TimeInput): Date {
  const start = toMillis(from, "from");
  const end = toMillis(to, "to");
  assertOrder(start, end, "date");
  return new Date(start + Math.floor(float(globalSource(), 0, end - start)));
}

/** A `Date` within the last `days` (default 7). */
export function pastDate(days = 7): Date {
  const now = Date.now();
  return date(now - days * 86_400_000, now);
}

/** A `Date` within the next `days` (default 7). */
export function futureDate(days = 7): Date {
  const now = Date.now();
  return date(now, now + days * 86_400_000);
}

/** A duration in milliseconds, in `[min, max)`. */
export function duration(min: number, max: number): number {
  assertFinite(min, "min");
  assertFinite(max, "max");
  assertOrder(min, max, "duration");
  return float(globalSource(), min, max);
}

/**
 * Spread a value by `+/- factor` so that things scheduled together stop
 * arriving together. `jitter(1000, 0.1)` lands in `[900, 1100)`.
 */
export function jitter(base: number, factor = 0.1): number {
  assertFinite(base, "base");
  assertFinite(factor, "factor");
  if (factor < 0)
    raise("INVALID_ARGUMENT", `factor must be >= 0, got ${factor}.`);
  return base * (1 + float(globalSource(), -factor, factor));
}

export interface BackoffOptions {
  /** Delay for attempt 0, in milliseconds. */
  base?: number;
  /** Growth per attempt. */
  factor?: number;
  /** Upper bound on the delay, in milliseconds. */
  max?: number;
  /**
   * How to spread retries out.
   *
   * - `full` picks anywhere in `[0, cap)` — the strongest de-synchroniser, and
   *   the default.
   * - `equal` keeps half the delay fixed and randomises the rest.
   * - `decorrelated` walks up from the previous delay, which recovers faster
   *   after a long outage.
   * - `none` is plain exponential growth, for tests.
   */
  strategy?: "full" | "equal" | "decorrelated" | "none";
  /** The delay actually used last time. Only `decorrelated` reads it. */
  previous?: number;
}

/**
 * How long to wait before retry number `attempt`, counting from 0.
 *
 * Retrying on a fixed schedule makes every client in a fleet retry at the same
 * instant; the jitter strategies exist to break that up.
 */
export function backoff(attempt: number, options: BackoffOptions = {}): number {
  const {
    base = 100,
    factor = 2,
    max = 30_000,
    strategy = "full",
    previous,
  } = options;
  if (!Number.isInteger(attempt) || attempt < 0) {
    raise(
      "INVALID_ARGUMENT",
      `attempt must be a non-negative integer, got ${attempt}.`
    );
  }
  assertFinite(base, "base");
  assertFinite(max, "max");

  if (strategy === "decorrelated") {
    const from = base;
    const to = Math.max(from + 1, (previous ?? base) * 3);
    return Math.min(max, float(globalSource(), from, to));
  }

  const cap = Math.min(max, base * factor ** attempt);
  if (strategy === "none") return cap;
  if (strategy === "equal") return cap / 2 + float(globalSource(), 0, cap / 2);
  return float(globalSource(), 0, cap);
}
