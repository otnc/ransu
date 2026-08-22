import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";
import {
  blockRanges,
  CONTROL,
  type CodePointRange,
  MAX_CODE_POINT,
  NONCHARACTERS,
  PRIVATE_USE,
  SURROGATES,
  type UnicodeBlock,
} from "./blocks";

export interface UnicodeOptions {
  /** Explicit inclusive ranges. Combined with {@link UnicodeOptions.blocks}. */
  ranges?: readonly CodePointRange[];
  /** One or more names from {@link unicodeRanges}. Defaults to `printable`. */
  blocks?: UnicodeBlock | readonly UnicodeBlock[];
  /** Drop everything above U+FFFF, so each character is one UTF-16 unit. */
  bmpOnly?: boolean;
  /** Include C0/C1 controls. Off by default. */
  allowControl?: boolean;
  /** Include the private use areas. Off by default. */
  allowPrivateUse?: boolean;
  /** Include noncharacters such as U+FFFE. Off by default. */
  allowNoncharacters?: boolean;
  /** Extra rejection filter, applied per draw. */
  filter?: (codePoint: number) => boolean;
}

function normalize(ranges: readonly CodePointRange[]): CodePointRange[] {
  const sorted = ranges
    .filter(([a, b]) => b >= a)
    .map(([a, b]): CodePointRange => [
      Math.max(0, a),
      Math.min(MAX_CODE_POINT, b),
    ])
    .sort((x, y) => x[0] - y[0]);

  const out: CodePointRange[] = [];
  for (const [start, end] of sorted) {
    const last = out[out.length - 1];
    if (last && start <= last[1] + 1) {
      out[out.length - 1] = [last[0], Math.max(last[1], end)];
    } else {
      out.push([start, end]);
    }
  }
  return out;
}

function subtract(
  ranges: CodePointRange[],
  hole: CodePointRange
): CodePointRange[] {
  const out: CodePointRange[] = [];
  for (const [start, end] of ranges) {
    if (hole[1] < start || hole[0] > end) {
      out.push([start, end]);
      continue;
    }
    if (start < hole[0]) out.push([start, hole[0] - 1]);
    if (end > hole[1]) out.push([hole[1] + 1, end]);
  }
  return out;
}

/**
 * A precomputed set of code points to draw from. Build one when the same
 * options are reused; the standalone functions build a fresh set per call.
 */
export class CodePointSet {
  readonly ranges: readonly CodePointRange[];
  /** How many code points the set holds, ignoring any `filter`. */
  readonly size: number;

  readonly #ends: number[];
  readonly #filter?: (codePoint: number) => boolean;

  constructor(options: UnicodeOptions = {}) {
    const named = options.blocks ?? (options.ranges ? [] : "printable");
    const names = typeof named === "string" ? [named] : named;

    const collected: CodePointRange[] = [...(options.ranges ?? [])];
    for (const name of names) collected.push(...blockRanges(name));

    let ranges = normalize(collected);
    // Surrogates are not scalar values, so they are never drawable.
    ranges = subtract(ranges, SURROGATES);
    if (options.bmpOnly) ranges = subtract(ranges, [0x10000, MAX_CODE_POINT]);
    if (!options.allowControl)
      for (const hole of CONTROL) ranges = subtract(ranges, hole);
    if (!options.allowPrivateUse)
      for (const hole of PRIVATE_USE) ranges = subtract(ranges, hole);
    if (!options.allowNoncharacters) {
      for (const hole of NONCHARACTERS) ranges = subtract(ranges, hole);
    }

    if (ranges.length === 0) {
      raise(
        "EMPTY_COLLECTION",
        "The requested Unicode options leave no code points."
      );
    }

    this.ranges = ranges;
    this.#filter = options.filter;
    this.#ends = [];
    let total = 0;
    for (const [start, end] of ranges) {
      total += end - start + 1;
      this.#ends.push(total);
    }
    this.size = total;
  }

  /** The `index`-th code point, counting across all ranges in order. */
  at(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      raise(
        "INVALID_RANGE",
        `Index ${index} is outside the set of ${this.size} code points.`
      );
    }
    let low = 0;
    let high = this.#ends.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (index < this.#ends[mid]) high = mid;
      else low = mid + 1;
    }
    const before = low === 0 ? 0 : this.#ends[low - 1];
    return this.ranges[low][0] + (index - before);
  }

  /** One uniformly chosen code point. */
  pick(src: Source): number {
    if (!this.#filter) return this.at(bounded(src, this.size));
    for (let tries = 0; tries < 1000; tries++) {
      const value = this.at(bounded(src, this.size));
      if (this.#filter(value)) return value;
    }
    return raise(
      "INVALID_ARGUMENT",
      "The Unicode filter rejected 1000 draws in a row."
    );
  }
}
