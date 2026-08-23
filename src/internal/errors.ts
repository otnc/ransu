/** Machine-readable cause for every error ransu throws. */
export type RansuErrorCode =
  | "EMPTY_COLLECTION"
  | "INVALID_ARGUMENT"
  | "INVALID_RANGE"
  | "INVALID_WEIGHTS"
  | "NOT_INTEGER"
  | "NO_CRYPTO"
  | "RANGE_TOO_LARGE"
  | "SAMPLE_TOO_LARGE"
  | "STATE_MISMATCH"
  | "UNSEEDABLE_ENGINE";

/**
 * Every error ransu throws, carrying a stable `code` to branch on.
 *
 * The message is for people and may change; the code is the contract.
 *
 * @example
 * ```ts
 * import { RansuError, pick } from "ransu";
 *
 * try {
 *   pick([]);
 * } catch (error) {
 *   if (error instanceof RansuError) {
 *     error.code; // "EMPTY_COLLECTION"
 *   }
 * }
 * ```
 */
export class RansuError extends Error {
  readonly code: RansuErrorCode;

  constructor(code: RansuErrorCode, message: string) {
    super(message);
    this.name = "RansuError";
    this.code = code;
  }
}

export function raise(code: RansuErrorCode, message: string): never {
  throw new RansuError(code, message);
}
