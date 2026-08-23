import type { Seed } from "../seed/sequence";

/** Serialisable engine state. Plain JSON so it can cross a worker or a database. */
export interface EngineState {
  readonly algorithm: string;
  readonly version: number;
  readonly data: readonly number[];
}

/**
 * A generator. Only `nextUint32` is required; the optional members are detected
 * once when the engine is adopted, and used as a fast path when present.
 */
export interface Engine {
  /** Identifies the algorithm in {@link EngineState}. */
  readonly algorithm: string;
  /** Whether the engine can be re-seeded. `Math.random` and the CSPRNG cannot. */
  readonly seedable: boolean;

  /** A uniform integer in `[0, 2^32)`. */
  nextUint32(): number;

  nextUint64?(): bigint;
  /** A uniform double in `[0, 1)` with 53 bits of precision. */
  nextFloat64?(): number;
  fillUint32?(out: Uint32Array): void;
  fillBytes?(out: Uint8Array): void;

  clone?(): Engine;
  getState?(): EngineState;
  setState?(state: EngineState): void;
  /** Restart from new seed material, in place. Absent on unseedable engines. */
  reseed?(seed: Seed): void;
  /** Advance as far as `2^(period/2)` draws, for non-overlapping streams. */
  jump?(): void;
  /** Derive `n` independent generators. */
  split?(n: number): Engine[];
}

/** An engine, or a bare `() => number` in `[0, 1)` such as `Math.random`. */
export type EngineLike = Engine | (() => number);

/** Constructs an engine from seed material, or from fresh entropy when omitted. */
export type EngineFactory = (seed?: Seed) => Engine;
