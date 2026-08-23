import { AliasTable } from "../collections/weighted";
import * as distributions from "../distribution/index";
import { engines } from "../engine/index";
import * as fn from "../global/index";
import { globalSource } from "../global/instance";
import * as color from "../color";
import * as dice from "../dice";
import * as geometry from "../geometry";
import * as hash from "../hash";
import { RansuError } from "../internal/errors";
import { nanoid } from "../nanoid";
import { Random } from "../random";
import { SeedSequence } from "../seed/sequence";
import { alphabets } from "../strings/alphabet";
import { graphemes } from "../strings/random-string";
import * as time from "../time";
import { otp, password, token } from "../token";
import { ulid } from "../ulid";
import { unicodeRanges } from "../unicode/blocks";
import { CodePointSet } from "../unicode/code-point-set";
import { uuid } from "../uuid/index";

/**
 * The default export.
 *
 * Every name here is the same name the module exports on its own, so
 * `ransu.integer(1, 6)`, `integer(1, 6)` and `new Random(42).integer(1, 6)` are
 * one API written three ways rather than three vocabularies.
 */
const api = {
  ...fn,
  ...time,
  ...hash,
  ...dice,
  ...geometry,
  ...color,

  // identifiers and text
  uuid,
  nanoid,
  ulid,
  token,
  otp,
  password,
  alphabets,
  graphemes,
  unicodeRanges,

  // reusable sampler factories, when one shot is not enough
  distributions,
  engines,

  // constructors
  Random,
  SeedSequence,
  RansuError,
  AliasTable,
  CodePointSet,

  /** An independent copy of the global stream, positioned where it is now. */
  clone(): Random {
    const cloned = globalSource().engine.clone?.();
    if (!cloned) {
      throw new RansuError(
        "INVALID_ARGUMENT",
        "The global engine cannot be cloned. Call seed() to switch to one that can."
      );
    }
    return new Random(cloned);
  },

  /** `n` independent generators derived from the global stream. */
  split(n: number): Random[] {
    const children = globalSource().engine.split?.(n);
    if (!children) {
      throw new RansuError(
        "INVALID_ARGUMENT",
        "The global engine cannot be split. Call seed() to switch to one that can."
      );
    }
    return children.map((child) => new Random(child));
  },
};

/** The shape of the default export, derived from the object itself. */
export interface RansuApi extends Omit<typeof api, "default"> {
  /** Shorthand for {@link RansuApi.random}. */
  (): number;
  /** Present so `require('ransu').default` also works. */
  default: RansuApi;
}

/**
 * Every function in one object, and callable itself as a shorthand for
 * {@link random}.
 *
 * The default export. Each property is the very same function object as the
 * matching named export, not a wrapper around it.
 *
 * @example
 * ```ts
 * import ransu from "ransu";
 *
 * ransu();            // 0.7401962...  same as ransu.random()
 * ransu.integer(1, 6);
 * ransu.pick(["a", "b", "c"]);
 * ransu.uuid.v7();
 * ransu.engines.pcg32(42);
 *
 * // Seeding here changes every top-level function.
 * ransu.seed(42);
 * ```
 */
export const ransu: RansuApi = /* @__PURE__ */ (() => {
  const callable = (): number => fn.random();
  const target = Object.assign(callable, api) as unknown as RansuApi;
  target.default = target;
  return target;
})();

export { engines } from "../engine/index";
