import { assertInteger, assertLength, assertOrder } from "../internal/assert";
import { raise } from "../internal/errors";
import type { Source } from "../internal/source";
import { bounded } from "./integer";

/**
 * `count` distinct integers in `[min, max]`, in random order.
 *
 * Python can write `random.sample(range(10**9), 10)` because `range` is lazy.
 * JavaScript has no such thing, so `sample([...])` over a large range would
 * allocate the whole range first. This uses Floyd's algorithm: `O(count)` work
 * and `O(count)` memory whatever the range is.
 */
export function sampleIntegers(
  src: Source,
  count: number,
  min: number,
  max: number
): number[] {
  assertLength(count, "count");
  assertInteger(min, "min");
  assertInteger(max, "max");
  assertOrder(min, max, "sampleIntegers");

  const span = max - min;
  if (span >= Number.MAX_SAFE_INTEGER) {
    raise(
      "RANGE_TOO_LARGE",
      `sampleIntegers(): the range ${min}..${max} exceeds 2^53 values.`
    );
  }

  const size = span + 1;
  if (count > size) {
    raise(
      "SAMPLE_TOO_LARGE",
      `sampleIntegers(${count}, ${min}, ${max}): only ${size} distinct values exist. ` +
        "Use integers() if repeats are acceptable."
    );
  }
  if (count === 0) return [];

  const chosen = new Set<number>();
  const out: number[] = [];
  for (let j = size - count; j < size; j++) {
    const candidate = bounded(src, j + 1);
    if (chosen.has(candidate)) {
      chosen.add(j);
      out.push(min + j);
    } else {
      chosen.add(candidate);
      out.push(min + candidate);
    }
  }

  // Floyd's picks a uniform subset, not a uniform ordering.
  for (let i = out.length - 1; i > 0; i--) {
    const j = bounded(src, i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
