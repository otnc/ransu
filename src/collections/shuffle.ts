import { assertLength } from "../internal/assert";
import type { Source } from "../internal/source";
import { bounded } from "../numbers/integer";
import { asIndexable, type Collection } from "./pick";

/** Fisher–Yates, in place. The only shuffle here that mutates. */
export function shuffleInPlace<T>(src: Source, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = bounded(src, i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/** A shuffled copy. The input is untouched. */
export function shuffle<T>(src: Source, items: Collection<T>): T[] {
  const list = asIndexable(items);
  const out = new Array<T>(list.length);
  for (let i = 0; i < list.length; i++) out[i] = list[i];
  return shuffleInPlace(src, out);
}

/** A uniformly random permutation of `0 .. n-1`. */
export function permutation(src: Source, n: number): number[] {
  assertLength(n, "n");
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = i;
  return shuffleInPlace(src, out);
}

/** A shuffled copy of a string. */
export function shuffleString(src: Source, value: string): string {
  return shuffle(src, value).join("");
}
