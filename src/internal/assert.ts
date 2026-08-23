import { raise } from "./errors";

/** Largest range size an integer API can serve exactly. */
export const MAX_SAFE_RANGE = Number.MAX_SAFE_INTEGER;

export function assertFinite(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    raise(
      "INVALID_ARGUMENT",
      `${name} must be a finite number, got ${String(value)}.`
    );
  }
}

export function assertInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    raise(
      "NOT_INTEGER",
      `${name} must be a safe integer, got ${String(value)}.`
    );
  }
}

export function assertOrder(min: number, max: number, fn: string): void {
  if (min > max) {
    raise(
      "INVALID_RANGE",
      `${fn}: min (${min}) must be <= max (${max}). ransu never swaps them for you.`
    );
  }
}

export function assertLength(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    raise(
      "INVALID_ARGUMENT",
      `${name} must be a non-negative safe integer, got ${String(value)}.`
    );
  }
}

export function assertProbability(p: number, name: string): void {
  assertFinite(p, name);
  if (p < 0 || p > 1) {
    raise("INVALID_ARGUMENT", `${name} must be within [0, 1], got ${p}.`);
  }
}

export function assertNotEmpty(length: number, fn: string): void {
  if (length === 0) {
    raise(
      "EMPTY_COLLECTION",
      `${fn}: the collection is empty. Use try${fn[0].toUpperCase()}${fn.slice(1)}() if an empty input is expected.`
    );
  }
}
