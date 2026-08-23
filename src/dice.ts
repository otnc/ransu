import { globalSource } from "./global/instance";
import { assertLength } from "./internal/assert";
import { raise } from "./internal/errors";
import type { Source } from "./internal/source";
import { integer } from "./numbers/integer";

/**
 * Dice, in the notation people already write them in.
 *
 * `3d6+2` is three six-sided dice plus two. The count and the modifier are
 * optional, so `d20` and `2d10` work as well.
 */
const NOTATION = /^\s*(\d*)\s*[dD]\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/;

export interface Roll {
  /** The sum, including the modifier. */
  total: number;
  /** What each die showed, before the modifier. */
  dice: number[];
  /** The flat adjustment, zero when the notation had none. */
  modifier: number;
}

function parse(notation: string): {
  count: number;
  sides: number;
  modifier: number;
} {
  const match = NOTATION.exec(notation);
  if (!match) {
    raise(
      "INVALID_ARGUMENT",
      `dice(): "${notation}" is not dice notation. Write it like "3d6", "d20" or "2d10+3".`
    );
  }
  const count = match[1] === "" ? 1 : Number(match[1]);
  const sides = Number(match[2]);
  const modifier =
    match[3] === undefined ? 0 : Number(`${match[3]}${match[4]}`);

  assertLength(count, "the dice count");
  if (count === 0) {
    raise("INVALID_ARGUMENT", `dice(): "${notation}" rolls no dice.`);
  }
  if (sides < 2) {
    raise(
      "INVALID_ARGUMENT",
      `dice(): a die needs at least 2 sides, got ${sides}.`
    );
  }
  return { count, sides, modifier };
}

/** Roll `notation` and return the total. */
function total(notation: string): number {
  return diceWith(globalSource(), notation).total;
}

/** Roll `notation` and return every die alongside the total. */
function detail(notation: string): Roll {
  return diceWith(globalSource(), notation);
}

/** `dice()` totals; `dice.detail()` reports what each die showed. */
export interface DiceApi {
  (notation: string): number;
  detail: typeof detail;
}

export const dice: DiceApi = /* @__PURE__ */ Object.assign(total, { detail });

/** The engine-taking form, for `Random` and the secure entry. */
export function diceWith(src: Source, notation: string): Roll {
  const { count, sides, modifier } = parse(notation);
  const rolled: number[] = new Array<number>(count);
  let total = modifier;
  for (let i = 0; i < count; i++) {
    const value = integer(src, 1, sides);
    rolled[i] = value;
    total += value;
  }
  return { total, dice: rolled, modifier };
}

const die =
  (sides: number) =>
  (count = 1): number => {
    const src = globalSource();
    let total = 0;
    for (let i = 0; i < count; i++) total += integer(src, 1, sides);
    return total;
  };

/** A four-sided die, or `count` of them summed. */
export const d4: (count?: number) => number = die(4);
export const d6: (count?: number) => number = die(6);
export const d8: (count?: number) => number = die(8);
export const d10: (count?: number) => number = die(10);
export const d12: (count?: number) => number = die(12);
export const d20: (count?: number) => number = die(20);
/** A percentile die: `1` to `100`. */
export const d100: (count?: number) => number = die(100);

/** Heads or tails, for when a boolean would read worse at the call site. */
export function coin(): "heads" | "tails" {
  return globalSource().u32() >>> 31 === 1 ? "heads" : "tails";
}
