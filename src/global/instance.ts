import { nativeMath } from "../engine/native";
import type { Engine, EngineState } from "../engine/types";
import { xoshiro128pp } from "../engine/xoshiro128pp";
import { raise } from "../internal/errors";
import { createSource, type Source } from "../internal/source";
import type { Seed } from "../seed/sequence";

/**
 * The stream behind every top-level function.
 *
 * One object for the life of the process: `seed()` swaps the engine inside it
 * rather than replacing it, so the call sites in the core functions stay
 * monomorphic. Starts on `Math.random`, because no pure-JavaScript PRNG beats
 * the host's own.
 *
 * Libraries should own a `new Random()` instead, so that an application
 * re-seeding the global cannot change their behaviour.
 */
const source: Source = /* @__PURE__ */ createSource(nativeMath);

export function globalSource(): Source {
  return source;
}

/** The engine every top-level function currently draws from. */
export function engine(): Engine {
  return source.engine;
}

/** Make every top-level function deterministic from here on. */
export function seed(value: Seed): void {
  const active = source.engine;
  if (active.seedable && active.reseed) {
    active.reseed(value);
    return;
  }
  source.adopt(xoshiro128pp(value));
}

/** A JSON-serialisable snapshot of the global stream. */
export function getState(): EngineState {
  const active = source.engine;
  if (!active.getState) {
    raise(
      "INVALID_ARGUMENT",
      `The ${active.algorithm} engine has no state to save. Call seed() first.`
    );
  }
  return active.getState();
}

export function setState(state: EngineState): void {
  const active = source.engine;
  if (!active.setState) {
    raise(
      "INVALID_ARGUMENT",
      `The ${active.algorithm} engine has no state to restore.`
    );
  }
  active.setState(state);
}
