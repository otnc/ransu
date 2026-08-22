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

/** The only error type ransu throws. `code` is for programs, `message` for people. */
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
